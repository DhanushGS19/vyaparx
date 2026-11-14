import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  Truck,
  Eye,
  AlertCircle,
  Check,
  ChevronRight,
  Printer,
  Download,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export const OrdersView = ({ initialOrderId = null, onNavigateToDispatch }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Selected Order for Drawer / Detail Modal
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Reject Modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('Capacity or logistics constraint');

  // Invoice Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.enterprise.getOrders({
        status: statusFilter,
        search,
      });
      setOrders(res.orders || []);
      if (initialOrderId && !selectedOrderId) {
        setSelectedOrderId(initialOrderId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (id) => {
    setDetailsLoading(true);
    try {
      const res = await api.enterprise.getOrderDetails(id);
      setSelectedOrderDetails(res);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, search]);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetails(selectedOrderId);
    }
  }, [selectedOrderId]);

  const handleAcceptOrder = async (id) => {
    try {
      await api.enterprise.acceptOrder(id);
      fetchOrders();
      fetchOrderDetails(id);
    } catch (err) {
      alert(err.message || 'Failed to accept order');
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrderId) return;
    try {
      await api.enterprise.rejectOrder(selectedOrderId, rejectReason);
      setIsRejectModalOpen(false);
      fetchOrders();
      fetchOrderDetails(selectedOrderId);
    } catch (err) {
      alert(err.message || 'Failed to reject order');
    }
  };

  const handleProcessOrder = async (id) => {
    try {
      await api.enterprise.processOrder(id);
      fetchOrders();
      fetchOrderDetails(id);
    } catch (err) {
      alert(err.message || 'Failed to process order');
    }
  };

  const handleDeliverOrder = async (id) => {
    try {
      await api.enterprise.deliverOrder(id);
      fetchOrders();
      fetchOrderDetails(id);
    } catch (err) {
      alert(err.message || 'Failed to mark delivered');
    }
  };

  const order = selectedOrderDetails?.order;
  const items = selectedOrderDetails?.items || [];
  const dispatches = selectedOrderDetails?.dispatches || [];
  const invoice = selectedOrderDetails?.invoice;
  const timeline = selectedOrderDetails?.timeline || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wholesale Order Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Accept orders, reserve warehouse stock, issue tax invoices, and track dispatches</p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          {['ALL', 'NEW', 'ACCEPTED', 'PROCESSING', 'PARTIALLY_DISPATCHED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Orders List & Order Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Orders List (5 cols or full if no selection) */}
        <div className={`${selectedOrderId ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="Search by order ID or retailer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs outline-none py-1 text-slate-800"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading wholesale orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No orders match your search criteria.
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => setSelectedOrderId(o.id)}
                  className={`p-4 cursor-pointer transition-all hover:bg-slate-50 flex items-start justify-between ${
                    selectedOrderId === o.id ? 'bg-blue-50/50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{o.order_number}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{o.shop_name}</p>
                    <p className="text-[11px] text-slate-400">{o.retailer_city} • {o.item_count} items</p>
                    <span className="text-[10px] text-slate-400 block">
                      Ordered: {new Date(o.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">₹{o.total_amount?.toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] font-semibold uppercase ${
                      o.payment_status === 'PAID' ? 'text-emerald-600' :
                      o.payment_status === 'PARTIALLY_PAID' ? 'text-amber-600' : 'text-slate-400'
                    }`}>
                      {o.payment_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Order Details Panel */}
        {selectedOrderId && (
          <div className="lg:col-span-7 space-y-4">
            {detailsLoading || !order ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
                {/* Header & Primary Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{order.order_number}</h2>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-slate-500">
                      Placed on {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Contextual Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {order.status === 'NEW' && (
                      <>
                        <button
                          onClick={() => handleAcceptOrder(order.id)}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-600/30 flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Accept & Reserve Stock</span>
                        </button>
                        <button
                          onClick={() => setIsRejectModalOpen(true)}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {order.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleProcessOrder(order.id)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm"
                      >
                        Start Processing
                      </button>
                    )}

                    {(order.status === 'ACCEPTED' || order.status === 'PROCESSING' || order.status === 'PARTIALLY_DISPATCHED') && (
                      <button
                        onClick={() => onNavigateToDispatch && onNavigateToDispatch(order.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 flex items-center gap-1.5"
                      >
                        <Truck className="w-4 h-4" />
                        <span>Dispatch Products</span>
                      </button>
                    )}

                    {order.status === 'DISPATCHED' && (
                      <button
                        onClick={() => handleDeliverOrder(order.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
                      >
                        Mark Delivered
                      </button>
                    )}

                    {invoice && (
                      <button
                        onClick={() => setIsInvoiceModalOpen(true)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4" />
                        <span>View Invoice</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Retailer & Shipping Address Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Retailer Details</span>
                    <p className="font-bold text-slate-900">{order.shop_name}</p>
                    <p className="text-slate-600">{order.owner_name} • {order.retailer_phone}</p>
                    <p className="text-slate-500 font-mono text-[11px] mt-0.5">GSTIN: {order.retailer_gstin || 'Unregistered'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Delivery Address & Instructions</span>
                    <p className="text-slate-700">{order.shipping_address}</p>
                    {order.delivery_instructions && (
                      <p className="text-blue-700 font-medium mt-1 bg-blue-50 p-1.5 rounded border border-blue-100">
                        Note: {order.delivery_instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ordered Items Table */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Ordered Products Breakdown</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Product</th>
                          <th className="py-2.5 px-3 text-center">Ordered</th>
                          <th className="py-2.5 px-3 text-center">Dispatched</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">GST</th>
                          <th className="py-2.5 px-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2.5 px-3">
                              <p className="font-semibold text-slate-900">{item.product_name}</p>
                              <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`font-semibold ${
                                item.dispatched_quantity >= item.quantity ? 'text-emerald-600' :
                                item.dispatched_quantity > 0 ? 'text-amber-600' : 'text-slate-400'
                              }`}>
                                {item.dispatched_quantity || 0}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">₹{item.base_price}</td>
                            <td className="py-2.5 px-3 text-right text-slate-500">₹{item.gst_amount} ({item.gst_rate}%)</td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">₹{item.total_price?.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Totals */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-end gap-1 text-xs">
                    <div className="flex justify-between w-48 text-slate-600">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{order.subtotal?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between w-48 text-slate-600">
                      <span>Total GST:</span>
                      <span className="font-semibold">₹{order.gst_amount?.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between w-48 text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                      <span>Grand Total:</span>
                      <span className="text-blue-700">₹{order.total_amount?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Dispatches for this order */}
                {dispatches.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Shipments & Dispatches</h3>
                    <div className="space-y-2">
                      {dispatches.map((d) => (
                        <div key={d.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{d.dispatch_number}</span>
                              <StatusBadge status={d.status} />
                            </div>
                            <p className="text-slate-500 text-[11px] mt-0.5">
                              Carrier: {d.transporter_name} • LR: {d.waybill_number || 'N/A'} • Tracking: {d.tracking_number}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {new Date(d.dispatch_date).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Order Activity Timeline</h3>
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                    {timeline.map((evt, idx) => (
                      <div key={idx} className="relative flex items-start gap-3 pl-6 text-xs">
                        <span className="absolute left-2 top-1.5 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                        <div>
                          <p className="font-bold text-slate-800">{evt.event}</p>
                          {evt.details && <p className="text-[11px] text-slate-500">{evt.details}</p>}
                          <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reject Order Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Wholesale Order"
        subtitle="Specify a reason for declining this retailer purchase order"
        footer={
          <>
            <button
              onClick={() => setIsRejectModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectOrder}
              className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-sm"
            >
              Confirm Rejection
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-700">Select Rejection Reason</label>
          <select
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
          >
            <option value="Temporary stockout across ordered SKUs">Temporary stockout across ordered SKUs</option>
            <option value="Logistics/Transporter unavailable for this delivery route">Logistics/Transporter unavailable for this delivery route</option>
            <option value="Retailer credit limit exhausted / pending overdue payment">Retailer credit limit exhausted / pending overdue payment</option>
            <option value="Requested delivery timeframe cannot be satisfied">Requested delivery timeframe cannot be satisfied</option>
          </select>
        </div>
      </Modal>

      {/* Tax Invoice Modal */}
      {invoice && (
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title={`Tax Invoice #${invoice.invoice_number}`}
          subtitle="Official GST Invoicing Document"
          maxWidth="max-w-3xl"
          footer={
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tax Invoice</span>
            </button>
          }
        >
          <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs space-y-4">
            <div className="flex justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">TAX INVOICE</h4>
                <p className="text-[11px] text-slate-500">Invoice No: {invoice.invoice_number}</p>
                <p className="text-[11px] text-slate-500">Dated: {new Date(invoice.created_at).toLocaleDateString()}</p>
                <p className="text-[11px] text-slate-500">Payment Due: {new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={invoice.status} />
                <p className="text-[11px] text-slate-500 mt-1">Order Ref: {order?.order_number}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <p className="font-bold text-slate-800 uppercase">Bill From (Supplier):</p>
                <p className="font-semibold text-slate-900">Apex National Distributing Ltd</p>
                <p className="text-slate-500">GSTIN: 27AAACA1234A1Z5</p>
                <p className="text-slate-500">Bhiwandi Logistics Hub, Thane, MH</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 uppercase">Bill To (Retailer):</p>
                <p className="font-semibold text-slate-900">{order?.shop_name}</p>
                <p className="text-slate-500">GSTIN: {order?.retailer_gstin || 'Unregistered'}</p>
                <p className="text-slate-500">{order?.shipping_address}</p>
              </div>
            </div>

            <table className="w-full text-left border text-[11px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-2">Item</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-right">Taxable Val</th>
                  <th className="p-2 text-right">CGST</th>
                  <th className="p-2 text-right">SGST</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((it) => (
                  <tr key={it.id}>
                    <td className="p-2 font-medium">{it.product_name}</td>
                    <td className="p-2 text-center">{it.quantity}</td>
                    <td className="p-2 text-right">₹{it.base_price * it.quantity}</td>
                    <td className="p-2 text-right">₹{(it.gst_amount / 2).toFixed(2)}</td>
                    <td className="p-2 text-right">₹{(it.gst_amount / 2).toFixed(2)}</td>
                    <td className="p-2 text-right font-bold">₹{it.total_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center pt-2 font-bold text-sm">
              <span>Invoice Total (INR):</span>
              <span className="text-blue-700">₹{invoice.total_amount?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrdersView;

