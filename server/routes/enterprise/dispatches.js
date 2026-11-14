import express from 'express';
import { queryAll, queryOne, run } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise } from '../../middleware/rbac.js';
import { recordDispatch } from '../../services/inventoryEngine.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

// List dispatches
router.get('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { status, search } = req.query;

    let query = `
      SELECT 
        d.*,
        o.order_number,
        r.shop_name, r.owner_name, r.phone as retailer_phone, r.city as retailer_city,
        (SELECT COUNT(*) FROM dispatch_items di WHERE di.dispatch_id = d.id) as item_count,
        (SELECT SUM(quantity) FROM dispatch_items di WHERE di.dispatch_id = d.id) as total_units_dispatched
      FROM dispatch_records d
      JOIN orders o ON d.order_id = o.id
      JOIN retailer_profiles r ON d.retailer_id = r.id
      WHERE d.enterprise_id = ?
    `;
    const params = [enterpriseId];

    if (status && status !== 'ALL') {
      query += ` AND d.status = ?`;
      params.push(status);
    }
    if (search && search.trim()) {
      query += ` AND (d.dispatch_number LIKE ? OR o.order_number LIKE ? OR r.shop_name LIKE ? OR d.transporter_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY d.dispatch_date DESC`;
    const dispatches = queryAll(query, params);

    return res.json({ success: true, count: dispatches.length, dispatches });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Get single dispatch details with item breakdown
router.get('/:id', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const dispatchId = req.params.id;

    const dispatch = queryOne(`
      SELECT 
        d.*,
        o.order_number, o.created_at as order_date, o.total_amount,
        r.shop_name, r.owner_name, r.phone as retailer_phone, r.email as retailer_email,
        r.address as retailer_address, r.city as retailer_city, r.state as retailer_state, r.pincode as retailer_pincode,
        r.gstin as retailer_gstin,
        e.company_name as supplier_name, e.phone as supplier_phone, e.address as supplier_address, e.gstin as supplier_gstin
      FROM dispatch_records d
      JOIN orders o ON d.order_id = o.id
      JOIN retailer_profiles r ON d.retailer_id = r.id
      JOIN enterprise_profiles e ON d.enterprise_id = e.id
      WHERE d.id = ? AND d.enterprise_id = ?
    `, [dispatchId, enterpriseId]);

    if (!dispatch) return res.status(404).json({ error: 'Not Found', message: 'Dispatch record not found.' });

    const items = queryAll(`
      SELECT 
        di.*,
        p.name as product_name, p.sku, p.uom, p.base_price,
        oi.quantity as ordered_quantity, oi.dispatched_quantity as total_dispatched_for_order
      FROM dispatch_items di
      JOIN products p ON di.product_id = p.id
      JOIN order_items oi ON di.order_item_id = oi.id
      WHERE di.dispatch_id = ?
    `, [dispatchId]);

    return res.json({ success: true, dispatch, items });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Create new dispatch (full or partial)
router.post('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const {
      orderId,
      transporterName,
      trackingNumber,
      vehicleNumber,
      driverPhone,
      waybillNumber,
      expectedDeliveryDate,
      notes,
      itemsToDispatch, // array of { orderItemId, productId, quantity }
    } = req.body;

    if (!orderId || !transporterName || !itemsToDispatch || !itemsToDispatch.length) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Order ID, transporter name, and at least one item with valid quantity are required.'
      });
    }

    const order = queryOne(`SELECT retailer_id FROM orders WHERE id = ? AND enterprise_id = ?`, [orderId, enterpriseId]);
    if (!order) return res.status(404).json({ error: 'Not Found', message: 'Order not found.' });

    const result = recordDispatch({
      enterpriseId,
      retailerId: order.retailer_id,
      orderId,
      transporterName,
      trackingNumber,
      vehicleNumber,
      driverPhone,
      waybillNumber,
      expectedDeliveryDate,
      notes,
      itemsToDispatch,
    });

    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Dispatch Failed', message: err.message });
  }
});

// Update dispatch status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid Status', message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    run(`UPDATE dispatch_records SET status = ? WHERE id = ? AND enterprise_id = ?`, [
      status,
      req.params.id,
      req.enterpriseId
    ]);

    return res.json({ success: true, status });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

