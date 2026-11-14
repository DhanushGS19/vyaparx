import express from 'express';
import { queryAll, queryOne } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise, logAudit } from '../../middleware/rbac.js';
import { recordPaymentAndReconcile } from '../../services/reconciliation.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

// List all payments
router.get('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { retailerId } = req.query;

    let query = `
      SELECT 
        p.*,
        r.shop_name, r.owner_name, r.city as retailer_city,
        (SELECT COUNT(*) FROM payment_allocations pa WHERE pa.payment_id = p.id) as allocated_invoices_count
      FROM payments p
      JOIN retailer_profiles r ON p.retailer_id = r.id
      WHERE p.enterprise_id = ?
    `;
    const params = [enterpriseId];

    if (retailerId) {
      query += ` AND p.retailer_id = ?`;
      params.push(retailerId);
    }

    query += ` ORDER BY p.payment_date DESC`;
    const payments = queryAll(query, params);

    return res.json({ success: true, count: payments.length, payments });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Record and reconcile payment
router.post('/reconcile', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const {
      retailerId,
      amount,
      paymentMethod = 'UPI',
      transactionReference,
      paymentDate,
      notes,
      allocations,
    } = req.body;

    if (!retailerId || !amount) {
      return res.status(400).json({ error: 'Validation Error', message: 'Retailer ID and Payment Amount are required.' });
    }

    const result = recordPaymentAndReconcile({
      enterpriseId,
      retailerId,
      amount,
      paymentMethod,
      transactionReference,
      paymentDate,
      notes,
      allocations,
      recordedByUserId: req.user.id,
    });

    logAudit(req.user.id, 'RECORD_PAYMENT', 'PAYMENT', result.paymentId, {
      retailerId,
      amount,
      paymentMethod,
      transactionReference
    }, enterpriseId);

    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Payment Reconciliation Failed', message: err.message });
  }
});

// Get payment receipt
router.get('/:id/receipt', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const paymentId = req.params.id;

    const payment = queryOne(`
      SELECT 
        p.*,
        r.shop_name, r.owner_name, r.address as retailer_address, r.city as retailer_city,
        r.state as retailer_state, r.pincode as retailer_pincode, r.gstin as retailer_gstin,
        e.company_name, e.gstin as enterprise_gstin, e.phone as enterprise_phone, e.address as enterprise_address,
        e.bank_name, e.account_number, e.ifsc_code
      FROM payments p
      JOIN retailer_profiles r ON p.retailer_id = r.id
      JOIN enterprise_profiles e ON p.enterprise_id = e.id
      WHERE p.id = ? AND p.enterprise_id = ?
    `, [paymentId, enterpriseId]);

    if (!payment) return res.status(404).json({ error: 'Not Found', message: 'Payment record not found.' });

    const allocations = queryAll(`
      SELECT 
        pa.*,
        i.invoice_number, i.total_amount as invoice_total, i.balance_amount as current_balance, i.due_date
      FROM payment_allocations pa
      JOIN invoices i ON pa.invoice_id = i.id
      WHERE pa.payment_id = ?
    `, [paymentId]);

    return res.json({ success: true, receipt: payment, allocations });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

