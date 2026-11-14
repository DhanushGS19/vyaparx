/**
 * VyaparX Inventory Engine
 * Manages stock reservations, dispatches, partial deliveries, adjustments, and oversell prevention.
 */

import { queryAll, queryOne, run, transaction } from '../db/connection.js';
import crypto from 'node:crypto';

export const reserveStockForOrder = (orderId, enterpriseId) => {
  return transaction(() => {
    // 1. Get order items
    const items = queryAll(`
      SELECT oi.id, oi.product_id, oi.quantity, p.name, p.stock_available, p.stock_reserved
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ? AND p.enterprise_id = ?
    `, [orderId, enterpriseId]);

    if (!items || items.length === 0) {
      throw new Error('No items found for this order.');
    }

    // 2. Validate sufficient stock for all items (prevent overselling)
    for (const item of items) {
      if (item.stock_available < item.quantity) {
        throw new Error(
          `Insufficient stock for product "${item.name}". Available: ${item.stock_available}, Requested: ${item.quantity}`
        );
      }
    }

    // 3. Move from stock_available to stock_reserved and log transaction
    for (const item of items) {
      const prevStock = item.stock_available;
      const newStock = prevStock - item.quantity;

      run(`
        UPDATE products 
        SET stock_available = stock_available - ?,
            stock_reserved = stock_reserved + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [item.quantity, item.quantity, item.product_id]);

      // Log inventory transaction
      run(`
        INSERT INTO inventory_transactions (
          id, enterprise_id, product_id, transaction_type, quantity, previous_stock, new_stock, reference_id, reference_type, notes
        ) VALUES (?, ?, ?, 'ORDER_RESERVED', ?, ?, ?, ?, 'ORDER', ?)
      `, [
        crypto.randomUUID(),
        enterpriseId,
        item.product_id,
        item.quantity,
        prevStock,
        newStock,
        orderId,
        `Stock reserved upon accepting order ${orderId}`
      ]);
    }

    return { success: true, reservedItemCount: items.length };
  });
};

export const releaseStockForOrder = (orderId, enterpriseId) => {
  return transaction(() => {
    // Get items where dispatched_quantity < quantity (only release un-dispatched reserved stock)
    const items = queryAll(`
      SELECT oi.id, oi.product_id, (oi.quantity - oi.dispatched_quantity) AS remaining_reserved, p.stock_available, p.stock_reserved
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ? AND p.enterprise_id = ?
    `, [orderId, enterpriseId]);

    for (const item of items) {
      const releaseQty = Math.max(0, item.remaining_reserved);
      if (releaseQty > 0) {
        const prevStock = item.stock_available;
        const newStock = prevStock + releaseQty;

        run(`
          UPDATE products
          SET stock_available = stock_available + ?,
              stock_reserved = MAX(0, stock_reserved - ?),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [releaseQty, releaseQty, item.product_id]);

        run(`
          INSERT INTO inventory_transactions (
            id, enterprise_id, product_id, transaction_type, quantity, previous_stock, new_stock, reference_id, reference_type, notes
          ) VALUES (?, ?, ?, 'ORDER_RELEASED', ?, ?, ?, ?, 'ORDER', ?)
        `, [
          crypto.randomUUID(),
          enterpriseId,
          item.product_id,
          releaseQty,
          prevStock,
          newStock,
          orderId,
          `Stock released due to cancellation of order ${orderId}`
        ]);
      }
    }

    return { success: true };
  });
};

