import express from 'express';
import { queryAll, queryOne, run } from '../../db/connection.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireEnterprise, logAudit } from '../../middleware/rbac.js';
import { sendPaymentReminder, REMINDER_TYPES } from '../../services/reminderService.js';

const router = express.Router();
router.use(authenticateToken, requireEnterprise);

// List payment reminders
router.get('/', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const reminders = queryAll(`
      SELECT 
        pr.*,
        r.shop_name, r.owner_name, r.phone as retailer_phone,
        i.invoice_number, i.balance_amount as current_invoice_balance
      FROM payment_reminders pr
      JOIN retailer_profiles r ON pr.retailer_id = r.id
      JOIN invoices i ON pr.invoice_id = i.id
      WHERE pr.enterprise_id = ?
      ORDER BY pr.sent_at DESC
    `, [enterpriseId]);

    const reminderConfig = queryOne(`SELECT * FROM reminder_configs WHERE enterprise_id = ?`, [enterpriseId]);

    return res.json({
      success: true,
      reminders,
      reminderTypes: REMINDER_TYPES,
      config: reminderConfig,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

// Send payment reminder (Manual trigger from SEND REMINDER button)
router.post('/send', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const {
      retailerId,
      invoiceId,
      reminderType,
      dueDate,
      channel = 'IN_APP',
      customMessage
    } = req.body;

    if (!retailerId || !invoiceId || !reminderType) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Retailer ID, Invoice ID, and Reminder Type are mandatory.'
      });
    }

    const result = sendPaymentReminder({
      enterpriseId,
      retailerId,
      invoiceId,
      reminderType,
      dueDate,
      channel,
      customMessage,
      scheduleType: 'MANUAL',
    });

    logAudit(req.user.id, 'SEND_PAYMENT_REMINDER', 'REMINDER', result.reminderId, {
      retailerId,
      invoiceId,
      reminderType,
      channel
    }, enterpriseId);

    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'Reminder Failed', message: err.message });
  }
});

// Update automated schedule settings
router.put('/config', (req, res) => {
  try {
    const enterpriseId = req.enterpriseId;
    const { isEnabled, beforeDueDays, onDueDate, afterDue3Days, afterDue7Days, channels } = req.body;

    run(`
      UPDATE reminder_configs
      SET is_enabled = COALESCE(?, is_enabled),
          before_due_days = COALESCE(?, before_due_days),
          on_due_date = COALESCE(?, on_due_date),
          after_due_3_days = COALESCE(?, after_due_3_days),
          after_due_7_days = COALESCE(?, after_due_7_days),
          channels = COALESCE(?, channels),
          updated_at = CURRENT_TIMESTAMP
      WHERE enterprise_id = ?
    `, [
      isEnabled !== undefined ? (isEnabled ? 1 : 0) : null,
      beforeDueDays !== undefined ? Number(beforeDueDays) : null,
      onDueDate !== undefined ? (onDueDate ? 1 : 0) : null,
      afterDue3Days !== undefined ? (afterDue3Days ? 1 : 0) : null,
      afterDue7Days !== undefined ? (afterDue7Days ? 1 : 0) : null,
      channels ? (typeof channels === 'string' ? channels : JSON.stringify(channels)) : null,
      enterpriseId
    ]);

    const updated = queryOne(`SELECT * FROM reminder_configs WHERE enterprise_id = ?`, [enterpriseId]);
    return res.json({ success: true, config: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Server Error', message: err.message });
  }
});

export default router;

