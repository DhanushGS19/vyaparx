const { getDb } = require('../server/db');
const { queryOne, queryAll } = getDb();

try {
  const r = queryOne('SELECT id, user_id, shop_name FROM retailer_profiles LIMIT 1');
  console.log('Retailer:', r);
  const ent = queryOne('SELECT id FROM enterprise_profiles LIMIT 1');
  console.log('Enterprise:', ent);

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
  `, [ent.id, r.id]);
  console.log('Retailer 360 found:', retailer.shop_name);

  // Check lines 140-200 of retailers.js
  const orders = queryAll(`
    SELECT o.*, COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.retailer_id = ? AND o.enterprise_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `, [r.id, ent.id]);
  console.log('Orders found:', orders.length);

  const invoices = queryAll(`
    SELECT i.*, o.order_number,
      CASE WHEN i.balance_amount <= 0 THEN 'PAID'
           WHEN i.due_date < CURRENT_TIMESTAMP THEN 'OVERDUE'
           ELSE i.status END as current_status
    FROM invoices i
    LEFT JOIN orders o ON i.order_id = o.id
    WHERE i.retailer_id = ? AND i.enterprise_id = ?
    ORDER BY i.created_at DESC
  `, [r.id, ent.id]);
  console.log('Invoices found:', invoices.length);

  console.log('All 360 queries valid!');
} catch (err) {
  console.error('Error during test:', err);
}

