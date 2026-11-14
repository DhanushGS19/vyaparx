import React, { useState, useEffect } from 'react';
import {
  Store,
  ShoppingCart,
  Calculator,
  Receipt,
  TrendingUp,
  Package,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import StatCard from '../common/StatCard';
import StatusBadge from '../common/StatusBadge';

export const RetailerHomeView = ({ onNavigate, onAddToCart }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.retailer.getDashboard();
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Opening Retailer Wholesale Hub...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const reminderAlerts = data?.reminderAlerts || [];
  const categories = data?.categories || [];
  const featuredProducts = data?.featuredProducts || [];
  const recentlyPurchased = data?.recentlyPurchased || [];
  const recentOrders = data?.recentOrders || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white border border-emerald-800/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 uppercase tracking-wider mb-2">
            <Store className="w-3.5 h-3.5" /> Retailer Smart Commerce
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Namaste, {data?.ownerName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Welcome to <span className="font-bold text-white">{data?.shopName}</span>'s digital wholesale procurement desk. Browse verified manufacturer pricing, compute exact retail margins, and order direct.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('marketplace')}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Order Daily Essentials</span>
          </button>
          <button
            onClick={() => onNavigate('orders')}
            className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-white font-semibold text-xs border border-slate-700 flex items-center gap-2 transition-all"
          >
            <Package className="w-4 h-4" />
            <span>My Orders & Shipments</span>
          </button>
        </div>
      </div>

      {/* Payment Reminder Warning Banner (if any pending supplier notices) */}
      {reminderAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>Pending Supplier Payment Reminder ({reminderAlerts.length})</span>
            </div>
            <button
              onClick={() => onNavigate('financials')}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1"
            >
              <span>Acknowledge in Financials</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {reminderAlerts.map(rem => (
              <div key={rem.id} className="p-2.5 bg-white rounded-xl border border-rose-200 text-slate-800 flex justify-between items-center">
                <div>
                  <span className="font-bold">{rem.supplier_name}</span>
                  <p className="text-[11px] text-slate-500">Invoice #{rem.invoice_number} • Due: {rem.due_date?.slice(0, 10)}</p>
                </div>
                <span className="font-bold text-rose-600">₹{rem.amount_due?.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retailer Quick KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Store Purchases"
          value={`₹${metrics.totalPurchases?.toLocaleString('en-IN')}`}
          subvalue={`${metrics.totalOrders} wholesale orders`}
          icon={ShoppingCart}
          color="emerald"
        />
        <StatCard
          title="Outstanding Dues"
          value={`₹${metrics.totalOutstandingDues?.toLocaleString('en-IN')}`}
          subvalue={metrics.overduePayments > 0 ? `₹${metrics.overduePayments?.toLocaleString('en-IN')} overdue` : 'Within credit terms'}
          icon={Receipt}
          color={metrics.overduePayments > 0 ? 'rose' : 'amber'}
          onClick={() => onNavigate('financials')}
        />
        <StatCard
          title="Available Credit Limit"
          value={`₹${metrics.availableCredit?.toLocaleString('en-IN')}`}
          subvalue="Supplier revolving credit"
          icon={ShieldCheck}
          color="blue"
        />
        <StatCard
          title="Pending Dispatches"
          value={`${metrics.pendingOrders} Orders`}
          subvalue="Awaiting shipment delivery"
          icon={Clock}
          color="purple"
          onClick={() => onNavigate('orders')}
        />
      </div>

      {/* Category Navigation Shortcuts */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Wholesale Categories</h2>
          <button
            onClick={() => onNavigate('marketplace')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View All
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => onNavigate('marketplace')}
              className="p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/70 hover:border-emerald-300 transition-all text-left flex flex-col justify-between group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100/60 text-emerald-700 flex items-center justify-center font-bold text-xs mb-2 group-hover:scale-105 transition-transform">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800 group-hover:text-emerald-800 truncate">{c.name}</p>
                <span className="text-[10px] text-slate-400">{c.product_count} SKUs active</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Featured Wholesale Products Carousel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Popular Wholesale Essentials</h2>
            <p className="text-xs text-slate-500">High-turnover fast-moving goods directly from verified enterprises</p>
          </div>
          <button
            onClick={() => onNavigate('marketplace')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Explore Marketplace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredProducts.slice(0, 4).map((p) => {
            const gstAmount = Number(((p.wholesale_price * p.gst_rate) / 100).toFixed(2));
            const finalPrice = Number((p.wholesale_price + gstAmount).toFixed(2));
            const estProfit = Math.round((p.suggested_retail_price || finalPrice * 1.2) - finalPrice);

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-slate-200/90 p-4 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col justify-between bg-white"
              >
                <div>
                  <div className="h-36 rounded-xl bg-slate-100 overflow-hidden mb-3 relative">
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      GST {p.gst_rate}%
                    </span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {p.supplier_name}
                  </span>
                  <h3 className="font-bold text-xs text-slate-900 line-clamp-2 mt-0.5">{p.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">{p.uom} • MOQ: {p.moq}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400">Wholesale Price:</span>
                      <p className="text-sm font-bold text-slate-900">₹{finalPrice?.toLocaleString('en-IN')}</p>
                      <span className="text-[10px] text-slate-500">Base: ₹{p.wholesale_price} + GST</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-emerald-700 font-semibold block">Est. Profit:</span>
                      <span className="text-xs font-bold text-emerald-700">+₹{estProfit}/unit</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => onAddToCart && onAddToCart(p)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Order Batch (Earn +₹{estProfit}/unit)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Recently Purchased & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Purchased Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Quick Reorder Essentials</h2>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-emerald-600"
            >
              Order History
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentlyPurchased.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{p.name}</p>
                  <p className="text-[11px] text-slate-500">{p.supplier_name} • {p.total_units_bought} units purchased</p>
                </div>
                <button
                  onClick={() => onAddToCart && onAddToCart(p)}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-lg transition-colors"
                >
                  Buy Again
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live Orders Tracking Snapshot */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900">Recent Order Deliveries</h2>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-emerald-600"
            >
              All Orders
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOrders.map((o) => (
              <div key={o.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-mono">{o.order_number}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{o.supplier_name} • ₹{o.total_amount?.toLocaleString('en-IN')}</p>
                </div>
                <button
                  onClick={() => onNavigate('orders')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Track
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerHomeView;

