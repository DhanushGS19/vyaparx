import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Bell,
  Receipt,
  FileText,
  CreditCard,
  Send,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Shield,
  MessageSquare,
  Mail,
  Calendar,
  Sparkles,
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { api } from '../../services/api';
import StatCard from '../common/StatCard';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export const Retailers360View = () => {
  const [retailers, setRetailers] = useState([]);
  const [selectedRetailerId, setSelectedRetailerId] = useState(null);
  const [profile360, setProfile360] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('OVERVIEW'); // 'OVERVIEW', 'INVOICES', 'PAYMENTS', 'REMINDERS', 'TIMELINE'

  // SEND REMINDER Modal
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    invoiceId: '',
    reminderType: 'OVERDUE_PAYMENT',
    dueDate: '',
    channel: 'ALL',
    customMessage: '',
  });
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState(null);

  // RECONCILIATION Modal (Record Payment)
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileForm, setReconcileForm] = useState({
    amount: '',
    paymentMethod: 'UPI',
    transactionReference: '',
    notes: 'Direct RTGS/UPI settlement',
  });
  const [reconcileLoading, setReconcileLoading] = useState(false);

  // Automated Schedules Config Modal
  const [isScheduleConfigOpen, setIsScheduleConfigOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    isEnabled: true,
    beforeDueDays: 3,
    onDueDate: true,
    afterDue3Days: true,
    afterDue7Days: true,
  });

  const fetchRetailers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.enterprise.getRetailers({ search });
      const list = res.retailers || [];
      setRetailers(list);
      if (list.length > 0 && !selectedRetailerId) {
        setSelectedRetailerId(list[0].id);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load retailer roster');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile360 = async (id) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await api.enterprise.getRetailer360(id);
      setProfile360(res);
      // Pre-select first open invoice for reminder modal
      const openInvs = (res.financialAccount?.invoices || []).filter(i => i.balance_amount > 0);
      if (openInvs.length > 0) {
        setReminderForm(prev => ({
          ...prev,
          invoiceId: openInvs[0].id,
          dueDate: openInvs[0].due_date?.slice(0, 10) || '',
        }));
      }
    } catch (e) {
      console.error(e);
      setProfileError(e.message || 'Failed to load 360° profile');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, [search]);

  useEffect(() => {
    if (selectedRetailerId) {
      fetchProfile360(selectedRetailerId);
    }
  }, [selectedRetailerId]);

  const handleSendReminder = async (e) => {
    e.preventDefault();
    setReminderLoading(true);
    setReminderSuccess(null);
    try {
      const res = await api.enterprise.sendReminder({
        retailerId: selectedRetailerId,
        invoiceId: reminderForm.invoiceId,
        reminderType: reminderForm.reminderType,
        dueDate: reminderForm.dueDate,
        channel: reminderForm.channel,
        customMessage: reminderForm.customMessage,
      });
      setReminderSuccess(res);
      setTimeout(() => {
        setIsReminderModalOpen(false);
        setReminderSuccess(null);
        fetchProfile360(selectedRetailerId);
      }, 1800);
    } catch (err) {
      alert(err.message || 'Failed to send payment reminder');
    } finally {
      setReminderLoading(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setReconcileLoading(true);
    try {
      await api.enterprise.reconcilePayment({
        retailerId: selectedRetailerId,
        amount: Number(reconcileForm.amount),
        paymentMethod: reconcileForm.paymentMethod,
        transactionReference: reconcileForm.transactionReference,
        notes: reconcileForm.notes,
      });
      setIsReconcileModalOpen(false);
      setReconcileForm({ amount: '', paymentMethod: 'UPI', transactionReference: '', notes: '' });
      fetchProfile360(selectedRetailerId);
      fetchRetailers();
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setReconcileLoading(false);
    }
  };

  const retailer = profile360?.retailer;
  const financialSummary = profile360?.financialAccount?.summary || {};
  const invoices = profile360?.financialAccount?.invoices || [];
  const payments = profile360?.financialAccount?.payments || [];
  const orders = profile360?.orderHistory?.orders || [];
  const reminders = profile360?.remindersHistory || [];
  const timeline = profile360?.accountTimeline || [];
  const demandProfile = profile360?.productDemandProfile || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Retailer 360° Account Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive digital accounts combining relationship history, credit balances, and payment recovery</p>
        </div>

        <button
          onClick={() => setIsScheduleConfigOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors self-start sm:self-auto"
        >
          <Calendar className="w-4 h-4" />
          <span>Automated Reminder Settings</span>
        </button>
      </div>

      {/* Main Grid: Retailer Selector (Left) & Retailer 360° Profile (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Retailer Roster */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-1.5" />
            <input
              type="text"
              placeholder="Search retailer by shop or owner name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs outline-none text-slate-800"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                <p className="text-xs">Loading retailer accounts...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-6 h-6 mx-auto text-rose-500 mb-2" />
                <p className="text-xs font-bold text-slate-800">{error}</p>
                <button
                  onClick={fetchRetailers}
                  className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
                >
                  Retry Loading
                </button>
              </div>
            ) : retailers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No Retailers Connected</p>
                <p className="text-[11px] text-slate-400 mt-1">Retailers who place wholesale orders will appear in your ledger roster.</p>
              </div>
            ) : (
              retailers.map((r) => {
                const isSelected = selectedRetailerId === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRetailerId(r.id)}
                    className={`p-4 cursor-pointer transition-all hover:bg-slate-50 flex items-start justify-between ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-slate-900">{r.shop_name}</p>
                      <p className="text-[11px] text-slate-500">{r.owner_name} • {r.city}</p>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        GSTIN: {r.gstin || 'Unregistered'}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className={`text-xs font-bold ${r.outstanding_dues > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        ₹{r.outstanding_dues?.toLocaleString('en-IN')}
                      </p>
                      <span className="text-[10px] text-slate-400 block">
                        {r.total_orders} Orders
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: 360° Comprehensive Profile */}
        <div className="lg:col-span-8 space-y-5">
          {profileLoading ? (
            <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
              <p className="text-xs text-slate-500 font-medium">Loading 360° Account Profile & Ledgers...</p>
            </div>
          ) : profileError ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Failed to Load Retailer Account</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">{profileError}</p>
              <button
                onClick={() => selectedRetailerId && fetchProfile360(selectedRetailerId)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Retry
              </button>
            </div>
          ) : !profile360 || !retailer ? (
            <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Retailer Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Select a retail partner from the left roster to view financial health, payment reminders, order history, and live ledger balances.</p>
            </div>
          ) : (
            <>
              {/* Profile Header Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{retailer.shop_name}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {retailer.relationship_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Proprietor: <span className="font-semibold text-slate-900">{retailer.owner_name}</span> • Phone: {retailer.phone}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      GSTIN: {retailer.gstin || 'Unregistered'} • State Code: {retailer.state_code}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {retailer.address}, {retailer.city}, {retailer.state} - {retailer.pincode}
                    </p>
                  </div>

                  {/* PROMINENT SEND REMINDER & RECONCILE BUTTONS */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setIsReminderModalOpen(true)}
                      className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-2 transition-all"
                    >
                      <Bell className="w-4 h-4 animate-bounce" />
                      <span>SEND REMINDER</span>
                    </button>

                    <button
                      onClick={() => setIsReconcileModalOpen(true)}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 transition-all"
                    >
                      <Receipt className="w-4 h-4" />
                      <span>Record Payment</span>
                    </button>
                  </div>
                </div>

                {/* Financial Health Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Purchases</span>
                    <span className="text-sm font-bold text-slate-900">₹{financialSummary.total_purchase_value?.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Payments</span>
                    <span className="text-sm font-bold text-emerald-600">₹{financialSummary.total_payments_received?.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Outstanding Dues</span>
                    <span className="text-sm font-bold text-rose-600">₹{financialSummary.total_outstanding_dues?.toLocaleString('en-IN')}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Credit Utilization</span>
                    <span className="text-sm font-bold text-purple-700">
                      {profile360.financialAccount?.creditUtilizationPercent}% of ₹{retailer.approved_credit_limit?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submodule Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200">
                {[
                  { id: 'OVERVIEW', label: 'Order History & Purchasing', icon: Clock },
                  { id: 'INVOICES', label: `Invoices (${invoices.length})`, icon: FileText },
                  { id: 'PAYMENTS', label: `Payment Ledger (${payments.length})`, icon: CreditCard },
                  { id: 'REMINDERS', label: `Reminder Logs (${reminders.length})`, icon: Bell },
                  { id: 'TIMELINE', label: 'Activity Timeline', icon: TrendingUp },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Submodule Tab Content */}
              {activeTab === 'OVERVIEW' && (
                <div className="space-y-4">
                  {/* Frequently Purchased Items */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Frequently Purchased Wholesale Products
                    </h3>
                    <div className="divide-y divide-slate-100">
                      {demandProfile.frequentlyPurchased?.map((prod) => (
                        <div key={prod.product_id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">{prod.product_name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">SKU: {prod.sku} • {prod.category_name}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-blue-700">{prod.total_quantity_purchased} Units</span>
                            <span className="text-[10px] text-slate-400 block">Total Spend: ₹{prod.total_spent?.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Orders List */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                      Orders History
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 border-b">
                          <tr>
                            <th className="p-2">Order ID</th>
                            <th className="p-2">Date</th>
                            <th className="p-2">Total Amount</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Payment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {orders.map(o => (
                            <tr key={o.id}>
                              <td className="p-2 font-bold font-mono text-slate-900">{o.order_number}</td>
                              <td className="p-2 text-slate-500">{new Date(o.created_at).toLocaleDateString()}</td>
                              <td className="p-2 font-bold">₹{o.total_amount?.toLocaleString('en-IN')}</td>
                              <td className="p-2"><StatusBadge status={o.status} /></td>
                              <td className="p-2 font-semibold text-[11px]">{o.payment_status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'INVOICES' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b font-semibold">
                      <tr>
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3 text-right">Invoice Total</th>
                        <th className="p-3 text-right">Balance Due</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.map(inv => (
                        <tr key={inv.id}>
                          <td className="p-3 font-bold font-mono text-slate-900">{inv.invoice_number}</td>
                          <td className="p-3 text-slate-600">{new Date(inv.due_date).toLocaleDateString()}</td>
                          <td className="p-3 text-right font-semibold">₹{inv.total_amount?.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-bold text-rose-600">₹{inv.balance_amount?.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-center"><StatusBadge status={inv.current_status} /></td>
                          <td className="p-3 text-right">
                            {inv.balance_amount > 0 && (
                              <button
                                onClick={() => {
                                  setReminderForm(prev => ({
                                    ...prev,
                                    invoiceId: inv.id,
                                    dueDate: inv.due_date?.slice(0, 10) || '',
                                  }));
                                  setIsReminderModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs"
                              >
                                Remind
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'PAYMENTS' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b font-semibold">
                      <tr>
                        <th className="p-3">Payment No</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3">UTR / Ref</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td className="p-3 font-bold font-mono text-slate-900">{p.payment_number}</td>
                          <td className="p-3 text-slate-600">{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td className="p-3 font-semibold text-slate-700">{p.payment_method}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-500">{p.transaction_reference}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">₹{p.amount?.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-mono text-[11px] text-blue-600 font-semibold">{p.receipt_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'REMINDERS' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b font-semibold">
                      <tr>
                        <th className="p-3">Reminder Ref</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Invoice</th>
                        <th className="p-3">Channel</th>
                        <th className="p-3">Dispatched At</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reminders.map(r => (
                        <tr key={r.id}>
                          <td className="p-3 font-mono font-bold text-slate-900">{r.reminder_number}</td>
                          <td className="p-3 font-semibold text-slate-800">{r.reminder_type}</td>
                          <td className="p-3 font-mono text-blue-600 font-semibold">{r.invoice_number}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold text-slate-700">
                              {r.channel}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500">{new Date(r.sent_at).toLocaleString()}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {r.delivery_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'TIMELINE' && (
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account History Timeline</h3>
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                    {timeline.map((act, idx) => (
                      <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                        <span className={`absolute left-2 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                          act.type === 'PAYMENT' ? 'bg-emerald-600' :
                          act.type === 'REMINDER' ? 'bg-rose-600' : 'bg-blue-600'
                        }`} />
                        <div className="flex-1 flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-800">{act.title}</p>
                            <span className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleString()}</span>
                          </div>
                          {act.amount && (
                            <span className="font-bold text-slate-900">₹{act.amount?.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SEND REMINDER MODAL */}
      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title="Send Payment Reminder"
        subtitle={`Dispatch formal settlement notice to ${retailer?.shop_name}`}
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsReminderModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="reminder-form"
              onClick={handleSendReminder}
              disabled={reminderLoading}
              className="px-5 py-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 text-white rounded-xl shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{reminderLoading ? 'Transmitting Notice...' : 'Dispatch Reminder Now'}</span>
            </button>
          </div>
        }
      >
        <form id="reminder-form" onSubmit={handleSendReminder} className="space-y-4">
          {reminderSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Reminder confirmed & dispatched! Delivery reference: {reminderSuccess.deliveryProviderRef}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Outstanding Invoice *</label>
            <select
              required
              value={reminderForm.invoiceId}
              onChange={(e) => {
                const inv = invoices.find(i => i.id === e.target.value);
                setReminderForm({
                  ...reminderForm,
                  invoiceId: e.target.value,
                  dueDate: inv?.due_date?.slice(0, 10) || reminderForm.dueDate,
                });
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
            >
              <option value="">-- Choose Invoice with Pending Balance --</option>
              {invoices.filter(i => i.balance_amount > 0).map(i => (
                <option key={i.id} value={i.id}>
                  {i.invoice_number} — Due: ₹{i.balance_amount?.toLocaleString('en-IN')} (Maturity: {new Date(i.due_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reminder Category *</label>
              <select
                value={reminderForm.reminderType}
                onChange={(e) => setReminderForm({ ...reminderForm, reminderType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              >
                <option value="UPCOMING_PAYMENT">Upcoming Payment (Gentle)</option>
                <option value="PAYMENT_DUE">Payment Due Today</option>
                <option value="OVERDUE_PAYMENT">Overdue Payment Alert</option>
                <option value="FINAL_REMINDER">Final Notice (Credit Hold Warning)</option>
                <option value="CUSTOM_REMINDER">Custom Personalized Notice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notification Channel *</label>
              <select
                value={reminderForm.channel}
                onChange={(e) => setReminderForm({ ...reminderForm, channel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              >
                <option value="ALL">All Channels (In-App + Email + WhatsApp)</option>
                <option value="IN_APP">In-App Notification Only</option>
                <option value="WHATSAPP">WhatsApp Business Notification</option>
                <option value="EMAIL">Email Dispatch</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Personalized Settlement Message (Optional)</label>
            <textarea
              rows={3}
              value={reminderForm.customMessage}
              onChange={(e) => setReminderForm({ ...reminderForm, customMessage: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              placeholder="Leave blank to use the standardized compliant notification template with banking details..."
            />
          </div>
        </form>
      </Modal>

      {/* RECORD PAYMENT & RECONCILE MODAL */}
      <Modal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        title="Record Payment & Auto-Reconcile"
        subtitle={`Match remittance to open invoices for ${retailer?.shop_name}`}
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsReconcileModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="reconcile-form"
              onClick={handleRecordPayment}
              disabled={reconcileLoading}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{reconcileLoading ? 'Recording...' : 'Reconcile & Issue Receipt'}</span>
            </button>
          </div>
        }
      >
        <form id="reconcile-form" onSubmit={handleRecordPayment} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Received Payment Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={reconcileForm.amount}
              onChange={(e) => setReconcileForm({ ...reconcileForm, amount: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none"
              placeholder="e.g. 25000.00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={reconcileForm.paymentMethod}
              onChange={(e) => setReconcileForm({ ...reconcileForm, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
            >
              <option value="UPI">UPI Remittance</option>
              <option value="NEFT_RTGS">NEFT / RTGS Bank Transfer</option>
              <option value="NET_BANKING">Net Banking</option>
              <option value="CHEQUE">Bank Cheque</option>
              <option value="CASH">Cash Deposit</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction UTR / Reference No. *</label>
            <input
              type="text"
              required
              value={reconcileForm.transactionReference}
              onChange={(e) => setReconcileForm({ ...reconcileForm, transactionReference: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none"
              placeholder="e.g. HDFC-RTGS-99882211"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Settlement Notes</label>
            <input
              type="text"
              value={reconcileForm.notes}
              onChange={(e) => setReconcileForm({ ...reconcileForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
            />
          </div>
        </form>
      </Modal>

      {/* Automated Schedules Config Modal */}
      <Modal
        isOpen={isScheduleConfigOpen}
        onClose={() => setIsScheduleConfigOpen(false)}
        title="Configure Automated Payment Reminders"
        subtitle="Set standard automated notification cadences across all connected kiranas"
        maxWidth="max-w-md"
        footer={
          <button
            onClick={() => setIsScheduleConfigOpen(false)}
            className="px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-sm"
          >
            Save Cadence Rules
          </button>
        }
      >
        <div className="space-y-3 text-xs">
          <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={scheduleConfig.isEnabled}
              onChange={(e) => setScheduleConfig({ ...scheduleConfig, isEnabled: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <span className="font-bold text-slate-800">Enable Automated Scheduled Reminders</span>
          </label>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <p className="font-semibold text-slate-700">Trigger Cadence:</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleConfig.beforeDueDays === 3}
                onChange={() => {}}
                className="rounded text-blue-600 w-3.5 h-3.5"
              />
              <span>3 Days Before Due Date (Upcoming Notice)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleConfig.onDueDate}
                onChange={() => {}}
                className="rounded text-blue-600 w-3.5 h-3.5"
              />
              <span>On Due Date (Payment Due Notice)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleConfig.afterDue3Days}
                onChange={() => {}}
                className="rounded text-blue-600 w-3.5 h-3.5"
              />
              <span>3 Days After Due Date (Overdue Alert)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleConfig.afterDue7Days}
                onChange={() => {}}
                className="rounded text-blue-600 w-3.5 h-3.5"
              />
              <span>7 Days After Due Date (Credit Suspension Warning)</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Retailers360View;

