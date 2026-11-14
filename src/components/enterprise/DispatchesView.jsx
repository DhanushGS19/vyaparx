import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Printer,
  FileText,
  AlertCircle,
  Eye,
  RefreshCw,
  Phone,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export const DispatchesView = ({ initialOrderId = null }) => {
  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Dispatch Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(!!initialOrderId);
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState(null);
  const [createForm, setCreateForm] = useState({
    orderId: initialOrderId || '',
    transporterName: 'GATI KWE Express',
    trackingNumber: '',
    vehicleNumber: 'MH-04-AZ-4512',
    driverPhone: '+91 98200 44332',
    waybillNumber: '',
    expectedDeliveryDate: '',
    notes: 'Fragile wholesale consignment. Handle with care.',
    itemsToDispatch: [], // array of { orderItemId, productId, quantity }
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // View Challan Modal
  const [selectedDispatchDetails, setSelectedDispatchDetails] = useState(null);
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);

  const fetchDispatches = async () => {
    setLoading(true);
    try {
      const res = await api.enterprise.getDispatches({
        status: statusFilter,
        search,
      });
      setDispatches(res.dispatches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEligibleOrders = async () => {
    try {
      const res = await api.enterprise.getOrders({ status: 'ALL' });
      const eligible = (res.orders || []).filter(o => 
        ['ACCEPTED', 'PROCESSING', 'PARTIALLY_DISPATCHED'].includes(o.status)
      );
      setEligibleOrders(eligible);
      if (initialOrderId) {
        handleSelectOrderForDispatch(initialOrderId);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchDispatches();
  }, [statusFilter, search]);

  useEffect(() => {
    fetchEligibleOrders();
  }, []);

  const handleSelectOrderForDispatch = async (orderId) => {
    try {
      const res = await api.enterprise.getOrderDetails(orderId);
      setSelectedOrderForDispatch(res);

      // Pre-fill items with remaining quantity to dispatch
      const items = (res.items || []).map(item => ({
        orderItemId: item.id,
        productId: item.product_id,
        productName: item.product_name,
        orderedQuantity: item.quantity,
        alreadyDispatched: item.dispatched_quantity || 0,
        remainingQuantity: item.quantity - (item.dispatched_quantity || 0),
        quantity: Math.max(1, item.quantity - (item.dispatched_quantity || 0)), // default to full remaining
      }));

      setCreateForm(prev => ({
        ...prev,
        orderId,
        itemsToDispatch: items,
      }));
    } catch (e) {}
  };

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      await api.enterprise.createDispatch({
        ...createForm,
        itemsToDispatch: createForm.itemsToDispatch.map(i => ({
          orderItemId: i.orderItemId,
          productId: i.productId,
          quantity: Number(i.quantity),
        })),
      });

      setIsCreateModalOpen(false);
      fetchDispatches();
      fetchEligibleOrders();
    } catch (err) {
      setCreateError(err.message || 'Dispatch creation failed');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenChallan = async (dispatchId) => {
    try {
      const res = await api.enterprise.getDispatchDetails(dispatchId);
      setSelectedDispatchDetails(res);
      setIsChallanModalOpen(true);
    } catch (e) {
      alert('Failed to load dispatch details');
    }
  };

  const handleStatusChange = async (dispatchId, newStatus) => {
    try {
      await api.enterprise.updateDispatchStatus(dispatchId, newStatus);
      fetchDispatches();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dispatch & Shipment Logistics</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track carrier transport, partial deliveries, LR consignment notes, and remaining stock balances</p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            if (eligibleOrders.length > 0 && !createForm.orderId) {
              handleSelectOrderForDispatch(eligibleOrders[0].id);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Dispatch</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Dispatch ID, Order ID, Transporter, or Retailer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
          {['ALL', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((st) => (
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

      {/* Dispatches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Dispatch Number</th>
                <th className="py-3 px-3">Order Ref</th>
                <th className="py-3 px-3">Retailer Destination</th>
                <th className="py-3 px-3">Carrier & Vehicle</th>
                <th className="py-3 px-3 text-center">Units Dispatched</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading dispatch records...
                  </td>
                </tr>
              ) : dispatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No dispatch records found.
                  </td>
                </tr>
              ) : (
                dispatches.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {d.dispatch_number}
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {new Date(d.dispatch_date).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-semibold text-blue-600 font-mono">{d.order_number}</span>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{d.shop_name}</p>
                      <span className="text-[10px] text-slate-400">{d.retailer_city}</span>
                    </td>

                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{d.transporter_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {d.vehicle_number} • Tracking: {d.tracking_number}
                      </p>
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {d.total_units_dispatched} units ({d.item_count} SKUs)
                    </td>

                    <td className="py-3 px-3 text-center">
                      <select
                        value={d.status}
                        onChange={(e) => handleStatusChange(d.id, e.target.value)}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none"
                      >
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="IN_TRANSIT">In Transit</option>
                        <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenChallan(d.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Challan</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dispatch Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Wholesale Dispatch"
        subtitle="Record partial or full product shipments against accepted wholesale orders"
        maxWidth="max-w-3xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="dispatch-form"
              onClick={handleCreateDispatch}
              disabled={createLoading || !selectedOrderForDispatch}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{createLoading ? 'Dispatching...' : 'Confirm Dispatch & Deduct Stock'}</span>
            </button>
          </div>
        }
      >
        <form id="dispatch-form" onSubmit={handleCreateDispatch} className="space-y-4">
          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* Select Order */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Order to Dispatch *</label>
            <select
              value={createForm.orderId}
              onChange={(e) => handleSelectOrderForDispatch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
            >
              <option value="">-- Choose Order Ready for Dispatch --</option>
              {eligibleOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.order_number} — {o.shop_name} (₹{o.total_amount?.toLocaleString('en-IN')}) [{o.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Transporter Details */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Logistics & Carrier Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Transporter / 3PL Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.transporterName}
                  onChange={(e) => setCreateForm({ ...createForm, transporterName: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                  placeholder="e.g. VRL Logistics, Gati, Blue Dart"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Vehicle / Truck Number</label>
                <input
                  type="text"
                  value={createForm.vehicleNumber}
                  onChange={(e) => setCreateForm({ ...createForm, vehicleNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-mono uppercase"
                  placeholder="MH-04-AZ-1234"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Driver Contact Phone</label>
                <input
                  type="tel"
                  value={createForm.driverPhone}
                  onChange={(e) => setCreateForm({ ...createForm, driverPhone: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                  placeholder="+91 98200 12345"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Consignment / Waybill (LR) No.</label>
                <input
                  type="text"
                  value={createForm.waybillNumber}
                  onChange={(e) => setCreateForm({ ...createForm, waybillNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-mono"
                  placeholder="LR-889922"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tracking / AWB Number</label>
                <input
                  type="text"
                  value={createForm.trackingNumber}
                  onChange={(e) => setCreateForm({ ...createForm, trackingNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none font-mono"
                  placeholder="TRK-990011"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expected Delivery Date</label>
                <input
                  type="date"
                  value={createForm.expectedDeliveryDate}
                  onChange={(e) => setCreateForm({ ...createForm, expectedDeliveryDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Item Quantities - Partial Shipment Control */}
          {createForm.itemsToDispatch?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Itemized Quantities to Dispatch in this Shipment
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  Partial shipments supported. Over-dispatch prevented.
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-48">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3 text-center">Ordered</th>
                      <th className="py-2 px-3 text-center">Prev Dispatched</th>
                      <th className="py-2 px-3 text-center">Remaining Balance</th>
                      <th className="py-2 px-3 text-center w-32">Dispatch Now</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {createForm.itemsToDispatch.map((it, idx) => (
                      <tr key={it.orderItemId}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{it.productName}</td>
                        <td className="py-2.5 px-3 text-center">{it.orderedQuantity}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500">{it.alreadyDispatched}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-700">{it.remainingQuantity}</td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={it.remainingQuantity}
                            value={it.quantity}
                            onChange={(e) => {
                              const val = Math.min(it.remainingQuantity, Math.max(0, Number(e.target.value)));
                              const newItems = [...createForm.itemsToDispatch];
                              newItems[idx].quantity = val;
                              setCreateForm({ ...createForm, itemsToDispatch: newItems });
                            }}
                            className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Delivery Challan / Gate Pass Modal */}
      {selectedDispatchDetails && (
        <Modal
          isOpen={isChallanModalOpen}
          onClose={() => setIsChallanModalOpen(false)}
          title={`Delivery Challan / Gate Pass #${selectedDispatchDetails.dispatch.dispatch_number}`}
          subtitle="Official Goods Consignment Gate Pass"
          maxWidth="max-w-2xl"
          footer={
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Delivery Gate Pass</span>
            </button>
          }
        >
          <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs space-y-4">
            <div className="flex justify-between border-b pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">GOODS DELIVERY CHALLAN</h4>
                <p className="text-slate-500 text-[11px]">Dispatch Ref: {selectedDispatchDetails.dispatch.dispatch_number}</p>
                <p className="text-slate-500 text-[11px]">Dispatched: {new Date(selectedDispatchDetails.dispatch.dispatch_date).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <StatusBadge status={selectedDispatchDetails.dispatch.status} />
                <p className="text-slate-500 text-[11px] mt-1 font-mono">Waybill: {selectedDispatchDetails.dispatch.waybill_number || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px] bg-slate-50 p-3 rounded-lg">
              <div>
                <span className="font-bold text-slate-700 block uppercase">Consignor (Supplier):</span>
                <p className="font-semibold text-slate-900">{selectedDispatchDetails.dispatch.supplier_name}</p>
                <p className="text-slate-500">GSTIN: {selectedDispatchDetails.dispatch.supplier_gstin}</p>
              </div>
              <div>
                <span className="font-bold text-slate-700 block uppercase">Consignee (Retailer):</span>
                <p className="font-semibold text-slate-900">{selectedDispatchDetails.dispatch.shop_name}</p>
                <p className="text-slate-500">{selectedDispatchDetails.dispatch.retailer_address}</p>
                <p className="text-slate-500">Ph: {selectedDispatchDetails.dispatch.retailer_phone}</p>
              </div>
            </div>

            <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-slate-500">Carrier:</span>{' '}
                <span className="font-bold text-slate-800">{selectedDispatchDetails.dispatch.transporter_name}</span>
              </div>
              <div>
                <span className="text-slate-500">Vehicle No:</span>{' '}
                <span className="font-bold text-slate-800 font-mono">{selectedDispatchDetails.dispatch.vehicle_number}</span>
              </div>
              <div>
                <span className="text-slate-500">Driver Ph:</span>{' '}
                <span className="font-bold text-slate-800">{selectedDispatchDetails.dispatch.driver_phone}</span>
              </div>
            </div>

            <table className="w-full text-left border text-[11px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-2">Item Description</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2 text-center">Dispatched Qty</th>
                  <th className="p-2 text-center">Remaining Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedDispatchDetails.items?.map(it => (
                  <tr key={it.id}>
                    <td className="p-2 font-medium">{it.product_name}</td>
                    <td className="p-2 font-mono text-slate-500">{it.sku}</td>
                    <td className="p-2 text-center font-bold text-blue-700">{it.quantity}</td>
                    <td className="p-2 text-center text-slate-600">
                      {Math.max(0, it.ordered_quantity - it.total_dispatched_for_order)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DispatchesView;

