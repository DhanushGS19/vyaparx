import express from 'express';
import { queryAll, queryOne, run } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRetailer } from '../../middleware/rbac.js';
import { recordPaymentAndReconcile } from '../../services/reconciliation.js';
import { acknowledgeReminder } from '../../services/reminderService.js';

const router = express.Router();
router.use(authenticateToken, requireRetailer);

// Financial summary, invoices, payments, reminders
router.get('/', (req, res) => {
  try {
    const retailerId = req.retailerId;

    const summary = queryOne(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_purchases,
        COALESCE(SUM(paid_amount), 0) as total_payments_made,
        COALESCE(SUM(balance_amount), 0) as total_outstanding_dues,
        COALESCE(SUM(CASE WHEN due_date < CURRENT_TIMESTAMP AND balance_amount > 0 THEN balance_amount ELSE 0 END), 0) as overdue_payments
      FROM invoices
      WHERE retailer_id = ? AND status != 'CANCELLED'
    `, [retailerId]);

    const invoices = queryAll(`
      SELECT 
        i.*,
        o.order_number,
        e.company_name as supplier_name,
        e.phone as supplier_phone,
        e.bank_name, e.account_number, e.ifsc_code
      FROM invoices i
      JOIN orders o ON i.order_id = o.id
      JOIN enterprise_profiles e ON i.enterprise_id = e.id
      WHERE i.retailer_id = ? AND i.status != 'CANCELLED'
      ORDER BY i.created_at DESC
    `, [retailerId]);

    const payments = queryAll(`
      SELECT 
        p.*,
        e.company_name as supplier_name
      FROM payments p
      JOIN enterprise_profiles e ON p.enterprise_id = e.id
      WHERE p.retailer_id = ?
      ORDER BY p.payment_date DESC
    `, [retailerId]);

    const reminders = queryAll(`
      SELECT 
        pr.*,
        e.company_name as supplier_name,
        i.invoice_number
      FROM payment_reminders pr
      JOIN enterprise_profiles e ON pr.enterprise_id = e.id
      JOIN invoices i ON pr.invoice_id = i.id
      WHERE pr.retailer_id = ?
      ORDER BY pr.sent_at DESC
    `, [retailerId]);

    const suppliers = queryAll(`
      SELECT DISTINCT e.id, e.company_name, e.phone, e.city, e.state, e.bank_name, e.account_number, e.ifsc_code
      FROM enterprise_profiles e
      WHERE e.id IN (
        SELECT enterprise_id FROM invoices WHERE retailer_id = ?
        UNION
        SELECT enterprise_id FROM orders WHERE retailer_id = ?
        UNION
        SELECT id FROM enterprise_profiles
      )
      LIMIT 10
    `, [retailerId, retailerId]);

    return res.json({
      success: true,
      summary,
      invoices,
      payments,
      reminders,
      suppliers,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Acknowledge payment reminder
router.post('/reminders/:id/acknowledge', (req, res) => {
  try {
    const result = acknowledgeReminder(req.params.id, req.retailerId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Acknowledgment Failed', message: err.message });
  }
});

// Retailer Pay Online Simulation (UPI / NEFT / Net Banking)
router.post('/pay', (req, res) => {
  try {
    const retailerId = req.retailerId;
    let {
      enterpriseId,
      amount,
      paymentMethod = 'UPI',
      transactionReference,
      invoiceId,
      notes,
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Validation Error', message: 'Payment amount must be greater than zero.' });
    }

    if (!enterpriseId && invoiceId) {
      const inv = queryOne('SELECT enterprise_id FROM invoices WHERE id = ?', [invoiceId]);
      if (inv) enterpriseId = inv.enterprise_id;
    }

    if (!enterpriseId) {
      const primary = queryOne(`
        SELECT enterprise_id FROM invoices WHERE retailer_id = ? ORDER BY created_at DESC LIMIT 1
      `, [retailerId]) || queryOne(`
        SELECT enterprise_id FROM orders WHERE retailer_id = ? ORDER BY created_at DESC LIMIT 1
      `, [retailerId]) || queryOne(`
        SELECT id as enterprise_id FROM enterprise_profiles LIMIT 1
      `);
      if (primary) enterpriseId = primary.enterprise_id;
    }

    if (!enterpriseId) {
      return res.status(400).json({ error: 'Validation Error', message: 'No registered enterprise distributor found to receive payment.' });
    }

    const allocations = invoiceId ? [{ invoiceId, allocatedAmount: Number(amount) }] : undefined;

    const result = recordPaymentAndReconcile({
      enterpriseId,
      retailerId,
      amount,
      paymentMethod,
      transactionReference: transactionReference || `UPI-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      paymentDate: new Date().toISOString(),
      notes: notes || 'Paid via Retailer Portal Online Checkout',
      allocations,
      recordedByUserId: req.user.id,
    });

    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Payment Failed', message: err.message });
  }
});

export default router;

