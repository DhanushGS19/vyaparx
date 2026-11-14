import express from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, run, transaction } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise, logAudit } from '../../middleware/rbac.js';
import { reserveStockForOrder, releaseStockForOrder } from '../../services/inventoryEngine.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

// List orders with filters & search
router.get('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { status, search, startDate, endDate } = req.query;

    let query = `
      SELECT 
        o.*,
        r.shop_name, r.owner_name, r.phone as retailer_phone, r.city as retailer_city, r.gstin as retailer_gstin,
        COUNT(oi.id) as item_count
      FROM orders o
      JOIN retailer_profiles r ON o.retailer_id = r.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.enterprise_id = ?
    `;
    const params = [enterpriseId];

    if (status && status !== 'ALL') {
      query += ` AND o.status = ?`;
      params.push(status);
    }
    if (search && search.trim()) {
      query += ` AND (o.order_number LIKE ? OR r.shop_name LIKE ? OR r.owner_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (startDate && endDate) {
      query += ` AND date(o.created_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;
    const orders = queryAll(query, params);

    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Get single order details with items, dispatches, invoice, timeline
router.get('/:id', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const orderId = req.params.id;

    const order = queryOne(`
      SELECT 
        o.*,
        r.shop_name, r.owner_name, r.phone as retailer_phone, r.email as retailer_email,
        r.address as retailer_address, r.city as retailer_city, r.state as retailer_state,
        r.state_code as retailer_state_code, r.pincode as retailer_pincode, r.gstin as retailer_gstin
      FROM orders o
      JOIN retailer_profiles r ON o.retailer_id = r.id
      WHERE o.id = ? AND o.enterprise_id = ?
    `, [orderId, enterpriseId]);

    if (!order) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });

    // Order items
    const items = queryAll(`
      SELECT oi.*, p.name as product_name, p.sku, p.uom, p.image_url, p.stock_available, p.stock_reserved
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    // Dispatch records
    const dispatches = queryAll(`
      SELECT dr.*, 
        (SELECT COUNT(*) FROM dispatch_items di WHERE di.dispatch_id = dr.id) as item_count
      FROM dispatch_records dr
      WHERE dr.order_id = ?
      ORDER BY dr.dispatch_date DESC
    `, [orderId]);

    // Invoice
    const invoice = queryOne(`SELECT * FROM invoices WHERE order_id = ?`, [orderId]);

    // Construct activity timeline
    const timeline = [
      { event: 'Order Placed by Retailer', timestamp: order.created_at, status: 'DONE' }
    ];

    if (order.status !== 'NEW') {
      timeline.push({ event: `Order Accepted & Stock Reserved`, timestamp: order.updated_at, status: 'DONE' });
    }
    if (order.status === 'PROCESSING' || order.status === 'PARTIALLY_DISPATCHED' || order.status === 'DISPATCHED' || order.status === 'DELIVERED') {
      timeline.push({ event: 'Order Packed & Processing for Dispatch', timestamp: order.updated_at, status: 'DONE' });
    }
    if (dispatches.length > 0) {
      dispatches.forEach(d => {
        timeline.push({
          event: `Dispatched via ${d.transporter_name} (${d.dispatch_number})`,
          timestamp: d.dispatch_date,
          status: 'DONE',
          details: `Tracking: ${d.tracking_number || 'N/A'}`
        });
      });
    }
    if (order.status === 'DELIVERED') {
      timeline.push({ event: 'Order Successfully Delivered', timestamp: order.updated_at, status: 'DONE' });
    }
    if (order.status === 'CANCELLED') {
      timeline.push({ event: `Order Cancelled/Rejected: ${order.rejection_reason || 'By supplier'}`, timestamp: order.updated_at, status: 'CANCELLED' });
    }

    return res.json({
      success: true,
      order,
      items,
      dispatches,
      invoice,
      timeline,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Accept order (reserves inventory and automatically generates invoice)
router.post('/:id/accept', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const orderId = req.params.id;

    const order = queryOne(`SELECT * FROM orders WHERE id = ? AND enterprise_id = ?`, [orderId, enterpriseId]);
    if (!order) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });

    if (order.status !== 'NEW') {
      return res.status(400).json({ error: 'Invalid Transition', message: `Order is already in "${order.status}" status.` });
    }

    // Reserve stock with oversell prevention
    reserveStockForOrder(orderId, enterpriseId);

    transaction(() => {
      // Update order status
      run(`UPDATE orders SET status = 'ACCEPTED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [orderId]);

      // Generate invoice if not already generated
      const existingInv = queryOne(`SELECT id FROM invoices WHERE order_id = ?`, [orderId]);
      if (!existingInv) {
        const countRow = queryOne(`SELECT COUNT(*) as count FROM invoices WHERE enterprise_id = ?`, [enterpriseId]);
        const seq = (countRow.count || 0) + 1;
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
        const invoiceId = crypto.randomUUID();

        // 15 days default credit period
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 15);

        run(`
          INSERT INTO invoices (
            id, invoice_number, order_id, enterprise_id, retailer_id,
            subtotal, cgst_amount, sgst_amount, igst_amount, total_amount,
            paid_amount, balance_amount, due_date, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, 'ISSUED')
        `, [
          invoiceId,
          invoiceNumber,
          orderId,
          enterpriseId,
          order.retailer_id,
          order.subtotal,
          order.cgst_amount,
          order.sgst_amount,
          order.igst_amount,
          order.total_amount,
          order.total_amount,
          dueDate.toISOString()
        ]);

        // Update retailer's current_credit
        run(`
          UPDATE retailer_profiles 
          SET current_credit = current_credit + ?
          WHERE id = ?
        `, [order.total_amount, order.retailer_id]);
      }

      // Notify retailer
      const retailer = queryOne(`SELECT user_id, shop_name FROM retailer_profiles WHERE id = ?`, [order.retailer_id]);
      if (retailer) {
        run(`
          INSERT INTO notifications (
            id, user_id, title, message, type, link, is_read, metadata_json
          ) VALUES (?, ?, ?, ?, 'ORDER', ?, 0, ?)
        `, [
          crypto.randomUUID(),
          retailer.user_id,
          `Order #${order.order_number} Accepted!`,
          `Your wholesale order of ₹${order.total_amount.toLocaleString('en-IN')} has been accepted by supplier. Invoice generated.`,
          `/retailer/orders?id=${order.id}`,
          JSON.stringify({ orderId, status: 'ACCEPTED' })
        ]);
      }

      logAudit(req.user.id, 'ACCEPT_ORDER', 'ORDER', orderId, { orderNumber: order.order_number }, enterpriseId);
    });

    return res.json({ success: true, message: 'Order accepted, stock reserved, and invoice generated.' });
  } catch (err) {
    return res.status(400).json({ error: 'Order Acceptance Failed', message: err.message });
  }
});

