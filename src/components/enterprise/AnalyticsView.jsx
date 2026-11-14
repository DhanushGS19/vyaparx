import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle,
  FileSpreadsheet,
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
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import { api } from '../../services/api';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const AnalyticsView = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.enterprise.getAnalytics();
      setAnalytics(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExportCSV = () => {
    if (!analytics?.monthlyComparison) return;
    const headers = ['Month', 'Revenue', 'Subtotal', 'GST', 'Orders Count', 'Avg Order Value'];
    const rows = analytics.monthlyComparison.map(m => [
      m.month,
      m.revenue,
      m.subtotal,
      m.gst,
      m.orders_count,
      m.avg_order_value
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vyaparx_enterprise_sales_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Computing Enterprise Financial Analytics...</p>
        </div>
      </div>
    );
  }

  const monthly = analytics?.monthlyComparison || [];
  const categories = analytics?.categoryPerformance || [];
  const aging = analytics?.agingBuckets || [];
  const concentration = analytics?.retailerConcentration || [];
  const fulfillment = analytics?.fulfillmentStats || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Business Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit intelligence, debt aging profiles, and SKU margin contributions</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 transition-all self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Analytics Report (CSV)</span>
        </button>
      </div>

      {/* Fulfillment SLA Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Fulfillment SLA Rate</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fulfillment.orderFulfillmentRate}%</p>
          <span className="text-[11px] text-slate-500">{fulfillment.delivered_count} fulfilled on schedule</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Inward Orders</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{fulfillment.totalOrdersCount}</p>
          <span className="text-[11px] text-slate-500">Orders lifetime count</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active In Transit</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{(fulfillment.dispatched_count || 0) + (fulfillment.partial_count || 0)}</p>
          <span className="text-[11px] text-slate-500">Consignments on the road</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Cancellation Ratio</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {Number(((fulfillment.cancelled_count / (fulfillment.totalOrdersCount || 1)) * 100).toFixed(1))}%
          </p>
          <span className="text-[11px] text-slate-500">Rejected or cancelled</span>
        </div>
      </div>

      {/* Monthly Sales & Tax Inflows Chart */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Monthly Sales Volume vs GST Collections</h2>
            <p className="text-xs text-slate-500">Historical performance breakdown over past 12 billing periods</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">All amounts in INR</span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
              <Tooltip
                formatter={(val, name) => [`₹${Number(val).toLocaleString('en-IN')}`, name]}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="subtotal" name="Wholesale Net Sales" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gst" name="GST Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Debt Aging Analysis & Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Payment Aging Buckets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Receivables Aging Schedule</h2>
              <p className="text-xs text-slate-500">Unsettled invoice dues grouped by delinquency window</p>
            </div>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>

          <div className="space-y-3">
            {aging.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Zero outstanding receivables. All invoices settled!
              </div>
            ) : (
              aging.map((b) => (
                <div key={b.aging_bucket} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{b.aging_bucket}</p>
                    <span className="text-[11px] text-slate-500">{b.invoice_count} unpaid invoices</span>
                  </div>
                  <span className="text-sm font-bold text-rose-600">
                    ₹{b.total_amount?.toLocaleString('en-IN')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Category Contribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revenue Contribution by Category</h2>
              <p className="text-xs text-slate-500">Cumulative sales distribution across FMCG lines</p>
            </div>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>

          <div className="space-y-3">
            {categories.map((c, idx) => (
              <div key={c.category_name} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-800">{c.category_name}</span>
                  <span className="text-blue-700 font-bold">₹{c.total_revenue?.toLocaleString('en-IN')} ({c.units_sold} units)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (c.total_revenue / (categories[0]?.total_revenue || 1)) * 100)}%`,
                      backgroundColor: COLORS[idx % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;

