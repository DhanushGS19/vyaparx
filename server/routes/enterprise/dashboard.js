import express from 'express';
import { queryAll, queryOne } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise } from '../../middleware/rbac.js';

const router = express.Router();

router.use(authenticateToken, requireEnterprise);

router.get('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { range = '30days', startDate, endDate } = req.query;

    let dateCondition = "AND o.created_at >= date('now', '-30 days')";
    let invoiceDateCondition = "AND i.created_at >= date('now', '-30 days')";
    let paymentDateCondition = "AND p.payment_date >= date('now', '-30 days')";

    if (range === 'today') {
      dateCondition = "AND date(o.created_at) = date('now')";
      invoiceDateCondition = "AND date(i.created_at) = date('now')";
      paymentDateCondition = "AND date(p.payment_date) = date('now')";
    } else if (range === '7days') {
      dateCondition = "AND o.created_at >= date('now', '-7 days')";
      invoiceDateCondition = "AND i.created_at >= date('now', '-7 days')";
      paymentDateCondition = "AND p.payment_date >= date('now', '-7 days')";
    } else if (range === '3months') {
      dateCondition = "AND o.created_at >= date('now', '-90 days')";
      invoiceDateCondition = "AND i.created_at >= date('now', '-90 days')";
      paymentDateCondition = "AND p.payment_date >= date('now', '-90 days')";
    } else if (range === 'custom' && startDate && endDate) {
      dateCondition = `AND date(o.created_at) BETWEEN '${startDate}' AND '${endDate}'`;
      invoiceDateCondition = `AND date(i.created_at) BETWEEN '${startDate}' AND '${endDate}'`;
      paymentDateCondition = `AND date(p.payment_date) BETWEEN '${startDate}' AND '${endDate}'`;
    }

    // 1. KPI Aggregations
    const revenueRow = queryOne(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(id) AS total_orders,
        COALESCE(SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END), 0) AS pending_orders,
        COALESCE(SUM(CASE WHEN status IN ('ACCEPTED', 'PROCESSING', 'PARTIALLY_DISPATCHED') THEN 1 ELSE 0 END), 0) AS processing_orders,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END), 0) AS completed_orders,
        COUNT(DISTINCT retailer_id) AS active_retailers
      FROM orders o
      WHERE o.enterprise_id = ? AND o.status != 'CANCELLED' ${dateCondition}
    `, [enterpriseId]);

    const inventoryRow = queryOne(`
      SELECT 
        COALESCE(SUM(stock_available), 0) AS available_inventory,
        COALESCE(SUM(stock_reserved), 0) AS reserved_inventory,
        COALESCE(SUM(stock_dispatched), 0) AS dispatched_inventory,
        COALESCE(SUM(stock_damaged), 0) AS damaged_inventory,
        COALESCE(SUM(stock_returned), 0) AS returned_inventory,
        COUNT(id) AS total_active_products
      FROM products
      WHERE enterprise_id = ? AND status = 'ACTIVE'
    `, [enterpriseId]);

    const duesRow = queryOne(`
      SELECT 
        COALESCE(SUM(balance_amount), 0) AS total_outstanding_dues,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_TIMESTAMP AND balance_amount > 0 THEN balance_amount ELSE 0 END), 0) AS overdue_dues
      FROM invoices i
      WHERE enterprise_id = ? AND status != 'CANCELLED'
    `, [enterpriseId]);

    const paymentsRow = queryOne(`
      SELECT COALESCE(SUM(amount), 0) AS total_payments_received
      FROM payments p
      WHERE enterprise_id = ? ${paymentDateCondition}
    `, [enterpriseId]);

    // 2. Monthly / Periodic Sales Chart
    const salesChart = queryAll(`
      SELECT 
        strftime('%Y-%m', created_at) AS period,
        COUNT(id) AS order_count,
        ROUND(SUM(total_amount), 2) AS revenue,
        ROUND(SUM(subtotal), 2) AS subtotal,
        ROUND(SUM(gst_amount), 2) AS gst
      FROM orders
      WHERE enterprise_id = ? AND status != 'CANCELLED'
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY period ASC
      LIMIT 12
    `, [enterpriseId]);

    // 3. Order Status Breakdown
    const orderStatusBreakdown = queryAll(`
      SELECT status, COUNT(id) as count, ROUND(SUM(total_amount), 2) as amount
      FROM orders
      WHERE enterprise_id = ?
      GROUP BY status
    `, [enterpriseId]);

    // 4. Product Demand (Top 6 Products by quantity ordered)
    const topProducts = queryAll(`
      SELECT 
        p.name, p.sku, c.name as category_name,
        SUM(oi.quantity) as total_units_ordered,
        ROUND(SUM(oi.total_price), 2) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN product_categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.enterprise_id = ? AND o.status != 'CANCELLED'
      GROUP BY p.id
      ORDER BY total_units_ordered DESC
      LIMIT 6
    `, [enterpriseId]);

    // 5. Outstanding Payments by Retailer (Top debtors)
    const outstandingByRetailer = queryAll(`
      SELECT 
        r.id as retailer_id,
        r.shop_name,
        r.owner_name,
        ROUND(SUM(i.balance_amount), 2) as outstanding_amount,
        COUNT(i.id) as unpaid_invoice_count,
        MIN(i.due_date) as oldest_due_date
      FROM invoices i
      JOIN retailer_profiles r ON i.retailer_id = r.id
      WHERE i.enterprise_id = ? AND i.balance_amount > 0 AND i.status != 'CANCELLED'
      GROUP BY r.id
      ORDER BY outstanding_amount DESC
      LIMIT 5
    `, [enterpriseId]);

    // 6. Recent Orders
    const recentOrders = queryAll(`
      SELECT 
        o.id, o.order_number, o.created_at, o.status, o.total_amount, o.payment_status,
        r.shop_name, r.owner_name, r.city
      FROM orders o
      JOIN retailer_profiles r ON o.retailer_id = r.id
      WHERE o.enterprise_id = ?
      ORDER BY o.created_at DESC
      LIMIT 8
    `, [enterpriseId]);

    // 7. Recent Activities Timeline (Audit + Inward/Outward movements)
    const recentActivities = queryAll(`
      SELECT 
        it.id, it.transaction_type, it.quantity, it.created_at, it.notes,
        p.name as product_name
      FROM inventory_transactions it
      JOIN products p ON it.product_id = p.id
      WHERE it.enterprise_id = ?
      ORDER BY it.created_at DESC
      LIMIT 8
    `, [enterpriseId]);

    return res.json({
      success: true,
      range,
      kpis: {
        totalRevenue: Number(revenueRow.total_revenue) || 0,
        totalOrders: Number(revenueRow.total_orders) || 0,
        pendingOrders: Number(revenueRow.pending_orders) || 0,
        processingOrders: Number(revenueRow.processing_orders) || 0,
        completedOrders: Number(revenueRow.completed_orders) || 0,
        activeRetailers: Number(revenueRow.active_retailers) || 0,
        totalOutstandingDues: Number(duesRow.total_outstanding_dues) || 0,
        overdueDues: Number(duesRow.overdue_dues) || 0,
        paymentsReceived: Number(paymentsRow.total_payments_received) || 0,
        availableInventory: Number(inventoryRow.available_inventory) || 0,
        reservedInventory: Number(inventoryRow.reserved_inventory) || 0,
        dispatchedInventory: Number(inventoryRow.dispatched_inventory) || 0,
        damagedInventory: Number(inventoryRow.damaged_inventory) || 0,
        returnedInventory: Number(inventoryRow.returned_inventory) || 0,
        totalActiveProducts: Number(inventoryRow.total_active_products) || 0,
      },
      charts: {
        salesChart,
        orderStatusBreakdown,
        topProducts,
        outstandingByRetailer,
      },
      recentOrders,
      recentActivities,
    });
  } catch (err) {
    console.error('Enterprise dashboard error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

