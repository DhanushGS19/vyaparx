import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CreditCard,
  Bell,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { api } from '../../services/api';
import StatCard from '../common/StatCard';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export const FinancialsView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INVOICES'); // 'INVOICES', 'PAYMENTS', 'REMINDERS'

  // Pay Online Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState('');
  const [payForm, setPayForm] = useState({
    amount: '',
    paymentMethod: 'UPI',
    transactionReference: '',
    notes: 'Paid via Retailer Portal UPI Simulation',
  });
  const [payLoading, setPayLoading] = useState(false);

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const res = await api.retailer.getFinancials();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, []);

  const handleAcknowledgeReminder = async (reminderId) => {
    try {
      await api.retailer.acknowledgeReminder(reminderId);
      fetchFinancials();
    } catch (e) {
      alert('Failed to acknowledge reminder');
    }
  };

  const handleOpenPay = (invoice) => {
    setSelectedInvoice(invoice);
    setSelectedEnterpriseId(invoice?.enterprise_id || '');
    setPayForm({
      amount: invoice && invoice.balance_amount > 0 ? invoice.balance_amount : '',
      paymentMethod: 'UPI',
      transactionReference: `UPI-${Date.now().toString().slice(-8)}`,
      notes: invoice ? `Settlement for Invoice #${invoice.invoice_number}` : 'Custom Settlement',
    });
    setIsPayModalOpen(true);
  };

  const handleOpenCustomPay = () => {
    setSelectedInvoice(null);
    const defaultEntId = data?.suppliers?.[0]?.id || data?.invoices?.[0]?.enterprise_id || '';
    setSelectedEnterpriseId(defaultEntId);
    setPayForm({
      amount: '',
      paymentMethod: 'UPI',
      transactionReference: `UPI-${Date.now().toString().slice(-8)}`,
      notes: 'Custom Account Payment / Advance Settlement',
    });
    setIsPayModalOpen(true);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    const amt = Number(payForm.amount);
    if (!amt || amt <= 0) {
      alert('Please enter a valid payment amount greater than ₹0');
      return;
    }

    const enterpriseId = selectedInvoice?.enterprise_id || selectedEnterpriseId || data?.suppliers?.[0]?.id || data?.invoices?.[0]?.enterprise_id;
    if (!enterpriseId) {
      alert('Please select a distributor to receive payment.');
      return;
    }

    setPayLoading(true);
    try {
      await api.retailer.payOnline({
        enterpriseId,
        invoiceId: selectedInvoice ? selectedInvoice.id : undefined,
        amount: amt,
        paymentMethod: payForm.paymentMethod,
        transactionReference: payForm.transactionReference,
        notes: payForm.notes,
      });

      setIsPayModalOpen(false);
      fetchFinancials();
    } catch (err) {
      alert(err.message || 'Payment simulation failed');
    } finally {
      setPayLoading(false);
    }
  };

  const summary = data?.summary || {};
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];
  const reminders = data?.reminders || [];
  const suppliers = data?.suppliers || Array.from(
    new Map(invoices.map(inv => [inv.enterprise_id, { id: inv.enterprise_id, company_name: inv.supplier_name }])).values()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Retailer Financial Ledger & Settlements</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track supplier invoices, payments, credit obligations, and official receipts</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCustomPay}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay Custom Amount</span>
          </button>
          <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-100 text-slate-700">
            GST Verified Accounts
          </span>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Lifetime Purchases"
          value={`₹${(summary.total_purchases || 0).toLocaleString('en-IN')}`}
          icon={Receipt}
          color="slate"
        />
        <StatCard
          title="Total Payments Remitted"
          value={`₹${(summary.total_payments_made || 0).toLocaleString('en-IN')}`}
          icon={CheckCircle}
          color="emerald"
        />
        <StatCard
          title="Outstanding Balances"
          value={`₹${(summary.total_outstanding_dues || 0).toLocaleString('en-IN')}`}
          icon={AlertCircle}
          color={summary.overdue_payments > 0 ? 'rose' : 'amber'}
        />
        <StatCard
          title="Overdue Dues"
          value={`₹${(summary.overdue_payments || 0).toLocaleString('en-IN')}`}
          icon={Clock}
          color="rose"
          subvalue="Past agreed settlement due date"
        />
      </div>

      {/* Reminders Alert Box (if unacknowledged) */}
      {reminders.some(r => !r.acknowledged_at) && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
            <Bell className="w-4 h-4 animate-bounce" />
            <span>Supplier Payment Notices Requiring Acknowledgment</span>
          </div>

          <div className="space-y-2">
            {reminders.filter(r => !r.acknowledged_at).map(r => (
              <div key={r.id} className="p-3 bg-white rounded-xl border border-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{r.supplier_name}</span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                      {r.reminder_type}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">{r.message}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleAcknowledgeReminder(r.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => {
                      const targetInv = invoices.find(i => i.id === r.invoice_id);
                      if (targetInv) handleOpenPay(targetInv);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-sm"
                  >
                    Pay Invoice Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'INVOICES', label: `Wholesale Invoices (${invoices.length})`, icon: FileText },
          { id: 'PAYMENTS', label: `Remittance History (${payments.length})`, icon: CreditCard },
          { id: 'REMINDERS', label: `Payment Reminders Archive (${reminders.length})`, icon: Bell },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b font-semibold">
                <tr>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Distributor</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Invoice Total</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="p-3 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{inv.supplier_name}</p>
                      <span className="text-[10px] text-slate-400">Bank: {inv.bank_name || 'N/A'}</span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {new Date(inv.due_date).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right font-semibold">₹{inv.total_amount?.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold text-rose-600">
                      ₹{inv.balance_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="p-3 text-right">
                      {inv.balance_amount > 0 ? (
                        <button
                          onClick={() => handleOpenPay(inv)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
                        >
                          Pay Online
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <span className="text-emerald-700 font-bold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Settled</span>
                          </span>
                          <button
                            onClick={() => handleOpenPay(inv)}
                            title="Make custom payment against this supplier"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                          >
                            Pay Custom
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Payments */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold">
              <tr>
                <th className="p-3">Payment No</th>
                <th className="p-3">Distributor</th>
                <th className="p-3">Remittance Date</th>
                <th className="p-3">Method</th>
                <th className="p-3">Transaction UTR</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Official Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map(p => (
                <tr key={p.id}>
                  <td className="p-3 font-mono font-bold text-slate-900">{p.payment_number}</td>
                  <td className="p-3 font-semibold text-slate-800">{p.supplier_name}</td>
                  <td className="p-3 text-slate-500">{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td className="p-3 font-semibold text-slate-700">{p.payment_method}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500">{p.transaction_reference}</td>
                  <td className="p-3 text-right font-bold text-emerald-600">₹{p.amount?.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right font-mono font-semibold text-blue-600">{p.receipt_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Reminders Archive */}
      {activeTab === 'REMINDERS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold">
              <tr>
                <th className="p-3">Notice Ref</th>
                <th className="p-3">Distributor</th>
                <th className="p-3">Invoice Ref</th>
                <th className="p-3 text-right">Amount Due</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reminders.map(r => (
                <tr key={r.id}>
                  <td className="p-3 font-mono font-bold text-slate-900">{r.reminder_number}</td>
                  <td className="p-3 font-semibold text-slate-800">{r.supplier_name}</td>
                  <td className="p-3 font-mono text-blue-600">{r.invoice_number}</td>
                  <td className="p-3 text-right font-bold text-rose-600">₹{r.amount_due?.toLocaleString('en-IN')}</td>
                  <td className="p-3">{r.reminder_type}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {r.acknowledged_at ? 'Acknowledged' : 'Delivered'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pay Online / Custom Settlement Modal */}
      {isPayModalOpen && (
        <Modal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          title={selectedInvoice ? `Settle Invoice #${selectedInvoice.invoice_number}` : 'Make Custom Payment'}
          subtitle={
            selectedInvoice
              ? `Pay to ${selectedInvoice.supplier_name}`
              : 'Direct settlement to wholesale distributor ledger'
          }
          maxWidth="max-w-md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="pay-form"
                disabled={payLoading || !payForm.amount || Number(payForm.amount) <= 0}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-sm cursor-pointer"
              >
                {payLoading ? 'Processing Settlement...' : `Confirm Payment of ₹${payForm.amount || '0'}`}
              </button>
            </>
          }
        >
          <form id="pay-form" onSubmit={handleProcessPayment} className="space-y-3">
            {/* Distributor selector if no specific invoice was pre-selected */}
            {!selectedInvoice && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Wholesale Distributor *</label>
                <select
                  value={selectedEnterpriseId}
                  onChange={(e) => setSelectedEnterpriseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none"
                  required
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.company_name} {s.city ? `(${s.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected invoice summary */}
            {selectedInvoice && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Total:</span>
                  <span className="font-semibold text-slate-900">₹{selectedInvoice.total_amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Due:</span>
                  <span className={`font-bold ${selectedInvoice.balance_amount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{selectedInvoice.balance_amount?.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {/* Settled info banner */}
            {selectedInvoice && selectedInvoice.balance_amount <= 0 && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">This Invoice is Fully Settled (₹0 Due)</p>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    You can pay any custom amount. Your payment will be credited directly to your account ledger and automatically applied towards your other open supplier dues.
                  </p>
                </div>
              </div>
            )}

            {/* Smart allocation notice if paying more than remaining invoice balance */}
            {selectedInvoice && selectedInvoice.balance_amount > 0 && Number(payForm.amount) > selectedInvoice.balance_amount && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Smart Allocation</p>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    ₹{selectedInvoice.balance_amount.toLocaleString('en-IN')} settles this invoice. The excess ₹{(Number(payForm.amount) - selectedInvoice.balance_amount).toLocaleString('en-IN')} will be credited and applied to your other open supplier dues (FIFO).
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Payment Amount (₹) *</label>
                {selectedInvoice && selectedInvoice.balance_amount > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayForm({ ...payForm, amount: selectedInvoice.balance_amount })}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                  >
                    Exact Due: ₹{selectedInvoice.balance_amount.toLocaleString('en-IN')}
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="Enter custom amount (e.g. 234)"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-base font-bold text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Quick amount chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] text-slate-400 font-semibold">Quick Amounts:</span>
                {[234, 500, 1000, 2500, 5000].map((quickAmt) => (
                  <button
                    key={quickAmt}
                    type="button"
                    onClick={() => setPayForm({ ...payForm, amount: quickAmt })}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                      Number(payForm.amount) === quickAmt
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                    }`}
                  >
                    ₹{quickAmt}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Custom amounts and partial settlements fully supported without limit</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Channel *</label>
              <select
                value={payForm.paymentMethod}
                onChange={(e) => setPayForm({ ...payForm, paymentMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              >
                <option value="UPI">Direct UPI (Google Pay / PhonePe / BHIM)</option>
                <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
                <option value="NET_BANKING">Net Banking Portal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Simulated Reference / UTR Number *</label>
              <input
                type="text"
                required
                value={payForm.transactionReference}
                onChange={(e) => setPayForm({ ...payForm, transactionReference: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none"
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default FinancialsView;

