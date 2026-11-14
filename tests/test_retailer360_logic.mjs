import { queryOne, queryAll } from '../server/db/connection.js';

const enterpriseId = 'ent-apex';
const retailerId = 'ret-krishna';

try {
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

  console.log('Retailer:', retailer?.shop_name);

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
  console.log('Orders:', orders.length);

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
  console.log('Invoices:', invoices.length);

  const payments = queryAll(`
    SELECT 
      p.*,
      (SELECT COUNT(*) FROM payment_allocations pa WHERE pa.payment_id = p.id) as allocated_invoice_count
    FROM payments p
    WHERE p.retailer_id = ? AND p.enterprise_id = ?
    ORDER BY p.payment_date DESC
  `, [retailerId, enterpriseId]);
  console.log('Payments:', payments.length);

  const financialSummary = queryOne(`
    SELECT 
      COALESCE(SUM(total_amount), 0) as total_purchase_value,
      COALESCE(SUM(paid_amount), 0) as total_payments_received,
      COALESCE(SUM(balance_amount), 0) as total_outstanding_dues,
      COALESCE(SUM(CASE WHEN due_date < CURRENT_TIMESTAMP AND balance_amount > 0 THEN balance_amount ELSE 0 END), 0) as overdue_payments
    FROM invoices
    WHERE retailer_id = ? AND enterprise_id = ? AND status != 'CANCELLED'
  `, [retailerId, enterpriseId]);
  console.log('Financial Summary:', financialSummary);

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
  console.log('Frequently Purchased:', frequentlyPurchased.length);

  const reminders = queryAll(`
    SELECT 
      pr.*,
      i.invoice_number
    FROM payment_reminders pr
    LEFT JOIN invoices i ON pr.invoice_id = i.id
    WHERE pr.retailer_id = ? AND pr.enterprise_id = ?
    ORDER BY pr.sent_at DESC
  `, [retailerId, enterpriseId]);
  console.log('Reminders:', reminders.length);

  console.log('SUCCESS: All 360 data verified without error!');
} catch (err) {
  console.error('ERROR in 360 logic:', err);
}

