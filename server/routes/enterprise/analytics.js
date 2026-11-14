import express from 'express';
import { queryAll, queryOne } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise } from '../../middleware/rbac.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

router.get('/overview', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;

    // 1. Revenue Trends & Monthly Comparison
    const monthlyComparison = queryAll(`
      SELECT 
        strftime('%Y-%m', o.created_at) as month,
        ROUND(SUM(o.total_amount), 2) as revenue,
        ROUND(SUM(o.subtotal), 2) as subtotal,
        ROUND(SUM(o.gst_amount), 2) as gst,
        COUNT(o.id) as orders_count,
        ROUND(AVG(o.total_amount), 2) as avg_order_value
      FROM orders o
      WHERE o.enterprise_id = ? AND o.status != 'CANCELLED'
      GROUP BY strftime('%Y-%m', o.created_at)
      ORDER BY month DESC
      LIMIT 12
    `, [enterpriseId]);

    // 2. Category Performance
    const categoryPerformance = queryAll(`
      SELECT 
        c.name as category_name,
        COUNT(DISTINCT p.id) as product_count,
        SUM(oi.quantity) as units_sold,
        ROUND(SUM(oi.total_price), 2) as total_revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN product_categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.enterprise_id = ? AND o.status != 'CANCELLED'
      GROUP BY c.id
      ORDER BY total_revenue DESC
    `, [enterpriseId]);

    // 3. Outstanding Payment Aging Buckets
    const agingBuckets = queryAll(`
      SELECT 
        CASE 
          WHEN julianday('now') - julianday(i.due_date) <= 0 THEN 'Current (Not Due)'
          WHEN julianday('now') - julianday(i.due_date) BETWEEN 1 AND 30 THEN '1 - 30 Days Overdue'
          WHEN julianday('now') - julianday(i.due_date) BETWEEN 31 AND 60 THEN '31 - 60 Days Overdue'
          WHEN julianday('now') - julianday(i.due_date) BETWEEN 61 AND 90 THEN '61 - 90 Days Overdue'
          ELSE '90+ Days Critical Overdue'
        END as aging_bucket,
        COUNT(i.id) as invoice_count,
        ROUND(SUM(i.balance_amount), 2) as total_amount
      FROM invoices i
      WHERE i.enterprise_id = ? AND i.balance_amount > 0 AND i.status != 'CANCELLED'
      GROUP BY aging_bucket
      ORDER BY total_amount DESC
    `, [enterpriseId]);

    // 4. Retailer Concentration (Pareto analysis)
    const retailerConcentration = queryAll(`
      SELECT 
        r.shop_name,
        r.owner_name,
        r.city,
        COUNT(o.id) as total_orders,
        ROUND(SUM(o.total_amount), 2) as total_spend,
        ROUND((SUM(o.total_amount) / (SELECT SUM(total_amount) FROM orders WHERE enterprise_id = ? AND status != 'CANCELLED') * 100), 1) as share_percentage
      FROM orders o
      JOIN retailer_profiles r ON o.retailer_id = r.id
      WHERE o.enterprise_id = ? AND o.status != 'CANCELLED'
      GROUP BY r.id
      ORDER BY total_spend DESC
      LIMIT 8
    `, [enterpriseId, enterpriseId]);

    // 5. Dispatch SLA & Order Fulfillment Rates
    const totalOrdersCount = queryOne(`SELECT COUNT(*) as count FROM orders WHERE enterprise_id = ?`, [enterpriseId]).count || 1;
    const fulfillmentStats = queryOne(`
      SELECT 
        COUNT(CASE WHEN status = 'DELIVERED' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN status = 'DISPATCHED' THEN 1 END) as dispatched_count,
        COUNT(CASE WHEN status = 'PARTIALLY_DISPATCHED' THEN 1 END) as partial_count,
        COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled_count
      FROM orders
      WHERE enterprise_id = ?
    `, [enterpriseId]);

    const orderFulfillmentRate = Number(((fulfillmentStats.delivered_count / totalOrdersCount) * 100).toFixed(1));

    return res.json({
      success: true,
      monthlyComparison,
      categoryPerformance,
      agingBuckets,
      retailerConcentration,
      fulfillmentStats: {
        ...fulfillmentStats,
        totalOrdersCount,
        orderFulfillmentRate,
      }
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

