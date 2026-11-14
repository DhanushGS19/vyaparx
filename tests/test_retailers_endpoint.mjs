import { queryOne, queryAll } from '../server/db/connection.js';

const ent = queryOne('SELECT id, user_id FROM enterprise_profiles LIMIT 1');
console.log('Enterprise:', ent);

const query = `
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
  ORDER BY total_spend DESC, r.shop_name ASC
`;
const params = [ent.id, ent.id, ent.id, ent.id, ent.id];
const retailers = queryAll(query, params);
console.log('Found retailers:', retailers.length);
if (retailers.length > 0) {
  console.log('First retailer:', retailers[0].shop_name, 'ID:', retailers[0].id);
}

