import express from 'express';
import crypto from 'node:crypto';
import { queryAll, queryOne, run } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise } from '../../middleware/rbac.js';
import { adjustStock } from '../../services/inventoryEngine.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

// Inventory overview & low stock alerts
router.get('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;

    const inventorySummary = queryOne(`
      SELECT 
        COALESCE(SUM(stock_available + stock_reserved + stock_dispatched + stock_damaged + stock_returned), 0) as total_stock,
        COALESCE(SUM(stock_available), 0) as available_stock,
        COALESCE(SUM(stock_reserved), 0) as reserved_stock,
        COALESCE(SUM(stock_dispatched), 0) as dispatched_stock,
        COALESCE(SUM(stock_damaged), 0) as damaged_stock,
        COALESCE(SUM(stock_returned), 0) as returned_stock,
        COUNT(id) as total_products
      FROM products
      WHERE enterprise_id = ? AND status = 'ACTIVE'
    `, [enterpriseId]);

    // Product-wise stock report
    const products = queryAll(`
      SELECT 
        p.id, p.name, p.sku, p.uom, p.base_price,
        p.stock_available, p.stock_reserved, p.stock_dispatched, p.stock_damaged, p.stock_returned,
        c.name as category_name,
        CASE 
          WHEN p.stock_available = 0 THEN 'OUT_OF_STOCK'
          WHEN p.stock_available <= 25 THEN 'LOW_STOCK'
          ELSE 'OPTIMAL'
        END as stock_health
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      WHERE p.enterprise_id = ? AND p.status != 'INACTIVE'
      ORDER BY p.stock_available ASC
    `, [enterpriseId]);

    // Low stock items list
    const lowStockAlerts = products.filter(p => p.stock_health !== 'OPTIMAL');

    // Warehouses
    const warehouses = queryAll(`
      SELECT * FROM warehouses WHERE enterprise_id = ? ORDER BY is_primary DESC, name ASC
    `, [enterpriseId]);

    return res.json({
      success: true,
      summary: inventorySummary,
      lowStockCount: lowStockAlerts.length,
      lowStockAlerts,
      products,
      warehouses,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Stock movement history
router.get('/history', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { productId, limit = 50 } = req.query;

    let query = `
      SELECT 
        it.*, p.name as product_name, p.sku,
        w.name as warehouse_name
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      LEFT JOIN warehouses w ON it.warehouse_id = w.id
      WHERE it.enterprise_id = ?
    `;
    const params = [enterpriseId];

    if (productId) {
      query += ` AND it.product_id = ?`;
      params.push(productId);
    }

    query += ` ORDER BY it.created_at DESC LIMIT ?`;
    params.push(Number(limit));

    const transactions = queryAll(query, params);
    return res.json({ success: true, count: transactions.length, transactions });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Stock adjustment
router.post('/adjust', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { productId, warehouseId, type, quantityChange, notes } = req.body;

    if (!productId || quantityChange === undefined || !type) {
      return res.status(400).json({ error: 'Validation Error', message: 'Product ID, type, and quantity change are required.' });
    }

    const result = adjustStock({
      enterpriseId,
      productId,
      warehouseId,
      type,
      quantityChange,
      notes,
      userId: req.user.id,
    });

    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ error: 'Adjustment Failed', message: err.message });
  }
});

// Create warehouse
router.post('/warehouses', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { name, code, address, city, state, pincode, capacitySqft, managerName, managerPhone } = req.body;

    if (!name || !code || !address || !state) {
      return res.status(400).json({ error: 'Validation Error', message: 'Warehouse Name, Code, Address, and State are required.' });
    }

    const id = crypto.randomUUID();
    run(`
      INSERT INTO warehouses (
        id, enterprise_id, name, code, address, city, state, pincode, capacity_sqft, manager_name, manager_phone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, enterpriseId, name.trim(), code.toUpperCase().trim(), address.trim(), city || '', state.trim(), pincode || '', Number(capacitySqft) || 5000, managerName || '', managerPhone || '']);

    const warehouse = queryOne(`SELECT * FROM warehouses WHERE id = ?`, [id]);
    return res.status(201).json({ success: true, warehouse });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

