import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Clock,
  ArrowRight,
  ShoppingCart,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { api } from '../../services/api';

export const PurchaseIntelligenceView = ({ onAddToCart }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      const res = await api.retailer.getIntelligence();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligence();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Analyzing Retailer Purchasing Patterns...</p>
        </div>
      </div>
    );
  }

  const monthlySpending = data?.monthlySpending || [];
  const topProducts = data?.topProducts || [];
  const reorderRecommendations = data?.reorderRecommendations || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-6 rounded-3xl border border-emerald-800/40 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Retailer Intelligence Engine
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Purchase Velocity & Reorder Recommendations</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Automated procurement intelligence predicts inventory replenishment windows, tracks store consumption velocity, and prevents shelf stockouts.
          </p>
        </div>
      </div>

      {/* Reorder Recommendations Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Intelligent Reordering Recommendations</h2>
            <p className="text-xs text-slate-500">Based on past purchase cycles and store consumption rates</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reorderRecommendations.map((r) => (
            <div
              key={r.product_id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                r.urgency === 'CRITICAL'
                  ? 'bg-rose-50/60 border-rose-300 shadow-sm'
                  : r.urgency === 'RECOMMENDED'
                  ? 'bg-amber-50/60 border-amber-300 shadow-sm'
                  : 'bg-slate-50 border-slate-200/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    r.urgency === 'CRITICAL' ? 'bg-rose-200 text-rose-900' :
                    r.urgency === 'RECOMMENDED' ? 'bg-amber-200 text-amber-900' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {r.urgency === 'CRITICAL' ? 'High Stockout Risk' : r.urgency === 'RECOMMENDED' ? 'Optimal Reorder Window' : 'Stable Stock'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">SKU: {r.sku}</span>
                </div>

                <h3 className="font-bold text-xs text-slate-900 line-clamp-1">{r.product_name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{r.supplier_name}</p>
                <p className="text-xs text-slate-600 mt-2 leading-snug">{r.reason}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Recommended Order</span>
                  <span className="font-bold text-xs text-slate-900">{r.suggestedReorderQuantity} Units</span>
                </div>

                <button
                  onClick={() => onAddToCart && onAddToCart({
                    id: r.product_id,
                    name: r.product_name,
                    sku: r.sku,
                    wholesale_price: r.wholesale_price,
                    quantity: r.suggestedReorderQuantity,
                  })}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Reorder</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Spending Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Store Procurement Spending Trend</h2>
            <p className="text-xs text-slate-500">Monthly wholesale investments (₹)</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            Actual Invoices
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlySpending} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
              <Tooltip
                formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Total Spent']}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="total_spent" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpent)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PurchaseIntelligenceView;

