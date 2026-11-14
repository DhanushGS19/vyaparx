import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Truck,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  Package,
  RotateCcw,
  CheckCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { api } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export const MyOrdersView = ({ onReorder }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.retailer.getOrders({ search });
      setOrders(res.orders || []);
      if (res.orders?.length > 0 && !selectedOrderId) {
        setSelectedOrderId(res.orders[0].id);
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
      const res = await api.retailer.getOrderDetails(id);
      setOrderDetails(res);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search]);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetails(selectedOrderId);
    }
  }, [selectedOrderId]);

  const order = orderDetails?.order;
  const items = orderDetails?.items || [];
  const dispatches = orderDetails?.dispatches || [];
  const invoice = orderDetails?.invoice;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Wholesale Orders & Tracking</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time status updates, delivery challans, and tax invoice records</p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by order ID or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Orders List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[700px] overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No orders placed yet.
              </div>
            ) : (
              orders.map((o) => {
                const isSelected = selectedOrderId === o.id;
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`p-4 cursor-pointer transition-all hover:bg-slate-50 flex items-start justify-between ${
                      isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 font-mono">{o.order_number}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">{o.supplier_name}</p>
                      <p className="text-[11px] text-slate-400">{o.item_count} items • {new Date(o.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-xs text-slate-900 block">₹{o.total_amount?.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">{o.payment_status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Order Details & Live Tracking */}
        <div className="lg:col-span-7 space-y-5">
          {detailsLoading || !order ? (
            <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
              {/* Header & Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 font-mono">{order.order_number}</h2>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supplier: <span className="font-semibold text-slate-900">{order.supplier_name}</span> ({order.supplier_city})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {invoice && (
                    <button
                      onClick={() => setIsInvoiceModalOpen(true)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Tax Invoice</span>
                    </button>
                  )}

                  <button
                    onClick={() => onReorder && onReorder(items)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-600/30 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reorder</span>
                  </button>
                </div>
              </div>

              {/* Items List with Dispatched vs Pending quantities */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Ordered Products</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b font-semibold">
                      <tr>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5 text-center">Ordered</th>
                        <th className="p-2.5 text-center">Dispatched</th>
                        <th className="p-2.5 text-center">Pending</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it) => (
                        <tr key={it.id}>
                          <td className="p-2.5 font-medium text-slate-900">
                            {it.product_name}
                            <span className="text-[10px] text-slate-400 block font-mono">{it.sku}</span>
                          </td>
                          <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                          <td className="p-2.5 text-center font-bold text-emerald-600">{it.dispatched_quantity}</td>
                          <td className="p-2.5 text-center font-bold text-amber-600">{it.pending_quantity}</td>
                          <td className="p-2.5 text-right">₹{it.base_price}</td>
                          <td className="p-2.5 text-right font-bold text-slate-900">₹{it.total_price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shipments & Dispatches Tracking */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Live Shipments & Delivery Details</h3>
                {dispatches.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                    Awaiting dispatch confirmation from supplier. Inventory has been allocated.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dispatches.map((d) => (
                      <div key={d.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-mono">{d.dispatch_number}</span>
                            <StatusBadge status={d.status} />
                          </div>
                          <span className="text-[10px] text-slate-400">{new Date(d.dispatch_date).toLocaleDateString()}</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-2 border-t border-slate-200/60">
                          <div>
                            <span className="text-slate-400 block">Carrier:</span>
                            <span className="font-semibold text-slate-800">{d.transporter_name}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Tracking No:</span>
                            <span className="font-mono font-bold text-blue-700">{d.tracking_number}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Vehicle:</span>
                            <span className="font-mono text-slate-700">{d.vehicle_number || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax Invoice Modal */}
      {invoice && (
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title={`Wholesale Tax Invoice #${invoice.invoice_number}`}
          subtitle="Official GST Invoicing Document"
          maxWidth="max-w-3xl"
          footer={
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
          }
        >
          <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs space-y-4">
            <div className="flex justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">TAX INVOICE</h4>
                <p className="text-slate-500">Invoice No: {invoice.invoice_number}</p>
                <p className="text-slate-500">Order Ref: {order?.order_number}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={invoice.status} />
                <p className="text-slate-500 mt-1">Due Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px]">
              <div>
                <p className="font-bold text-slate-700 uppercase">Supplier Details:</p>
                <p className="font-semibold text-slate-900">{order?.supplier_name}</p>
                <p className="text-slate-500">GSTIN: {order?.supplier_gstin}</p>
                <p className="text-slate-500">{order?.supplier_address}</p>
              </div>
              <div>
                <p className="font-bold text-slate-700 uppercase">Billed To:</p>
                <p className="font-semibold text-slate-900">Your Store Name</p>
                <p className="text-slate-500">{order?.shipping_address}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 font-bold text-sm border-t">
              <span>Invoice Total (INR):</span>
              <span className="text-emerald-700">₹{invoice.total_amount?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyOrdersView;

