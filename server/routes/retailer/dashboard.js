import express from 'express';
import { queryAll, queryOne } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

router.get('/', (req, res) => {
  try {
    const retailerId = req.retailerId;
    const retailer = req.retailer;

    // 1. Retailer Overview Metrics
    const purchaseMetrics = queryOne(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_purchases,
        COUNT(id) as total_orders,
        COALESCE(SUM(CASE WHEN status IN ('NEW', 'ACCEPTED', 'PROCESSING', 'PARTIALLY_DISPATCHED') THEN 1 ELSE 0 END), 0) as pending_orders,
        COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END), 0) as completed_orders
      FROM orders
      WHERE retailer_id = ? AND status != 'CANCELLED'
    `, [retailerId]);

    const financialMetrics = queryOne(`
      SELECT 
        COALESCE(SUM(balance_amount), 0) as total_outstanding_dues,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_TIMESTAMP AND balance_amount > 0 THEN balance_amount ELSE 0 END), 0) as overdue_payments,
        COALESCE(SUM(paid_amount), 0) as total_payments_made
      FROM invoices
      WHERE retailer_id = ? AND status != 'CANCELLED'
    `, [retailerId]);

    // 2. Unread Payment Reminders Count
    const reminderAlerts = queryAll(`
      SELECT 
        pr.*,
        e.company_name as supplier_name,
        i.invoice_number
      FROM payment_reminders pr
      JOIN enterprise_profiles e ON pr.enterprise_id = e.id
      JOIN invoices i ON pr.invoice_id = i.id
      WHERE pr.retailer_id = ? AND pr.acknowledged_at IS NULL
      ORDER BY pr.sent_at DESC
      LIMIT 3
    `, [retailerId]);

    // 3. Featured / Popular Wholesale Products
    const featuredProducts = queryAll(`
      SELECT 
        p.*,
        c.name as category_name,
        e.company_name as supplier_name,
        e.city as supplier_city,
        e.state_code as supplier_state_code
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      JOIN enterprise_profiles e ON p.enterprise_id = e.id
      WHERE p.status = 'ACTIVE' AND p.is_visible = 1 AND p.stock_available > 0
      ORDER BY p.stock_dispatched DESC, p.wholesale_price ASC
      LIMIT 8
    `);

    // 4. Product Categories
    const categories = queryAll(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'ACTIVE' AND p.is_visible = 1) as product_count
      FROM product_categories c
      ORDER BY name ASC
    `);

    // 5. Recently Purchased Products by this Retailer
    const recentlyPurchased = queryAll(`
      SELECT 
        p.id, p.name, p.image_url, p.uom, p.wholesale_price, p.base_price, p.gst_rate,
        e.company_name as supplier_name,
        MAX(o.created_at) as last_purchased_date,
        SUM(oi.quantity) as total_units_bought
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN enterprise_profiles e ON p.enterprise_id = e.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.retailer_id = ? AND o.status != 'CANCELLED'
      GROUP BY p.id
      ORDER BY last_purchased_date DESC
      LIMIT 6
    `, [retailerId]);

    // 6. Recent Orders
    const recentOrders = queryAll(`
      SELECT 
        o.*,
        e.company_name as supplier_name,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count
      FROM orders o
      JOIN enterprise_profiles e ON o.enterprise_id = e.id
      WHERE o.retailer_id = ?
      ORDER BY o.created_at DESC
      LIMIT 5
    `, [retailerId]);

    return res.json({
      success: true,
      shopName: retailer.shop_name,
      ownerName: retailer.owner_name,
      metrics: {
        totalPurchases: Number(purchaseMetrics.total_purchases) || 0,
        totalOrders: Number(purchaseMetrics.total_orders) || 0,
        pendingOrders: Number(purchaseMetrics.pending_orders) || 0,
        completedOrders: Number(purchaseMetrics.completed_orders) || 0,
        totalOutstandingDues: Number(financialMetrics.total_outstanding_dues) || 0,
        overduePayments: Number(financialMetrics.overdue_payments) || 0,
        totalPaymentsMade: Number(financialMetrics.total_payments_made) || 0,
        availableCredit: Math.max(0, (retailer.credit_limit || 50000) - (financialMetrics.total_outstanding_dues || 0)),
      },
      reminderAlerts,
      categories,
      featuredProducts,
      recentlyPurchased,
      recentOrders,
    });
  } catch (err) {
    console.error('Retailer dashboard error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