export const recordDispatch = ({
  enterpriseId,
  retailerId,
  orderId,
  transporterName,
  trackingNumber,
  vehicleNumber,
  driverPhone,
  waybillNumber,
  expectedDeliveryDate,
  notes,
  itemsToDispatch, // array of { orderItemId, productId, quantity }
}) => {
  return transaction(() => {
    // Check order status
    const order = queryOne(`SELECT * FROM orders WHERE id = ? AND enterprise_id = ?`, [orderId, enterpriseId]);
    if (!order) {
      throw new Error('Order not found.');
    }
    if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
      throw new Error(`Cannot dispatch a ${order.status.toLowerCase()} order.`);
    }

    // Verify each item's requested dispatch quantity does not exceed remaining quantity
    const orderItems = queryAll(`
      SELECT oi.*, p.name as product_name, p.stock_reserved, p.stock_available
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    const itemsMap = new Map();
    orderItems.forEach(i => itemsMap.set(i.id, i));

    let totalDispatchedThisBatch = 0;

    for (const item of itemsToDispatch) {
      const orderItem = itemsMap.get(item.orderItemId);
      if (!orderItem) {
        throw new Error(`Invalid order item ID: ${item.orderItemId}`);
      }
      const alreadyDispatched = orderItem.dispatched_quantity || 0;
      const remainingToDispatch = orderItem.quantity - alreadyDispatched;

      if (item.quantity <= 0) {
        throw new Error(`Dispatch quantity must be greater than zero for ${orderItem.product_name}`);
      }
      if (item.quantity > remainingToDispatch) {
        throw new Error(
          `Dispatched quantity (${item.quantity}) exceeds remaining order quantity (${remainingToDispatch}) for ${orderItem.product_name}. Over-dispatch is strictly prevented.`
        );
      }
      totalDispatchedThisBatch += item.quantity;
    }

    if (totalDispatchedThisBatch === 0) {
      throw new Error('Dispatch must contain at least one item.');
    }

    // Create Dispatch record
    const dispatchId = crypto.randomUUID();
    const countRow = queryOne(`SELECT COUNT(*) as count FROM dispatch_records WHERE enterprise_id = ?`, [enterpriseId]);
    const seq = (countRow.count || 0) + 1;
    const dispatchNumber = `DSP-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;

    run(`
      INSERT INTO dispatch_records (
        id, dispatch_number, order_id, enterprise_id, retailer_id, transporter_name, tracking_number,
        vehicle_number, driver_phone, waybill_number, expected_delivery_date, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_TRANSIT', ?)
    `, [
      dispatchId,
      dispatchNumber,
      orderId,
      enterpriseId,
      retailerId,
      transporterName,
      trackingNumber || `TRK-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      vehicleNumber,
      driverPhone,
      waybillNumber || `LR-${Math.floor(100000 + Math.random() * 900000)}`,
      expectedDeliveryDate || null,
      notes || null
    ]);

    // Insert dispatch items, update order items, and deduct reserved inventory
    for (const item of itemsToDispatch) {
      const orderItem = itemsMap.get(item.orderItemId);

      run(`
        INSERT INTO dispatch_items (id, dispatch_id, order_item_id, product_id, quantity)
        VALUES (?, ?, ?, ?, ?)
      `, [crypto.randomUUID(), dispatchId, item.orderItemId, item.productId, item.quantity]);

      // Update dispatched_quantity on order_items
      run(`
        UPDATE order_items 
        SET dispatched_quantity = dispatched_quantity + ?
        WHERE id = ?
      `, [item.quantity, item.orderItemId]);

      // Move stock: deduct from stock_reserved, add to stock_dispatched
      run(`
        UPDATE products
        SET stock_reserved = MAX(0, stock_reserved - ?),
            stock_dispatched = stock_dispatched + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [item.quantity, item.quantity, item.productId]);

      // Record transaction
      run(`
        INSERT INTO inventory_transactions (
          id, enterprise_id, product_id, transaction_type, quantity, previous_stock, new_stock, reference_id, reference_type, notes
        ) VALUES (?, ?, ?, 'DISPATCH_OUTWARD', ?, ?, ?, ?, 'DISPATCH', ?)
      `, [
        crypto.randomUUID(),
        enterpriseId,
        item.productId,
        item.quantity,
        orderItem.stock_reserved,
        Math.max(0, orderItem.stock_reserved - item.quantity),
        dispatchId,
        `Dispatched under ${dispatchNumber} (Order ${order.order_number})`
      ]);
    }

    // Check if order is fully dispatched or partially dispatched
    const updatedOrderItems = queryAll(`SELECT quantity, dispatched_quantity FROM order_items WHERE order_id = ?`, [orderId]);
    const allDispatched = updatedOrderItems.every(i => i.dispatched_quantity >= i.quantity);
    const anyDispatched = updatedOrderItems.some(i => i.dispatched_quantity > 0);

    const newOrderStatus = allDispatched ? 'DISPATCHED' : (anyDispatched ? 'PARTIALLY_DISPATCHED' : order.status);

    run(`UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newOrderStatus, orderId]);

    return {
      success: true,
      dispatchId,
      dispatchNumber,
      orderStatus: newOrderStatus,
      isFullyDispatched: allDispatched,
    };
  });
};

export const adjustStock = ({
  enterpriseId,
  productId,
  warehouseId,
  type, // 'DAMAGE', 'CORRECTION', 'REPLENISHMENT'
  quantityChange, // e.g. -5, +50
  notes,
  userId,
}) => {
  return transaction(() => {
    const prod = queryOne(`SELECT * FROM products WHERE id = ? AND enterprise_id = ?`, [productId, enterpriseId]);
    if (!prod) throw new Error('Product not found.');

    const qty = Number(quantityChange);
    if (isNaN(qty) || qty === 0) throw new Error('Valid non-zero quantity change required.');

    const prevStock = prod.stock_available;
    const newStock = prevStock + qty;

    if (newStock < 0) {
      throw new Error(`Adjustment would result in negative available stock (${newStock}). Current available: ${prevStock}`);
    }

    let txType = 'ADJUSTMENT_CORRECTION';
    if (type === 'DAMAGE') {
      txType = 'ADJUSTMENT_DAMAGE';
      run(`
        UPDATE products
        SET stock_available = stock_available + ?,
            stock_damaged = stock_damaged + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [qty, Math.abs(qty), productId]);
    } else {
      run(`
        UPDATE products
        SET stock_available = stock_available + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [qty, productId]);
    }

    // Log transaction
    run(`
      INSERT INTO inventory_transactions (
        id, enterprise_id, product_id, warehouse_id, transaction_type, quantity, previous_stock, new_stock, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      crypto.randomUUID(),
      enterpriseId,
      productId,
      warehouseId || null,
      txType,
      qty,
      prevStock,
      newStock,
      notes || `Stock adjustment (${type}) by user`
    ]);

    return { success: true, previousStock: prevStock, newStock };
  });
};

export default {
  reserveStockForOrder,
  releaseStockForOrder,
  recordDispatch,
  adjustStock,
};

