import React, { useState, useEffect } from 'react';
import {
  Package,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Sliders,
  History,
  Building,
  CheckCircle,
  Clock,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';
import StatCard from '../common/StatCard';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export const InventoryView = () => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('PRODUCTS'); // 'PRODUCTS', 'HISTORY', 'WAREHOUSES'

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    warehouseId: '',
    type: 'CORRECTION',
    quantityChange: 10,
    notes: '',
  });
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState(null);

  // Warehouse Modal
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [whForm, setWhForm] = useState({
    name: '',
    code: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    capacitySqft: 10000,
    managerName: '',
    managerPhone: '',
  });

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [invRes, histRes] = await Promise.all([
        api.enterprise.getInventory(),
        api.enterprise.getInventoryHistory({ limit: 40 }),
      ]);
      setData(invRes);
      setHistory(histRes.transactions || []);
      if (invRes.products?.length > 0 && !adjustForm.productId) {
        setAdjustForm(prev => ({
          ...prev,
          productId: invRes.products[0].id,
          warehouseId: invRes.warehouses[0]?.id || '',
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    setAdjustLoading(true);
    setAdjustError(null);
    try {
      await api.enterprise.adjustStock(adjustForm);
      setIsAdjustModalOpen(false);
      fetchInventory();
    } catch (err) {
      setAdjustError(err.message || 'Failed to adjust stock');
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      await api.enterprise.createWarehouse(whForm);
      setIsWarehouseModalOpen(false);
      fetchInventory();
    } catch (err) {
      alert(err.message || 'Failed to create warehouse');
    }
  };

  const summary = data?.summary || {};
  const lowStockAlerts = data?.lowStockAlerts || [];
  const products = data?.products || [];
  const warehouses = data?.warehouses || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Inventory & Warehouses</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time multi-warehouse inventory, stock reservations, and automated audit logs</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWarehouseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Building className="w-4 h-4" />
            <span>Add Warehouse</span>
          </button>
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 transition-all"
          >
            <Sliders className="w-4 h-4" />
            <span>Stock Inward / Adjust</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Stock" value={summary.total_stock?.toLocaleString()} color="slate" icon={Layers} />
        <StatCard title="Available Stock" value={summary.available_stock?.toLocaleString()} color="emerald" icon={Package} />
        <StatCard title="Reserved Stock" value={summary.reserved_stock?.toLocaleString()} color="amber" icon={Clock} subvalue="Locked for accepted orders" />
        <StatCard title="Dispatched Stock" value={summary.dispatched_stock?.toLocaleString()} color="blue" icon={CheckCircle} />
        <StatCard title="Damaged Stock" value={summary.damaged_stock?.toLocaleString()} color="rose" icon={AlertTriangle} />
        <StatCard title="Returned Stock" value={summary.returned_stock?.toLocaleString()} color="purple" icon={RefreshCw} />
      </div>

      {/* Low Stock Alerts Banner (if any) */}
      {lowStockAlerts.length > 0 && (
        <div className="p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-3 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-900 mb-1">
              Low Stock & Out of Stock Warnings ({lowStockAlerts.length} Products Impacted)
            </h4>
            <div className="flex flex-wrap gap-2">
              {lowStockAlerts.map(p => (
                <span key={p.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-300 font-medium text-slate-800">
                  <span>{p.name}:</span>
                  <span className={`font-bold ${p.stock_available === 0 ? 'text-red-600' : 'text-amber-700'}`}>
                    {p.stock_available} units left
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'PRODUCTS', label: 'Product Stock Health', icon: Package },
          { id: 'HISTORY', label: 'Stock Movement Audit History', icon: History },
          { id: 'WAREHOUSES', label: 'Warehouses & Locations', icon: Building },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 text-xs font-bold inline-flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Product Stock Health Table */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3 text-center">Available Stock</th>
                  <th className="py-3 px-3 text-center">Reserved for Orders</th>
                  <th className="py-3 px-3 text-center">Dispatched</th>
                  <th className="py-3 px-3 text-center">Damaged / Written-off</th>
                  <th className="py-3 px-3 text-center">Status Health</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <span className="text-[10px] text-slate-400">{p.category_name} • {p.uom}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-700">{p.sku}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-bold text-sm ${
                        p.stock_available === 0 ? 'text-red-600' :
                        p.stock_available <= 25 ? 'text-amber-600' : 'text-emerald-700'
                      }`}>
                        {p.stock_available}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-amber-700">
                      {p.stock_reserved > 0 ? `${p.stock_reserved} units` : '0'}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">{p.stock_dispatched}</td>
                    <td className="py-3 px-3 text-center text-rose-600 font-medium">{p.stock_damaged}</td>
                    <td className="py-3 px-3 text-center">
                      <StatusBadge status={p.stock_health} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setAdjustForm(prev => ({ ...prev, productId: p.id }));
                          setIsAdjustModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stock Movement Audit History */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-3">Transaction Type</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-3 text-center">Quantity Delta</th>
                  <th className="py-3 px-3 text-center">Previous Stock</th>
                  <th className="py-3 px-3 text-center">New Balance</th>
                  <th className="py-3 px-4">Audit Note & Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-sans">
                      {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        tx.transaction_type.includes('INWARD') ? 'bg-emerald-100 text-emerald-800' :
                        tx.transaction_type.includes('DISPATCH') ? 'bg-cyan-100 text-cyan-800' :
                        tx.transaction_type.includes('DAMAGE') ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-900">{tx.product_name}</td>
                    <td className="py-3 px-3 text-center font-bold">
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500">{tx.previous_stock}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{tx.new_stock}</td>
                    <td className="py-3 px-4 font-sans text-slate-600 text-[11px]">{tx.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Warehouses */}
      {activeTab === 'WAREHOUSES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((wh) => (
            <div key={wh.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {wh.code}
                  </span>
                  {wh.is_primary === 1 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      Primary Hub
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{wh.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{wh.address}, {wh.city}, {wh.state} - {wh.pincode}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>Capacity: {wh.capacity_sqft?.toLocaleString()} sq.ft</span>
                <span>Manager: {wh.manager_name || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stock Inward / Adjustment Modal */}
      {(() => {
        const selectedProduct = products.find(p => p.id === adjustForm.productId) || products[0];
        const currentStock = selectedProduct ? selectedProduct.stock_available : 0;
        const delta = Number(adjustForm.quantityChange) || 0;
        const effectiveChange = adjustForm.type === 'DAMAGE' ? -Math.abs(delta) : delta;
        const resultingStock = currentStock + effectiveChange;

        return (
          <Modal
            isOpen={isAdjustModalOpen}
            onClose={() => setIsAdjustModalOpen(false)}
            title="Adjust & Update Stock"
            subtitle="Record stock inward replenishment, audit correction, or damage write-off"
            maxWidth="max-w-xl"
            footer={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdjustStock}
                  disabled={adjustLoading || (resultingStock < 0)}
                  className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{adjustLoading ? 'Applying Changes...' : 'Update & Confirm Stock'}</span>
                </button>
              </div>
            }
          >
            <form id="adjust-form" onSubmit={handleAdjustStock} className="space-y-4">
              {adjustError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{adjustError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Product *</label>
                <select
                  value={adjustForm.productId || (products[0]?.id || '')}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Available: {p.stock_available} {p.uom})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Warehouse / Depository *</label>
                <select
                  value={adjustForm.warehouseId || (warehouses[0]?.id || '')}
                  onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name} ({w.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Reason / Type *</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="REPLENISHMENT">Replenishment / Factory Inward (+)</option>
                  <option value="CORRECTION">Physical Audit Correction (+ or -)</option>
                  <option value="DAMAGE">Damaged / Expired Goods Write-off (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity Change ({adjustForm.type === 'DAMAGE' ? 'Units Damaged' : 'Units to Inward/Adjust'}) *
                </label>
                <input
                  type="number"
                  required
                  value={adjustForm.quantityChange}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityChange: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 50 or -10"
                />
              </div>

              {/* Live Balance Impact Preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Current Available Stock:</span>
                  <span className="font-bold text-slate-800">{currentStock} Units</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Effective Quantity Delta:</span>
                  <span className={`font-bold ${effectiveChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {effectiveChange > 0 ? `+${effectiveChange}` : effectiveChange} Units
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Resulting Stock Balance:</span>
                  <span className={resultingStock < 0 ? 'text-rose-600 font-black' : 'text-emerald-700 font-black'}>
                    {resultingStock} Units
                  </span>
                </div>
                {resultingStock < 0 && (
                  <p className="text-[11px] text-rose-600 font-bold pt-1">
                    ⚠️ Cannot deduct stock below zero (current available: {currentStock}).
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Log Reference / Notes *</label>
                <input
                  type="text"
                  required
                  value={adjustForm.notes}
                  onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Manufacturer Batch Delivery Inward #INV-5542"
                />
              </div>
            </form>
          </Modal>
        );
      })()}

      {/* Warehouse Modal */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        title="Add Distribution Warehouse"
        subtitle="Register a new regional hub or depot"
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsWarehouseModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateWarehouse}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Building className="w-4 h-4" />
              <span>Create Warehouse</span>
            </button>
          </div>
        }
      >
        <form id="wh-form" onSubmit={handleCreateWarehouse} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Name *</label>
              <input
                type="text"
                required
                value={whForm.name}
                onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                placeholder="e.g. Pune Regional Depot"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Code *</label>
              <input
                type="text"
                required
                value={whForm.code}
                onChange={(e) => setWhForm({ ...whForm, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none font-mono uppercase"
                placeholder="WH-PUNE-02"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Address *</label>
            <input
              type="text"
              required
              value={whForm.address}
              onChange={(e) => setWhForm({ ...whForm, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={whForm.city}
                onChange={(e) => setWhForm({ ...whForm, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={whForm.state}
                onChange={(e) => setWhForm({ ...whForm, state: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacity (sq.ft)</label>
              <input
                type="number"
                value={whForm.capacitySqft}
                onChange={(e) => setWhForm({ ...whForm, capacitySqft: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryView;

