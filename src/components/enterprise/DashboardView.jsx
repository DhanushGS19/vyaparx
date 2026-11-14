import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Clock,
  Package,
  Truck,
  Users,
  AlertCircle,
  FileText,
  Calendar,
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  Receipt
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api } from '../../services/api';
import StatCard from '../common/StatCard';
import StatusBadge from '../common/StatusBadge';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const DashboardView = ({ onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const fetchDashboard = async (range = dateRange) => {
    setLoading(true);
    try {
      const params = { range };
      if (range === 'custom' && customStart && customEnd) {
        params.startDate = customStart;
        params.endDate = customEnd;
      }
      const res = await api.enterprise.getDashboard(params);
      setData(res);
    } catch (err) {
      console.error('Failed to load enterprise dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(dateRange);
  }, [dateRange]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Aggregating Enterprise Business Data...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Date Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Enterprise Business Command Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time database-backed performance metrics and dispatch pipelines</p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: '7 Days' },
            { id: '30days', label: '30 Days' },
            { id: '3months', label: '3 Months' },
            { id: 'custom', label: 'Custom' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setDateRange(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateRange === item.id
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {dateRange === 'custom' && (
        <div className="bg-blue-50/60 border border-blue-200/80 p-4 rounded-xl flex items-center gap-3">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-slate-700">Custom Date Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white"
          />
          <button
            onClick={() => fetchDashboard('custom')}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Revenue"
          value={`₹${kpis.totalRevenue?.toLocaleString('en-IN')}`}
          subvalue="Fulfilled wholesale orders"
          icon={DollarSign}
          color="blue"
          trend="up"
          trendValue="+14.2%"
        />
        <StatCard
          title="Total Orders"
          value={kpis.totalOrders}
          subvalue={`${kpis.pendingOrders} pending acceptance`}
          icon={ShoppingCart}
          color="purple"
          onClick={() => onNavigate('orders')}
        />
        <StatCard
          title="Outstanding Dues"
          value={`₹${kpis.totalOutstandingDues?.toLocaleString('en-IN')}`}
          subvalue={`₹${kpis.overdueDues?.toLocaleString('en-IN')} overdue`}
          icon={AlertCircle}
          color={kpis.overdueDues > 0 ? 'rose' : 'amber'}
          onClick={() => onNavigate('retailers')}
        />
        <StatCard
          title="Payments Received"
          value={`₹${kpis.paymentsReceived?.toLocaleString('en-IN')}`}
          subvalue="Reconciled & settled"
          icon={Receipt}
          color="emerald"
          onClick={() => onNavigate('payments')}
        />
        <StatCard
          title="Available Inventory"
          value={`${kpis.availableInventory?.toLocaleString()} units`}
          subvalue={`${kpis.reservedInventory} units reserved`}
          icon={Package}
          color="slate"
          onClick={() => onNavigate('inventory')}
        />
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Growth & Monthly Sales Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Revenue Growth & Order Value Trend</h2>
              <p className="text-xs text-slate-500">Monthly gross sales volume (₹) from database invoices</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
              Actual Orders
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.salesChart || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Order Processing Pipeline</h2>
            <p className="text-xs text-slate-500 mb-2">Current status distribution across orders</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.orderStatusBreakdown || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="status"
                  >
                    {(charts.orderStatusBreakdown || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val, name, item) => [`${val} orders`, item.payload.status]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
            {(charts.orderStatusBreakdown || []).slice(0, 4).map((item, idx) => (
              <div key={item.status} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-600 font-medium truncate">{item.status}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Top Demanded Products & Outstanding Ledgers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Demanded Products */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">High-Velocity Products</h2>
              <p className="text-xs text-slate-500">Ranked by total wholesale units ordered</p>
            </div>
            <button
              onClick={() => onNavigate('forecasting')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>AI Forecasts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.topProducts || []} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={100} tickFormatter={(str) => str.length > 14 ? `${str.slice(0, 14)}...` : str} />
                <Tooltip
                  formatter={(val) => [`${val} units`, 'Ordered']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="total_units_ordered" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outstanding Dues by Retailer */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Retailer Outstanding Ledgers</h2>
                <p className="text-xs text-slate-500">Retailers with pending receivables</p>
              </div>
              <button
                onClick={() => onNavigate('retailers')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View 360° Profiles</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {(charts.outstandingByRetailer || []).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  All retailer balances are fully settled!
                </div>
              ) : (
                charts.outstandingByRetailer.map((ret) => (
                  <div key={ret.retailer_id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{ret.shop_name}</p>
                      <p className="text-[11px] text-slate-500">{ret.owner_name} • {ret.unpaid_invoice_count} unpaid invoices</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-rose-600">₹{ret.outstanding_amount?.toLocaleString('en-IN')}</p>
                      <span className="text-[10px] text-slate-400">Due since {new Date(ret.oldest_due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Wholesale Orders</h2>
              <p className="text-xs text-slate-500">Direct orders received from registered kiranas</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Manage All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Order ID</th>
                  <th className="py-2.5 px-3 font-semibold">Retailer</th>
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold">Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.recentOrders || []).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{order.order_number}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-800">{order.shop_name}</p>
                      <p className="text-[10px] text-slate-500">{order.city}</p>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">₹{order.total_amount?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Inventory Movements */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Warehouse Activities</h2>
              <p className="text-xs text-slate-500">Live stock transactions & reservations</p>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {(data?.recentActivities || []).map((act) => (
              <div key={act.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start gap-2.5">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  act.transaction_type.includes('DISPATCH') ? 'bg-cyan-500' :
                  act.transaction_type.includes('RESERVED') ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{act.product_name}</p>
                  <p className="text-[11px] text-slate-500">{act.notes}</p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;

