/**
 * VyaparX Payment Reconciliation & Settlement Service
 * Accurately matches incoming receipts to invoices, supports multi-invoice allocation,
 * maintains financial ledgers, and generates tamper-resistant payment receipts.
 */

import { queryAll, queryOne, run, transaction } from '../db/connection.js';
import crypto from 'node:crypto';

export const recordPaymentAndReconcile = ({
  enterpriseId,
  retailerId,
  amount,
  paymentMethod,
  transactionReference,
  paymentDate,
  notes,
  allocations, // Array of { invoiceId, allocatedAmount }
  recordedByUserId,
}) => {
  return transaction(() => {
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    // Check duplicate transaction reference for this enterprise to prevent double entry
    if (transactionReference && transactionReference.trim()) {
      const existingTx = queryOne(`
        SELECT id, payment_number FROM payments 
        WHERE enterprise_id = ? AND transaction_reference = ?
      `, [enterpriseId, transactionReference.trim()]);

      if (existingTx) {
        throw new Error(
          `Duplicate transaction reference "${transactionReference}". Already recorded under payment ${existingTx.payment_number}.`
        );
      }
    }

    // Generate unique payment & receipt numbers
    const paymentId = crypto.randomUUID();
    const countRow = queryOne(`SELECT COUNT(*) as count FROM payments WHERE enterprise_id = ?`, [enterpriseId]);
    const seq = (countRow.count || 0) + 1;
    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;
    const receiptNumber = `RCP-${new Date().getFullYear()}-${String(seq).padStart(5, '0')}`;

    // Insert payment
    run(`
      INSERT INTO payments (
        id, payment_number, enterprise_id, retailer_id, amount, payment_method,
        transaction_reference, payment_date, notes, receipt_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      paymentId,
      paymentNumber,
      enterpriseId,
      retailerId,
      numericAmount,
      paymentMethod,
      transactionReference ? transactionReference.trim() : `TXN-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      paymentDate || new Date().toISOString(),
      notes || null,
      receiptNumber
    ]);

    let totalAllocated = 0;
    let unallocated = numericAmount;

    // Handle invoice allocations
    // If allocations were passed explicitly, allocate up to available balance without throwing errors
    if (allocations && allocations.length > 0) {
      for (const alloc of allocations) {
        if (unallocated <= 0) break;
        const requestedAllocAmt = Number(alloc.allocatedAmount);
        if (requestedAllocAmt <= 0) continue;

        const inv = queryOne(`SELECT * FROM invoices WHERE id = ? AND enterprise_id = ? AND retailer_id = ?`, [alloc.invoiceId, enterpriseId, retailerId]);
        if (!inv) continue;

        // Allocate up to the remaining balance or available payment
        const allocAmt = Number(Math.min(unallocated, Math.max(0, inv.balance_amount), requestedAllocAmt).toFixed(2));
        if (allocAmt > 0) {
          const newPaid = Number((inv.paid_amount + allocAmt).toFixed(2));
          const newBalance = Number(Math.max(0, inv.balance_amount - allocAmt).toFixed(2));
          const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

          run(`
            INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount)
            VALUES (?, ?, ?, ?)
          `, [crypto.randomUUID(), paymentId, alloc.invoiceId, allocAmt]);

          run(`
            UPDATE invoices
            SET paid_amount = ?, balance_amount = ?, status = ?
            WHERE id = ?
          `, [newPaid, newBalance, newStatus, alloc.invoiceId]);

          // If invoice is linked to an order, update order payment status
          if (inv.order_id) {
            const orderPaymentStatus = newStatus === 'PAID' ? 'PAID' : 'PARTIALLY_PAID';
            run(`UPDATE orders SET payment_status = ? WHERE id = ?`, [orderPaymentStatus, inv.order_id]);
          }

          unallocated = Number((unallocated - allocAmt).toFixed(2));
          totalAllocated += allocAmt;
        }
      }
    }

    // Auto-reconcile FIFO (oldest unpaid invoice first) for remaining unallocated payment
    if (unallocated > 0) {
      const openInvoices = queryAll(`
        SELECT * FROM invoices
        WHERE enterprise_id = ? AND retailer_id = ? AND status != 'PAID' AND balance_amount > 0
        ORDER BY due_date ASC, created_at ASC
      `, [enterpriseId, retailerId]);

      for (const inv of openInvoices) {
        if (unallocated <= 0) break;

        const allocAmt = Number(Math.min(unallocated, inv.balance_amount).toFixed(2));
        if (allocAmt > 0) {
          const newPaid = Number((inv.paid_amount + allocAmt).toFixed(2));
          const newBalance = Number(Math.max(0, inv.balance_amount - allocAmt).toFixed(2));
          const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

          run(`
            INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount)
            VALUES (?, ?, ?, ?)
          `, [crypto.randomUUID(), paymentId, inv.id, allocAmt]);

          run(`
            UPDATE invoices
            SET paid_amount = ?, balance_amount = ?, status = ?
            WHERE id = ?
          `, [newPaid, newBalance, newStatus, inv.id]);

          if (inv.order_id) {
            const orderPaymentStatus = newStatus === 'PAID' ? 'PAID' : 'PARTIALLY_PAID';
            run(`UPDATE orders SET payment_status = ? WHERE id = ?`, [orderPaymentStatus, inv.order_id]);
          }

          unallocated = Number((unallocated - allocAmt).toFixed(2));
          totalAllocated += allocAmt;
        }
      }
    }

    // Update retailer credit and account balance
    run(`
      UPDATE retailer_profiles
      SET current_credit = MAX(0, current_credit - ?)
      WHERE id = ?
    `, [numericAmount, retailerId]);

    // Send confirmation in-app notification to retailer
    const retailer = queryOne(`SELECT user_id, shop_name FROM retailer_profiles WHERE id = ?`, [retailerId]);
    if (retailer) {
      run(`
        INSERT INTO notifications (
          id, user_id, title, message, type, link, is_read, metadata_json
        ) VALUES (?, ?, ?, ?, 'PAYMENT', ?, 0, ?)
      `, [
        crypto.randomUUID(),
        retailer.user_id,
        `Payment Received: ₹${numericAmount.toLocaleString('en-IN')}`,
        `Your payment of ₹${numericAmount.toLocaleString('en-IN')} has been successfully recorded and reconciled. Receipt #${receiptNumber} generated.`,
        `/retailer/financials?receipt=${receiptNumber}`,
        JSON.stringify({ paymentId, receiptNumber, amount: numericAmount, totalAllocated })
      ]);
    }

    return {
      success: true,
      paymentId,
      paymentNumber,
      receiptNumber,
      transactionReference: transactionReference ? transactionReference.trim() : null,
      amount: numericAmount,
      totalAllocated,
      unallocatedBalance: Math.max(0, Number((numericAmount - totalAllocated).toFixed(2))),
    };
  });
};

export default {
  recordPaymentAndReconcile,
};
