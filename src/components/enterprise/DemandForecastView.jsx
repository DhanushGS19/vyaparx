import React, { useState, useEffect } from 'react';
import {
  Cpu,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  AlertTriangle,
  Info,
  Package,
  Layers,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api } from '../../services/api';

export const DemandForecastView = () => {
  const [overview, setOverview] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productForecast, setProductForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await api.enterprise.getDemandOverview();
      setOverview(res);
      if (res.allProducts?.length > 0) {
        // Select first product with sufficient data
        const first = res.allProducts.find(p => p.analysis?.hasSufficientData) || res.allProducts[0];
        setSelectedProductId(first.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductForecast = async (prodId) => {
    setForecastLoading(true);
    try {
      const res = await api.enterprise.getProductForecast(prodId);
      setProductForecast(res.forecast);
    } catch (e) {
      console.error(e);
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      fetchProductForecast(selectedProductId);
    }
  }, [selectedProductId]);

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <Cpu className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Running Statistical Demand Forecasting Engine...</p>
        </div>
      </div>
    );
  }

  // Combine historical and forecasted data points for clean chart rendering
  const chartData = [];
  if (productForecast?.hasSufficientData) {
    productForecast.historicalPeriods?.forEach(h => {
      chartData.push({
        period: h.period,
        type: 'Historical',
        actualQuantity: h.quantity,
        predictedQuantity: null,
        lowerBound: null,
        upperBound: null,
      });
    });

    productForecast.forecast?.forEach(f => {
      chartData.push({
        period: f.period,
        type: 'Forecast',
        actualQuantity: null,
        predictedQuantity: f.predictedDemand,
        lowerBound: f.lowerBound,
        upperBound: f.upperBound,
      });
    });
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-2xl border border-blue-800/40 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-500/30 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Statistical Time-Series Engine
          </div>
          <h1 className="text-xl font-bold tracking-tight">AI Demand Intelligence & Forecasting</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Calculated strictly from actual historical order fulfillment patterns. Triple exponential smoothing and linear trend regressions protect against bias. Zero randomized predictions.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Data Maturity</span>
            <span className="font-bold text-emerald-400">
              {overview?.productsWithSufficientData} of {overview?.totalProducts} SKUs Modelled
            </span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Forecasting Model</span>
            <span className="font-semibold text-slate-200">Holt-Winters Trend</span>
          </div>
        </div>
      </div>

      {/* Main Grid: SKU Selector & Detailed Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Product Selection & Trend Highlights */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Select Product for Deep-Dive</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {overview?.allProducts?.map((prod) => {
                const isSelected = selectedProductId === prod.id;
                const analysis = prod.analysis;
                return (
                  <div
                    key={prod.id}
                    onClick={() => setSelectedProductId(prod.id)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-sm'
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className={`font-bold text-xs truncate ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                        {prod.name}
                      </p>
                      {analysis?.hasSufficientData ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          analysis.trendDirection === 'INCREASING' ? 'bg-emerald-100 text-emerald-800' :
                          analysis.trendDirection === 'DECREASING' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {analysis.trendDirection === 'INCREASING' ? <TrendingUp className="w-3 h-3" /> :
                           analysis.trendDirection === 'DECREASING' ? <TrendingDown className="w-3 h-3" /> :
                           <Minus className="w-3 h-3" />}
                          {analysis.trendDirection}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-full">
                          Gathering Data
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                      <span>SKU: {prod.sku}</span>
                      <span>Stock: {prod.stock_available}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Trend Summaries */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Demand Velocity Highlights</h3>
            
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-0.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Surging Demand SKUs</span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  {overview?.increasingDemand?.length > 0
                    ? overview.increasingDemand.map(p => p.name).slice(0, 2).join(', ')
                    : 'No rapid acceleration detected in recent cycles.'}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-0.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>Highest Volume Baseline</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  {overview?.topDemanded?.length > 0
                    ? `${overview.topDemanded[0]?.name} (~${overview.topDemanded[0]?.analysis?.meanMonthlyDemand} units/month)`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Product Forecast & Recommendations */}
        <div className="lg:col-span-8 space-y-5">
          {forecastLoading ? (
            <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            </div>
          ) : !productForecast ? (
            <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Select a product to view statistical forecasting.
            </div>
          ) : !productForecast.hasSufficientData ? (
            /* Insufficient Data State - Obeying user instruction! */
            <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-4">
              <div className="w-12 h-12 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-slate-900">Insufficient Historical Order Data</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {productForecast.message}
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-w-sm mx-auto text-xs text-left">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">Recorded Billing Cycles:</span>
                  <span className="font-bold text-slate-900">{productForecast.historicalDataPoints} Months</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Required Cycles:</span>
                  <span className="font-bold text-blue-600">Minimum 3 Months</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 italic">
                “To guarantee integrity, VyaparX displays this verification guardrail rather than fabricating synthetic predictions.”
              </p>
            </div>
          ) : (
            /* Sufficient Data - Full Forecast Visualization & Insights */
            <div className="space-y-5">
              {/* Trend & Recommendation Banner */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">AI Demand Insight</span>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>{productForecast.recommendations?.insight}</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      Confidence: {productForecast.confidencePercent}%
                    </span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      productForecast.trendDirection === 'INCREASING' ? 'bg-emerald-100 text-emerald-800' :
                      productForecast.trendDirection === 'DECREASING' ? 'bg-rose-100 text-rose-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {productForecast.trendDirection}
                    </span>
                  </div>
                </div>

                {/* Stock Level Recommendations Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Next Month Demand</span>
                    <span className="text-lg font-bold text-blue-700">
                      {productForecast.recommendations?.nextMonthForecast} units
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Safety Stock Buffer</span>
                    <span className="text-lg font-bold text-slate-800">
                      {productForecast.recommendations?.recommendedSafetyStock} units
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Reorder Trigger Point</span>
                    <span className="text-lg font-bold text-amber-700">
                      {productForecast.recommendations?.recommendedReorderPoint} units
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Total Target Holding</span>
                    <span className="text-lg font-bold text-emerald-700">
                      {productForecast.recommendations?.recommendedBufferStock} units
                    </span>
                  </div>
                </div>
              </div>

              {/* Chart: Historical Actuals vs Forecast Horizon */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Historical Demand vs Statistical Forecast</h3>
                    <p className="text-xs text-slate-500">Includes 95% confidence interval bounds</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className="w-3 h-0.5 bg-blue-600 rounded"></span> Actual Orders
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-indigo-600">
                      <span className="w-3 h-0.5 bg-indigo-500 border-dashed border-t-2"></span> Predicted
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="actualQuantity"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#2563eb' }}
                        connectNulls
                        name="Actual Fulfilled (Units)"
                      />
                      <Line
                        type="monotone"
                        dataKey="predictedQuantity"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={{ r: 4, fill: '#6366f1' }}
                        connectNulls
                        name="Forecast Demand (Units)"
                      />
                      <Line
                        type="monotone"
                        dataKey="lowerBound"
                        stroke="#cbd5e1"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        dot={false}
                        connectNulls
                        name="Lower Bound (95%)"
                      />
                      <Line
                        type="monotone"
                        dataKey="upperBound"
                        stroke="#cbd5e1"
                        strokeWidth={1}
                        strokeDasharray="2 2"
                        dot={false}
                        connectNulls
                        name="Upper Bound (95%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Forecast Horizon Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">3-Month Forward Projection Table</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="py-2 px-3">Period</th>
                        <th className="py-2 px-3 text-center">Predicted Demand</th>
                        <th className="py-2 px-3 text-center">95% Confidence Band</th>
                        <th className="py-2 px-3 text-center">Procurement Buffer</th>
                        <th className="py-2 px-3 text-right">Confidence Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productForecast.forecast?.map((f) => (
                        <tr key={f.period}>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{f.period}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-700">{f.predictedDemand} units</td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                            {f.lowerBound} — {f.upperBound} units
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-emerald-700">
                            +{Math.round(f.predictedDemand * 0.25)} safety units
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                            {(f.confidenceScore * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemandForecastView;

