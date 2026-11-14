import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  HelpCircle,
  ShieldCheck,
  Percent,
  CheckCircle,
  Layers,
  ArrowRight,
  Edit3,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { api } from '../../services/api';
import StatCard from '../common/StatCard';
import Modal from '../common/Modal';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

export const ProfitDashboardView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Log Sales Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [logForm, setLogForm] = useState({
    productId: '',
    soldQty: 10,
    actualSellingPrice: 125,
    targetSellingPrice: 125,
    notes: 'Walk-in cash sales recorded at retail counter',
  });
  const [logLoading, setLogLoading] = useState(false);

  const fetchProfitData = async () => {
    setLoading(true);
    try {
      const res = await api.retailer.getProfitDashboard();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitData();
  }, []);

  const handleOpenLogModal = (prod) => {
    setSelectedProduct(prod);
    setLogForm({
      productId: prod.productId,
      soldQty: prod.soldQty || 10,
      actualSellingPrice: prod.actualSellingPrice || prod.targetSellingPrice,
      targetSellingPrice: prod.targetSellingPrice,
      notes: 'Logged at retail counter',
    });
    setIsLogModalOpen(true);
  };

  const handleSaveSales = async (e) => {
    e.preventDefault();
    setLogLoading(true);
    try {
      await api.retailer.logSales(logForm);
      setIsLogModalOpen(false);
      fetchProfitData();
    } catch (err) {
      alert(err.message || 'Failed to log sales');
    } finally {
      setLogLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Computing Store Profitability Ledgers...</p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const gstSummary = summary?.gstSummary || {};
  const products = data?.products || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border border-emerald-800/40 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Profit Engineering
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Retailer Profitability Dashboard</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Strict separation between <span className="text-emerald-400 font-bold">Estimated Potential Profit</span> (based on holding inventory) and <span className="text-blue-400 font-bold">Realized Cash Profit</span> (backed by logged retail customer sales).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-right">
            <span className="text-slate-400 text-[10px] uppercase font-bold block">Overall Projected Margin</span>
            <span className="text-xl font-black text-emerald-400">{summary.overallEstimatedMarginPercent}%</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: Strict Separation of Estimated vs Realized */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Capital Investment</span>
          <p className="text-2xl font-extrabold text-slate-900">₹{summary.totalGrossInvestment?.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-slate-500">{summary.totalPurchasedUnits} total units purchased</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Projected Total Revenue</span>
          <p className="text-2xl font-extrabold text-blue-700">₹{summary.totalEstimatedSalesRevenue?.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-slate-500">At current MSRP / target selling prices</span>
        </div>

        {/* ESTIMATED PROFIT */}
        <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Estimated Gross Profit</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">UNREALIZED</span>
          </div>
          <p className="text-2xl font-black text-emerald-700">₹{summary.totalEstimatedProfit?.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-emerald-600">If all holding inventory is sold</span>
        </div>

        {/* REALIZED PROFIT */}
        <div className="bg-white p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/20 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Realized Cash Profit</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">CONFIRMED</span>
          </div>
          <p className="text-2xl font-black text-blue-700">₹{summary.totalRealizedProfit?.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-blue-600">{summary.totalSoldUnits} units confirmed sold</span>
        </div>
      </div>

      {/* GST Summary & Tax Credit Breakdown */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            GST Tax Position & Input Tax Credit (ITC)
          </h2>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
            {gstSummary.isItcEligible ? 'ITC Eligible Regular Dealer' : 'Non-ITC / Composition'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Total Input GST Paid</span>
            <span className="text-sm font-bold text-slate-900">₹{gstSummary.totalInputGst?.toLocaleString('en-IN')}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Recoverable Input Tax Credit</span>
            <span className="text-sm font-bold text-emerald-600">₹{gstSummary.recoverableInputGst?.toLocaleString('en-IN')}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Estimated Output GST Collected</span>
            <span className="text-sm font-bold text-blue-600">₹{gstSummary.estimatedOutputGst?.toLocaleString('en-IN')}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Estimated Net Tax Payable</span>
            <span className="text-sm font-bold text-slate-800">₹{gstSummary.estimatedNetGstPayable?.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Product-wise Profit Ledger & Interactive Sales Logger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Product Profitability & Sales Records</h2>
            <p className="text-xs text-slate-500">Log actual sold units and selling prices to convert estimated profits into realized profit</p>
          </div>
          <span className="text-[11px] text-slate-400 italic">Click "Log Counter Sales" on any product</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b font-semibold uppercase">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3 text-center">Purchased</th>
                <th className="p-3 text-center">Sold</th>
                <th className="p-3 text-center">Remaining</th>
                <th className="p-3 text-right">Cost / Unit</th>
                <th className="p-3 text-right">Selling Price</th>
                <th className="p-3 text-center">Margin (%)</th>
                <th className="p-3 text-right">Estimated Profit</th>
                <th className="p-3 text-right">Realized Profit</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3">
                    <p className="font-bold text-slate-900">{p.productName}</p>
                    <span className="text-[10px] text-slate-400 font-mono">SKU: {p.sku} • {p.supplierName}</span>
                  </td>
                  <td className="p-3 text-center font-semibold">{p.purchasedQty}</td>
                  <td className="p-3 text-center font-bold text-blue-700">{p.soldQty}</td>
                  <td className="p-3 text-center font-semibold text-slate-500">{p.remainingQty}</td>
                  <td className="p-3 text-right text-slate-600">₹{p.effectiveUnitCost}</td>
                  <td className="p-3 text-right font-bold text-slate-900">₹{p.actualSellingPrice}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                      {p.profitMarginPercent}%
                    </span>
                  </td>
                  <td className="p-3 text-right font-semibold text-emerald-700">
                    ₹{p.estimatedTotalProfit?.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-black text-blue-700">
                    ₹{p.realizedProfit?.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleOpenLogModal(p)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Log Sales</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Sales Modal */}
      {selectedProduct && (
        <Modal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          title={`Log Retail Counter Sales: ${selectedProduct.productName}`}
          subtitle="Record customer transactions to compute confirmed realized profit"
          maxWidth="max-w-md"
          footer={
            <>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="log-form"
                disabled={logLoading}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm"
              >
                {logLoading ? 'Recording...' : 'Update Realized Profit'}
              </button>
            </>
          }
        >
          <form id="log-form" onSubmit={handleSaveSales} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Units Purchased:</span>
                <span className="font-bold text-slate-900">{selectedProduct.purchasedQty} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Effective Unit Purchase Cost:</span>
                <span className="font-bold text-slate-900">₹{selectedProduct.effectiveUnitCost}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Units Sold to Customers *</label>
              <input
                type="number"
                min="0"
                max={selectedProduct.purchasedQty}
                required
                value={logForm.soldQty}
                onChange={(e) => setLogForm({ ...logForm, soldQty: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Maximum: {selectedProduct.purchasedQty} units</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Realized Selling Price (₹) *</label>
              <input
                type="number"
                step="0.5"
                min="1"
                required
                value={logForm.actualSellingPrice}
                onChange={(e) => setLogForm({ ...logForm, actualSellingPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none"
              />
            </div>

            {/* Live Realized Profit Preview */}
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs flex justify-between items-center">
              <span className="font-semibold text-blue-900">Calculated Realized Profit:</span>
              <span className="text-base font-black text-blue-700">
                ₹{((logForm.soldQty || 0) * (logForm.actualSellingPrice - selectedProduct.effectiveUnitCost)).toFixed(2)}
              </span>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProfitDashboardView;

