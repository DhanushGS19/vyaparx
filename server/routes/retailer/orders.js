import express from 'express';
import { queryAll, queryOne } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

// List retailer's orders
router.get('/', (req, res) => {
  try {
    const retailerId = req.retailerId;
    const { status, search } = req.query;

    let query = `
      SELECT 
        o.*,
        e.company_name as supplier_name, e.city as supplier_city,
        COUNT(oi.id) as item_count,
        COALESCE(SUM(oi.dispatched_quantity), 0) as total_dispatched_units,
        COALESCE(SUM(oi.quantity), 0) as total_ordered_units
      FROM orders o
      JOIN enterprise_profiles e ON o.enterprise_id = e.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.retailer_id = ?
    `;
    const params = [retailerId];

    if (status && status !== 'ALL') {
      query += ` AND o.status = ?`;
      params.push(status);
    }
    if (search && search.trim()) {
      query += ` AND (o.order_number LIKE ? OR e.company_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC`;
    const orders = queryAll(query, params);

    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Single order details with dispatch records & tax invoice
router.get('/:id', (req, res) => {
  try {
    const retailerId = req.retailerId;
    const orderId = req.params.id;

    const order = queryOne(`
      SELECT 
        o.*,
        e.company_name as supplier_name, e.phone as supplier_phone, e.email as supplier_email,
        e.address as supplier_address, e.city as supplier_city, e.state as supplier_state,
        e.pincode as supplier_pincode, e.gstin as supplier_gstin, e.bank_name, e.account_number, e.ifsc_code
      FROM orders o
      JOIN enterprise_profiles e ON o.enterprise_id = e.id
      WHERE o.id = ? AND o.retailer_id = ?
    `, [orderId, retailerId]);

    if (!order) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });

    const items = queryAll(`
      SELECT 
        oi.*,
        p.name as product_name, p.sku, p.uom, p.image_url,
        (oi.quantity - oi.dispatched_quantity) as pending_quantity
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [orderId]);

    const dispatches = queryAll(`
      SELECT * FROM dispatch_records WHERE order_id = ? ORDER BY dispatch_date DESC
    `, [orderId]);

    const invoice = queryOne(`SELECT * FROM invoices WHERE order_id = ?`, [orderId]);

    return res.json({
      success: true,
      order,
      items,
      dispatches,
      invoice,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

