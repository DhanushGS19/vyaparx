import React, { useState, useEffect } from 'react';
import {
  Calculator,
  IndianRupee,
  Percent,
  TrendingUp,
  ShieldCheck,
  Info,
  HelpCircle,
  Sparkles,
  Layers,
  ArrowRight,
  Package,
  RefreshCw,
  Sliders
} from 'lucide-react';
import { api } from '../../services/api';

export const ProfitCalculatorView = ({ preselectedProductId = null, onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Dynamic Calculator Inputs
  const [sellingPrice, setSellingPrice] = useState(125);
  const [quantity, setQuantity] = useState(25);
  const [targetMargin, setTargetMargin] = useState(20);
  const [isItcEligible, setIsItcEligible] = useState(true);

  // Calculation Results
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calcLoading, setCalcLoading] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const res = await api.retailer.getMarketplace();
      setProducts(res.products || []);
      if (res.products?.length > 0) {
        const initial = preselectedProductId
          ? res.products.find(p => p.id === preselectedProductId) || res.products[0]
          : res.products[0];

        setSelectedProductId(initial.id);
        setSelectedProduct(initial);
        setSellingPrice(initial.suggested_retail_price || Math.round(initial.wholesale_price * 1.25));
        setQuantity(initial.moq || 10);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runCalculation = async () => {
    if (!selectedProductId) return;
    setCalcLoading(true);
    try {
      const res = await api.retailer.calculateProfit({
        productId: selectedProductId,
        sellingPrice: Number(sellingPrice),
        quantity: Number(quantity),
        isItcEligible,
        targetMarginPercent: Number(targetMargin),
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        setSelectedProduct(prod);
        if (!preselectedProductId) {
          setSellingPrice(prod.suggested_retail_price || Math.round(prod.wholesale_price * 1.25));
        }
      }
      runCalculation();
    }
  }, [selectedProductId, sellingPrice, quantity, targetMargin, isItcEligible]);

  const breakdown = result?.breakdown || {};
  const suggestion = result?.smartSuggestion || {};

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 p-6 rounded-3xl border border-emerald-800/40 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Signature Feature
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Smart Pricing & Profit Calculator</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Audit the complete financial unit economics BEFORE placing wholesale orders. Features configurable GST input credit reconciliation, margin vs markup differentiation, and dynamic bulk profitability.
          </p>
        </div>

        {/* GST Type Indicator */}
        <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 text-xs flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Tax Regime Profile</span>
            <span className="font-bold text-white">
              {isItcEligible ? 'Regular GST (ITC Eligible)' : 'Composition Scheme (Non-ITC)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs (Left) & Dynamic Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Choose Product to Model
            </h2>

            <div>
              <select
                value={selectedProductId || ''}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Wholesale: ₹{p.wholesale_price} • GST: {p.gst_rate}%)
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Supplier:</span>
                  <span className="font-semibold text-slate-900">{selectedProduct.supplier_name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Base Wholesale Price:</span>
                  <span className="font-bold text-slate-900">₹{selectedProduct.wholesale_price}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Applicable GST Slab:</span>
                  <span className="font-semibold text-blue-700">{selectedProduct.gst_rate}% (HSN: {selectedProduct.hsn_code})</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Minimum Order (MOQ):</span>
                  <span className="font-semibold text-slate-800">{selectedProduct.moq} Units</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Pricing Controls */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Custom Selling Price & Order Batch
            </h2>

            {/* Custom Retail Selling Price */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Target Retail Selling Price (₹)</span>
                <span className="text-emerald-600 font-bold">₹{sellingPrice}/unit</span>
              </div>
              <input
                type="number"
                step="1"
                min="1"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Adjusting this value dynamically recalculates profit margins, markups, and cashflows.
              </span>
            </div>

            {/* Order Quantity Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Batch Order Quantity</span>
                <span className="font-bold text-blue-700">{quantity} units</span>
              </div>
              <input
                type="range"
                min={selectedProduct?.moq || 1}
                max="200"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Smart Suggested Margin Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Smart Suggested Target Margin</span>
                <span className="font-bold text-purple-700">{targetMargin}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
                className="w-full accent-purple-600"
              />
              {suggestion?.suggestedPrice && (
                <div className="mt-2 p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-xs flex items-center justify-between">
                  <span className="text-purple-900 font-medium">Smart AI Suggestion:</span>
                  <button
                    onClick={() => setSellingPrice(suggestion.suggestedPrice)}
                    className="font-bold text-purple-700 hover:underline"
                  >
                    Set to ₹{suggestion.suggestedPrice}
                  </button>
                </div>
              )}
            </div>

            {/* ITC Eligibility Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isItcEligible}
                  onChange={(e) => setIsItcEligible(e.target.checked)}
                  className="rounded text-emerald-600 w-4 h-4 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Eligible for Input Tax Credit (ITC)</span>
                  <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                    GST-registered regular businesses can claim credit for input GST, reducing real economic cost to the base wholesale price.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Transparent Financial & Tax Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          {/* Key Profit KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Expected Profit / Unit</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">₹{breakdown.profitPerUnit}</p>
              <span className="text-[10px] text-slate-500">Per single packaged unit</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Profit Margin (%)</span>
              <p className="text-2xl font-black text-blue-600 mt-1">{breakdown.profitMarginPercent}%</p>
              <span className="text-[10px] text-slate-500 font-mono">Profit ÷ Selling Price</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Markup (%)</span>
              <p className="text-2xl font-black text-purple-600 mt-1">{breakdown.markupPercent}%</p>
              <span className="text-[10px] text-slate-500 font-mono">Profit ÷ Unit Cost</span>
            </div>
          </div>

          {/* Unit Economics Breakdown Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Per-Unit Financial Architecture</h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                1 Unit = {selectedProduct?.uom}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium">1. Base Wholesale Price</span>
                <span className="font-bold text-slate-900">₹{breakdown.baseWholesalePrice}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium">2. Applicable GST ({breakdown.gstRate}%)</span>
                <span className="font-semibold text-slate-800">+₹{breakdown.inputGstAmount}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 bg-slate-50/60 px-2 rounded">
                <span className="text-slate-700 font-bold">3. Gross Purchase Price from Supplier</span>
                <span className="font-bold text-slate-900">₹{breakdown.grossPurchaseCostPerUnit}</span>
              </div>

              {isItcEligible ? (
                <div className="flex justify-between py-1 border-b border-emerald-100 bg-emerald-50/60 px-2 rounded text-emerald-900">
                  <span className="font-semibold">4. Recoverable Input Tax Credit (ITC Setoff)</span>
                  <span className="font-bold text-emerald-700">-₹{breakdown.recoverableInputGst}</span>
                </div>
              ) : (
                <div className="flex justify-between py-1 border-b border-slate-100 bg-slate-50 px-2 rounded text-slate-600">
                  <span>4. Non-Recoverable GST (Recorded as business expense)</span>
                  <span className="font-semibold text-slate-800">+₹{breakdown.nonRecoverableGst}</span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-slate-200 bg-blue-50/60 px-2 rounded text-blue-900">
                <span className="font-bold">5. Net Effective Cost to Store</span>
                <span className="font-black text-sm">₹{breakdown.effectiveCostPerUnit}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600 font-medium">6. Target Retail Selling Price</span>
                <span className="font-bold text-slate-900">₹{breakdown.sellingPrice}</span>
              </div>

              <div className="flex justify-between py-2 bg-emerald-100/60 px-3 rounded-xl text-emerald-950 font-bold text-sm">
                <span>7. Expected Net Profit per Unit</span>
                <span className="text-emerald-700 font-black">+₹{breakdown.profitPerUnit}</span>
              </div>
            </div>
          </div>

          {/* Bulk Batch Projection (For Selected Quantity) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm">Batch Profit Projection ({quantity} Units)</h3>
                <p className="text-[11px] text-slate-400">Total investment vs projected retail return</p>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                ROI: {breakdown.markupPercent}%
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Capital Investment</span>
                <p className="text-lg font-bold text-white mt-0.5">₹{breakdown.totalGrossInvestment?.toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-slate-500">Includes GST ₹{(breakdown.inputGstAmount * quantity).toFixed(2)}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Projected Sales Revenue</span>
                <p className="text-lg font-bold text-blue-400 mt-0.5">₹{breakdown.totalExpectedRevenue?.toLocaleString('en-IN')}</p>
                <span className="text-[10px] text-slate-500">At ₹{breakdown.sellingPrice} retail price</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Expected Store Profit</span>
                <p className="text-2xl font-black text-emerald-400">₹{breakdown.totalExpectedProfit?.toLocaleString('en-IN')}</p>
              </div>

              <button
                onClick={() => onAddToCart && selectedProduct && onAddToCart({ ...selectedProduct, quantity })}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 transition-all"
              >
                <span>Add {quantity} Units to Cart</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitCalculatorView;