// Reject order
router.post('/:id/reject', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const orderId = req.params.id;
    const { reason } = req.body;

    const order = queryOne(`SELECT * FROM orders WHERE id = ? AND enterprise_id = ?`, [orderId, enterpriseId]);
    if (!order) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });

    if (order.status === 'CANCELLED' || order.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Invalid Transition', message: `Cannot reject an order in "${order.status}" status.` });
    }

    transaction(() => {
      // Release any reserved stock
      releaseStockForOrder(orderId, enterpriseId);

      run(`
        UPDATE orders 
        SET status = 'CANCELLED', rejection_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [reason || 'Supplier rejected order due to capacity/stock constraints', orderId]);

      // Cancel invoice if exists
      run(`UPDATE invoices SET status = 'CANCELLED' WHERE order_id = ?`, [orderId]);

      // Notify retailer
      const retailer = queryOne(`SELECT user_id FROM retailer_profiles WHERE id = ?`, [order.retailer_id]);
      if (retailer) {
        run(`
          INSERT INTO notifications (
            id, user_id, title, message, type, link, is_read, metadata_json
          ) VALUES (?, ?, ?, ?, 'ORDER', ?, 0, ?)
        `, [
          crypto.randomUUID(),
          retailer.user_id,
          `Order #${order.order_number} Rejected`,
          `Reason: ${reason || 'Capacity constraints'}. Any pending payment hold has been removed.`,
          `/retailer/orders?id=${order.id}`,
          JSON.stringify({ orderId, reason })
        ]);
      }

      logAudit(req.user.id, 'REJECT_ORDER', 'ORDER', orderId, { reason }, enterpriseId);
    });

    return res.json({ success: true, message: 'Order rejected and stock released.' });
  } catch (err) {
    return res.status(400).json({ error: 'Rejection Failed', message: err.message });
  }
});

// Process order (Ready for dispatch)
router.post('/:id/process', (req, res) => {
  try {
    const order = queryOne(`SELECT * FROM orders WHERE id = ? AND enterprise_id = ?`, [req.params.id, req.enterpriseId]);
    if (!order) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });

    run(`UPDATE orders SET status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, message: 'Order marked as processing.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Mark order delivered
router.post('/:id/deliver', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const orderId = req.params.id;

    transaction(() => {
      run(`UPDATE orders SET status = 'DELIVERED', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND enterprise_id = ?`, [orderId, enterpriseId]);
      run(`UPDATE dispatch_records SET status = 'DELIVERED' WHERE order_id = ?`, [orderId]);

      const order = queryOne(`SELECT * FROM orders WHERE id = ?`, [orderId]);
      const retailer = queryOne(`SELECT user_id FROM retailer_profiles WHERE id = ?`, [order.retailer_id]);
      if (retailer) {
        run(`
          INSERT INTO notifications (
            id, user_id, title, message, type, link, is_read, metadata_json
          ) VALUES (?, ?, ?, ?, 'DISPATCH', ?, 0, ?)
        `, [
          crypto.randomUUID(),
          retailer.user_id,
          `Order #${order.order_number} Delivered`,
          `All products have been marked as successfully delivered.`,
          `/retailer/orders?id=${order.id}`,
          JSON.stringify({ orderId })
        ]);
      }
    });

    return res.json({ success: true, message: 'Order and associated dispatches marked as Delivered.' });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

