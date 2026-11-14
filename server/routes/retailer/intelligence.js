import express from 'express';
import { queryAll } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

router.get('/', (req, res) => {
  try {
    const retailerId = req.retailerId;

    // Monthly purchase trends
    const monthlySpending = queryAll(`
      SELECT 
        strftime('%Y-%m', o.created_at) as month,
        ROUND(SUM(o.total_amount), 2) as total_spent,
        ROUND(SUM(o.subtotal), 2) as base_spent,
        ROUND(SUM(o.gst_amount), 2) as gst_paid,
        COUNT(o.id) as orders_count
      FROM orders o
      WHERE o.retailer_id = ? AND o.status != 'CANCELLED'
      GROUP BY strftime('%Y-%m', o.created_at)
      ORDER BY month ASC
    `, [retailerId]);

    // Frequently purchased products
    const topProducts = queryAll(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.image_url,
        p.wholesale_price,
        c.name as category_name,
        e.company_name as supplier_name,
        SUM(oi.quantity) as total_units_bought,
        ROUND(SUM(oi.total_price), 2) as total_spent,
        COUNT(DISTINCT o.id) as order_frequency,
        MAX(o.created_at) as last_order_date
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN product_categories c ON p.category_id = c.id
      JOIN enterprise_profiles e ON p.enterprise_id = e.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.retailer_id = ? AND o.status != 'CANCELLED'
      GROUP BY p.id
      ORDER BY total_units_bought DESC
      LIMIT 10
    `, [retailerId]);

    // Smart Reordering Recommendations
    // Recommends products purchased before, calculating estimated consumption and days since last purchase
    const reorderRecommendations = topProducts.map(prod => {
      const lastDate = new Date(prod.last_order_date);
      const daysSinceLastOrder = Math.max(1, Math.round((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
      const avgCycleDays = Math.max(7, Math.round(30 / (prod.order_frequency || 1)));

      let urgency = 'NORMAL';
      let reason = 'Stock level estimated to be sufficient.';

      if (daysSinceLastOrder >= avgCycleDays * 1.2) {
        urgency = 'CRITICAL';
        reason = `High stockout risk! Last reordered ${daysSinceLastOrder} days ago (typical cycle: ${avgCycleDays} days).`;
      } else if (daysSinceLastOrder >= avgCycleDays * 0.8) {
        urgency = 'RECOMMENDED';
        reason = `Optimal reorder window reached (${daysSinceLastOrder} days since last purchase).`;
      }

      return {
        ...prod,
        daysSinceLastOrder,
        typicalCycleDays: avgCycleDays,
        urgency,
        reason,
        suggestedReorderQuantity: Math.max(10, Math.round(prod.total_units_bought / (prod.order_frequency || 1))),
      };
    }).sort((a, b) => (b.urgency === 'CRITICAL' ? 1 : 0) - (a.urgency === 'CRITICAL' ? 1 : 0));

    return res.json({
      success: true,
      monthlySpending,
      topProducts,
      reorderRecommendations,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

