import express from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, run, transaction } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer, logAudit } from '../../middleware/rbac.js';
import { calculateGST } from '../../services/gstEngine.js';
import { parseInnerUnits } from './marketplace.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

// Validate and calculate totals for cart items
router.post('/validate', (req, res) => {
  try {
    const retailer = req.retailer;
    const { items = [] } = req.body; // array of { productId, quantity }

    if (!items.length) {
      return res.json({ success: true, suppliers: [], summary: { subtotal: 0, gst: 0, total: 0 } });
    }

    // Group items by supplier
    const supplierGroups = new Map();

    for (const cartItem of items) {
      const prod = queryOne(`
        SELECT p.*, e.id as supplier_id, e.company_name as supplier_name, e.city as supplier_city,
               e.state as supplier_state, e.state_code as supplier_state_code
        FROM products p
        JOIN enterprise_profiles e ON p.enterprise_id = e.id
        WHERE p.id = ? AND p.status = 'ACTIVE' AND p.is_visible = 1
      `, [cartItem.productId]);

      if (!prod) continue;

      const qty = Math.max(prod.moq || 1, Number(cartItem.quantity) || 1);

      // Check bulk pricing tiers
      let unitPrice = prod.wholesale_price;
      if (prod.bulk_pricing_json) {
        try {
          const tiers = JSON.parse(prod.bulk_pricing_json);
          // Find highest applicable tier
          const applicableTier = tiers
            .filter(t => qty >= t.min_qty)
            .sort((a, b) => b.min_qty - a.min_qty)[0];
          if (applicableTier && applicableTier.price < unitPrice) {
            unitPrice = applicableTier.price;
          }
        } catch (e) {}
      }

      const gst = calculateGST({
        basePrice: unitPrice,
        gstRate: prod.gst_rate,
        supplierStateCode: prod.supplier_state_code,
        retailerStateCode: retailer.state_code,
        quantity: qty,
      });

      if (!supplierGroups.has(prod.supplier_id)) {
        supplierGroups.set(prod.supplier_id, {
          supplierId: prod.supplier_id,
          supplierName: prod.supplier_name,
          supplierCity: prod.supplier_city,
          supplierState: prod.supplier_state,
          supplierStateCode: prod.supplier_state_code,
          items: [],
          subtotal: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalGst: 0,
          totalAmount: 0,
        });
      }

      const group = supplierGroups.get(prod.supplier_id);
      
      const isItcEligible = retailer.gst_type === 'REGULAR';
      const effectiveCostPerUnit = isItcEligible ? unitPrice : (gst.totalAmount / qty);
      const suggestedRetailPrice = prod.suggested_retail_price || Math.round(effectiveCostPerUnit * 1.25);
      const unitProfit = Math.max(0, Math.round((suggestedRetailPrice - effectiveCostPerUnit) * 100) / 100);
      const itemTotalProfit = Math.round((unitProfit * qty) * 100) / 100;
      const itemTotalRevenue = Math.round((suggestedRetailPrice * qty) * 100) / 100;
      const profitMarginPercent = suggestedRetailPrice > 0 
        ? Math.round(((unitProfit / suggestedRetailPrice) * 100) * 10) / 10 
        : 0;

      const innerUnits = parseInnerUnits(prod.uom, prod.name);
      const unitsPerWholesalePack = innerUnits.count;
      const innerUnitLabel = innerUnits.label;
      const singleProductSuggestedPrice = Number((suggestedRetailPrice / unitsPerWholesalePack).toFixed(2));
      const singleProductWholesaleCost = Number((effectiveCostPerUnit / unitsPerWholesalePack).toFixed(2));
      const singleProductProfit = Math.max(0, Number((singleProductSuggestedPrice - singleProductWholesaleCost).toFixed(2)));
      const singleProductMarginPct = singleProductSuggestedPrice > 0
        ? Math.round(((singleProductProfit / singleProductSuggestedPrice) * 100) * 10) / 10
        : 0;
      const totalSinglePieces = qty * unitsPerWholesalePack;

      group.items.push({
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        imageUrl: prod.image_url,
        uom: prod.uom,
        quantity: qty,
        moq: prod.moq,
        unitPrice,
        stockAvailable: prod.stock_available,
        gstRate: prod.gst_rate,
        itemSubtotal: gst.subtotal,
        itemGst: gst.totalGst,
        itemTotal: gst.totalAmount,
        // Retailer Resale & Profit Breakdown
        isItcEligible,
        effectiveCostPerUnit,
        suggestedRetailPrice,
        unitProfit,
        itemTotalProfit,
        itemTotalRevenue,
        profitMarginPercent,
        // Single piece economics
        unitsPerWholesalePack,
        innerUnitLabel,
        singleProductSuggestedPrice,
        singleProductWholesaleCost,
        singleProductProfit,
        singleProductMarginPct,
        totalSinglePieces,
      });

      group.subtotal = Number((group.subtotal + gst.subtotal).toFixed(2));
      group.cgst = Number((group.cgst + gst.cgstAmount).toFixed(2));
      group.sgst = Number((group.sgst + gst.sgstAmount).toFixed(2));
      group.igst = Number((group.igst + gst.igstAmount).toFixed(2));
      group.totalGst = Number((group.totalGst + gst.totalGst).toFixed(2));
      group.totalAmount = Number((group.totalAmount + gst.totalAmount).toFixed(2));
    }

    const suppliersArray = Array.from(supplierGroups.values());
    const overallSubtotal = Number(suppliersArray.reduce((sum, s) => sum + s.subtotal, 0).toFixed(2));
    const overallGst = Number(suppliersArray.reduce((sum, s) => sum + s.totalGst, 0).toFixed(2));
    const overallTotal = Number(suppliersArray.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2));

    // Aggregate shopkeeper projected retail revenue and profit
    let totalExpectedRevenue = 0;
    let totalExpectedProfit = 0;
    suppliersArray.forEach(s => {
      s.items.forEach(it => {
        totalExpectedRevenue += (it.itemTotalRevenue || 0);
        totalExpectedProfit += (it.itemTotalProfit || 0);
      });
    });
    totalExpectedRevenue = Number(totalExpectedRevenue.toFixed(2));
    totalExpectedProfit = Number(totalExpectedProfit.toFixed(2));
    const overallProfitMargin = totalExpectedRevenue > 0
      ? Math.round(((totalExpectedProfit / totalExpectedRevenue) * 100) * 10) / 10
      : 0;

    return res.json({
      success: true,
      suppliers: suppliersArray,
      summary: {
        supplierCount: suppliersArray.length,
        subtotal: overallSubtotal,
        gst: overallGst,
        total: overallTotal,
        totalExpectedRevenue,
        totalExpectedProfit,
        overallProfitMargin,
      }
    });
  } catch (err) {
    console.error('Cart validate error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Checkout: Creates separate orders per supplier
router.post('/checkout', (req, res) => {
  try {
    const retailer = req.retailer;
    const { items = [], shippingAddress, deliveryInstructions } = req.body;

    if (!items.length) {
      return res.status(400).json({ error: 'Validation Error', message: 'Cart is empty.' });
    }

    const address = shippingAddress || `${retailer.address}, ${retailer.city}, ${retailer.state} - ${retailer.pincode}`;

    const createdOrders = transaction(() => {
      // Group items by supplier
      const supplierGroups = new Map();

      for (const cartItem of items) {
        const prod = queryOne(`
          SELECT p.*, e.id as supplier_id, e.company_name as supplier_name, e.state_code as supplier_state_code
          FROM products p
          JOIN enterprise_profiles e ON p.enterprise_id = e.id
          WHERE p.id = ? AND p.status = 'ACTIVE' AND p.is_visible = 1
        `, [cartItem.productId]);

        if (!prod) {
          throw new Error(`Product not found or unavailable: ${cartItem.productId}`);
        }

        const qty = Math.max(prod.moq || 1, Number(cartItem.quantity) || 1);

        // Check stock availability
        if (prod.stock_available < qty) {
          throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stock_available}, Requested: ${qty}`);
        }

        let unitPrice = prod.wholesale_price;
        if (prod.bulk_pricing_json) {
          try {
            const tiers = JSON.parse(prod.bulk_pricing_json);
            const applicableTier = tiers
              .filter(t => qty >= t.min_qty)
              .sort((a, b) => b.min_qty - a.min_qty)[0];
            if (applicableTier && applicableTier.price < unitPrice) {
              unitPrice = applicableTier.price;
            }
          } catch (e) {}
        }

        const gst = calculateGST({
          basePrice: unitPrice,
          gstRate: prod.gst_rate,
          supplierStateCode: prod.supplier_state_code,
          retailerStateCode: retailer.state_code,
          quantity: qty,
        });

        if (!supplierGroups.has(prod.supplier_id)) {
          supplierGroups.set(prod.supplier_id, {
            supplierId: prod.supplier_id,
            supplierName: prod.supplier_name,
            items: [],
            subtotal: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalGst: 0,
            totalAmount: 0,
          });
        }

        const grp = supplierGroups.get(prod.supplier_id);
        grp.items.push({
          productId: prod.id,
          name: prod.name,
          quantity: qty,
          basePrice: unitPrice,
          gstRate: prod.gst_rate,
          gstAmount: gst.totalGst,
          totalPrice: gst.totalAmount,
        });

        grp.subtotal = Number((grp.subtotal + gst.subtotal).toFixed(2));
        grp.cgst = Number((grp.cgst + gst.cgstAmount).toFixed(2));
        grp.sgst = Number((grp.sgst + gst.sgstAmount).toFixed(2));
        grp.igst = Number((grp.igst + gst.igstAmount).toFixed(2));
        grp.totalGst = Number((grp.totalGst + gst.totalGst).toFixed(2));
        grp.totalAmount = Number((grp.totalAmount + gst.totalAmount).toFixed(2));
      }

      const ordersPlaced = [];

      for (const [enterpriseId, group] of supplierGroups.entries()) {
        const orderId = crypto.randomUUID();
        const countRow = queryOne(`SELECT COUNT(*) as count FROM orders`);
        let seq = (countRow.count || 0) + 1;
        let orderNumber = `ORD-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
        while (queryOne(`SELECT id FROM orders WHERE order_number = ?`, [orderNumber])) {
          seq++;
          orderNumber = `ORD-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
        }

        run(`
          INSERT INTO orders (
            id, order_number, enterprise_id, retailer_id, status, subtotal,
            cgst_amount, sgst_amount, igst_amount, gst_amount, total_amount,
            payment_status, shipping_address, delivery_instructions
          ) VALUES (?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, ?, 'UNPAID', ?, ?)
        `, [
          orderId,
          orderNumber,
          enterpriseId,
          retailer.id,
          group.subtotal,
          group.cgst,
          group.sgst,
          group.igst,
          group.totalGst,
          group.totalAmount,
          address,
          deliveryInstructions || null
        ]);

        // Insert items
        for (const item of group.items) {
          run(`
            INSERT INTO order_items (
              id, order_id, product_id, quantity, base_price, gst_rate, gst_amount, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            crypto.randomUUID(),
            orderId,
            item.productId,
            item.quantity,
            item.basePrice,
            item.gstRate,
            item.gstAmount,
            item.totalPrice
          ]);

          // Record in retailer purchase history
          run(`
            INSERT INTO retailer_purchase_history (
              id, retailer_id, product_id, order_id, quantity, purchase_price
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            crypto.randomUUID(),
            retailer.id,
            item.productId,
            orderId,
            item.quantity,
            item.basePrice
          ]);
        }

        // Send In-App notification to Enterprise
        const entUser = queryOne(`SELECT user_id FROM enterprise_profiles WHERE id = ?`, [enterpriseId]);
        if (entUser) {
          run(`
            INSERT INTO notifications (
              id, user_id, title, message, type, link, is_read, metadata_json
            ) VALUES (?, ?, ?, ?, 'ORDER', ?, 0, ?)
          `, [
            crypto.randomUUID(),
            entUser.user_id,
            `New Order Received #${orderNumber}`,
            `New wholesale order received from ${retailer.shop_name} for ₹${group.totalAmount.toLocaleString('en-IN')}`,
            `/enterprise/orders?id=${orderId}`,
            JSON.stringify({ orderId, orderNumber, totalAmount: group.totalAmount })
          ]);
        }

        ordersPlaced.push({
          orderId,
          orderNumber,
          supplierName: group.supplierName,
          totalAmount: group.totalAmount,
          itemCount: group.items.length,
        });

        logAudit(req.user.id, 'PLACE_ORDER', 'ORDER', orderId, { orderNumber, totalAmount: group.totalAmount }, enterpriseId, retailer.id);
      }

      return ordersPlaced;
    });

    return res.status(201).json({
      success: true,
      message: `Successfully placed ${createdOrders.length} order(s) grouped by supplier.`,
      orders: createdOrders,
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(400).json({ error: 'Checkout Failed', message: err.message });
  }
});

export default router;

