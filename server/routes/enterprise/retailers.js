import express from 'express';
import { queryAll, queryOne } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise } from '../../middleware/rbac.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

// List all retailers connected to this enterprise
router.get('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { search } = req.query;

    let query = `
      SELECT 
        r.id, r.shop_name, r.owner_name, r.phone, r.email, r.city, r.state, r.gstin, r.gst_type,
        r.credit_limit, r.current_credit,
        COALESCE(rel.status, 'ACTIVE') as relationship_status,
        COALESCE(rel.payment_terms_days, 15) as payment_terms_days,
        (SELECT COUNT(*) FROM orders o WHERE o.retailer_id = r.id AND o.enterprise_id = ?) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE o.retailer_id = r.id AND o.enterprise_id = ? AND o.status != 'CANCELLED') as total_spend,
        (SELECT COALESCE(SUM(balance_amount), 0) FROM invoices i WHERE i.retailer_id = r.id AND i.enterprise_id = ? AND i.status != 'CANCELLED') as outstanding_dues,
        (SELECT MAX(o.created_at) FROM orders o WHERE o.retailer_id = r.id AND o.enterprise_id = ?) as last_order_date
      FROM retailer_profiles r
      LEFT JOIN supplier_retailer_relationships rel ON r.id = rel.retailer_id AND rel.enterprise_id = ?
      WHERE 1=1
    `;
    const params = [enterpriseId, enterpriseId, enterpriseId, enterpriseId, enterpriseId];

    if (search && search.trim()) {
      query += ` AND (r.shop_name LIKE ? OR r.owner_name LIKE ? OR r.city LIKE ? OR r.phone LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY total_spend DESC, r.shop_name ASC`;
    const retailers = queryAll(query, params);

    return res.json({ success: true, count: retailers.length, retailers });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Retailer 360° Comprehensive Profile
router.get('/:id/360', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const retailerId = req.params.id;

    // A. Retailer Info
    const retailer = queryOne(`
      SELECT 
        r.*,
        COALESCE(rel.status, 'ACTIVE') as relationship_status,
        COALESCE(rel.credit_limit, r.credit_limit) as approved_credit_limit,
        COALESCE(rel.payment_terms_days, 15) as payment_terms_days,
        COALESCE(rel.auto_reminder_enabled, 1) as auto_reminder_enabled
      FROM retailer_profiles r
      LEFT JOIN supplier_retailer_relationships rel ON r.id = rel.retailer_id AND rel.enterprise_id = ?
      WHERE r.id = ?
    `, [enterpriseId, retailerId]);

    if (!retailer) {
      return res.status(404).json({ error: 'Not Found', message: 'Retailer profile not found.' });
    }

    // B. Complete Order History
    const orders = queryAll(`
      SELECT 
        o.*,
        COUNT(oi.id) as item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.retailer_id = ? AND o.enterprise_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [retailerId, enterpriseId]);

    // Average ordering frequency (days between orders)
    let avgOrderFrequencyDays = null;
    if (orders.length > 1) {
      const dates = orders.map(o => new Date(o.created_at).getTime()).sort((a, b) => a - b);
      const spanDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
      avgOrderFrequencyDays = Math.round(spanDays / (orders.length - 1));
    }

    // C. Financial Account: Invoices, Payments, Outstanding Dues
    const invoices = queryAll(`
      SELECT 
        i.*,
        o.order_number,
        CASE 
          WHEN i.balance_amount <= 0 THEN 'PAID'
          WHEN i.due_date < CURRENT_TIMESTAMP THEN 'OVERDUE'
          ELSE i.status
        END as current_status
      FROM invoices i
      LEFT JOIN orders o ON i.order_id = o.id
      WHERE i.retailer_id = ? AND i.enterprise_id = ?
      ORDER BY i.created_at DESC
    `, [retailerId, enterpriseId]);

    const payments = queryAll(`
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM payment_allocations pa WHERE pa.payment_id = p.id) as allocated_invoice_count
      FROM payments p
      WHERE p.retailer_id = ? AND p.enterprise_id = ?
      ORDER BY p.payment_date DESC
    `, [retailerId, enterpriseId]);

    const financialSummary = queryOne(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_purchase_value,
        COALESCE(SUM(paid_amount), 0) as total_payments_received,
        COALESCE(SUM(balance_amount), 0) as total_outstanding_dues,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_TIMESTAMP AND balance_amount > 0 THEN balance_amount ELSE 0 END), 0) as overdue_payments
      FROM invoices
      WHERE retailer_id = ? AND enterprise_id = ? AND status != 'CANCELLED'
    `, [retailerId, enterpriseId]);

    // D. Product Demand Profile for this Retailer
    const frequentlyPurchased = queryAll(`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        c.name as category_name,
        SUM(oi.quantity) as total_quantity_purchased,
        ROUND(SUM(oi.total_price), 2) as total_spent,
        COUNT(DISTINCT o.id) as order_frequency,
        MAX(o.created_at) as last_purchased_date
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN product_categories c ON p.category_id = c.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.retailer_id = ? AND o.enterprise_id = ? AND o.status != 'CANCELLED'
      GROUP BY p.id
      ORDER BY total_quantity_purchased DESC
      LIMIT 10
    `, [retailerId, enterpriseId]);

    // Expected next purchase period
    let expectedNextPurchaseDate = null;
    if (orders.length > 0 && avgOrderFrequencyDays) {
      const lastOrderTime = new Date(orders[0].created_at).getTime();
      expectedNextPurchaseDate = new Date(lastOrderTime + (avgOrderFrequencyDays * 24 * 60 * 60 * 1000)).toISOString();
    }

    // E. Payment Reminders History for this Retailer
    const reminders = queryAll(`
      SELECT 
        pr.*,
        i.invoice_number
      FROM payment_reminders pr
      LEFT JOIN invoices i ON pr.invoice_id = i.id
      WHERE pr.retailer_id = ? AND pr.enterprise_id = ?
      ORDER BY pr.sent_at DESC
    `, [retailerId, enterpriseId]);

    // G. Account Activity Timeline
    const activities = [];
    orders.forEach(o => {
      activities.push({
        type: 'ORDER',
        title: `Order Placed (${o.order_number})`,
        amount: o.total_amount,
        timestamp: o.created_at,
        status: o.status,
      });
    });
    invoices.forEach(i => {
      activities.push({
        type: 'INVOICE',
        title: `Invoice Generated (${i.invoice_number})`,
        amount: i.total_amount,
        timestamp: i.created_at,
        status: i.status,
      });
    });
    payments.forEach(p => {
      activities.push({
        type: 'PAYMENT',
        title: `Payment Received (${p.payment_number} - ${p.payment_method})`,
        amount: p.amount,
        timestamp: p.payment_date,
        status: 'CONFIRMED',
        ref: p.transaction_reference,
      });
    });
    reminders.forEach(r => {
      activities.push({
        type: 'REMINDER',
        title: `Payment Reminder Sent (${r.reminder_type})`,
        amount: r.amount_due,
        timestamp: r.sent_at,
        status: r.delivery_status,
      });
    });

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json({
      success: true,
      retailer,
      orderHistory: {
        totalOrders: orders.length,
        avgOrderFrequencyDays,
        expectedNextPurchaseDate,
        orders,
      },
      financialAccount: {
        summary: financialSummary,
        creditLimit: retailer.approved_credit_limit,
        creditUtilizationPercent: retailer.approved_credit_limit > 0
          ? Number(((financialSummary.total_outstanding_dues / retailer.approved_credit_limit) * 100).toFixed(1))
          : 0,
        invoices,
        payments,
      },
      productDemandProfile: {
        frequentlyPurchased,
        expectedNextPurchaseDate,
      },
      remindersHistory: reminders,
      accountTimeline: activities.slice(0, 25),
    });
  } catch (err) {
    console.error('Retailer 360 error:', err);
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

