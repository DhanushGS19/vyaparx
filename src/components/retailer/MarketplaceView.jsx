import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ShoppingCart,
  SlidersHorizontal,
  Layers,
  Building2,
  Check,
  CheckCircle,
  Package,
  ArrowRight,
  RefreshCw,
  Scale,
  Plus,
  Minus,
  TrendingUp,
  Tag,
  Sparkles,
  Edit3
} from 'lucide-react';
import { api } from '../../services/api';
import Modal from '../common/Modal';

// Dedicated Interactive Product Ordering Card with Real-Time Resale & Profit Calculation
const ProductOrderCard = ({ product, onAddToCart, onToggleCompare, isComparing }) => {
  const p = product;
  const pricing = p.pricing || {};
  const economics = p.retailEconomics || {};

  const moq = Math.max(1, p.moq || 1);
  const [quantity, setQuantity] = useState(moq);

  // Parse inner unit counts (e.g. Card of 12 Brushes, Case of 24 Bottles)
  const innerCount = economics.unitsPerWholesalePack || 1;
  const innerLabel = economics.innerUnitLabel || 'Piece';

  // Single consumer piece default selling price
  const defaultSingleSell = economics.singleProductSuggestedPrice || 
    Math.round(((economics.suggestedRetailPrice || p.suggested_retail_price || 100) / innerCount) * 100) / 100;

  const [singleSellPrice, setSingleSellPrice] = useState(defaultSingleSell);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Single product economics (what the shopkeeper sells 1 piece to a walk-in customer for)
  const unitCost = economics.effectiveCostPerUnit || pricing.finalPurchasePrice || 0;
  const singleCost = economics.singleProductWholesaleCost || (Math.round((unitCost / innerCount) * 100) / 100);
  const singleProfit = Math.max(0, Math.round((singleSellPrice - singleCost) * 100) / 100);
  const singleMarginPct = singleSellPrice > 0 ? Math.round(((singleProfit / singleSellPrice) * 100) * 10) / 10 : 0;

  // Wholesale pack level economics
  const packSellPrice = Math.round((singleSellPrice * innerCount) * 100) / 100;
  const unitProfit = Math.max(0, Math.round((packSellPrice - unitCost) * 100) / 100);
  const marginPct = packSellPrice > 0 ? Math.round(((unitProfit / packSellPrice) * 100) * 10) / 10 : 0;

  // Wholesale batch / order economics for selected quantity (clamped at MOQ)
  const totalWholesaleCost = Math.round(((pricing.finalPurchasePrice || unitCost) * quantity) * 100) / 100;
  const totalSinglePieces = quantity * innerCount;
  const totalRetailRevenue = Math.round((singleSellPrice * totalSinglePieces) * 100) / 100;
  const totalProfit = Math.round((singleProfit * totalSinglePieces) * 100) / 100;

  const handleQtyChange = (delta) => {
    setQuantity(prev => Math.max(moq, prev + delta));
  };

  const handleOrder = (redirectToCheckout = true) => {
    if (onAddToCart) {
      onAddToCart({
        ...p,
        quantity,
        suggestedRetailPrice: packSellPrice,
        singleProductSuggestedPrice: singleSellPrice,
        singleProductProfit: singleProfit,
        singleProductMarginPct: singleMarginPct,
        unitProfit,
        marginPct,
        totalProfit,
        totalSinglePieces,
        innerUnitLabel: innerLabel,
      }, redirectToCheckout);
    }

    if (!redirectToCheckout) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 p-3 hover:border-emerald-500 hover:shadow-lg transition-all flex flex-col justify-between bg-white relative group">
      {/* Compare Checkbox Pin */}
      <button
        onClick={() => onToggleCompare(p)}
        className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-colors flex items-center gap-1 ${
          isComparing
            ? 'bg-blue-600 text-white border-blue-600 shadow'
            : 'bg-white/95 text-slate-600 border-slate-200 hover:bg-white shadow-xs'
        }`}
        title="Select to compare with other supplier offers"
      >
        <Scale className="w-3 h-3" />
        <span>{isComparing ? 'Comparing' : 'Compare'}</span>
      </button>

      <div>
        {/* Product Image & Tax Slab */}
        <div className="h-28 rounded-xl bg-slate-100 overflow-hidden mb-2 relative">
          <img
            src={p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80'}
            alt={p.name}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <span className="absolute top-1.5 right-1.5 bg-emerald-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
            GST {p.gst_rate}%
          </span>
          {economics.isItcEligible && (
            <span className="absolute bottom-1.5 left-1.5 bg-blue-700/95 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> ITC Credit Eligible
            </span>
          )}
        </div>

        {/* Supplier Info */}
        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mb-0.5">
          <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
          <span className="font-bold text-slate-700 truncate">{p.supplier_name}</span>
          <span>• {p.supplier_city}</span>
        </div>

        {/* Product Title & Details */}
        <h3 className="font-bold text-xs text-slate-900 line-clamp-1 leading-snug" title={p.name}>{p.name}</h3>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
          <span className="font-medium text-slate-600 truncate">{p.uom}</span>
          <span className="font-mono text-[9px] flex-shrink-0 ml-1">SKU: {p.sku}</span>
        </div>

        {/* Wholesale Purchase Rate Bar */}
        <div className="mt-1.5 p-1.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[11px]">
          <div>
            <span className="text-[9px] text-slate-400 block font-medium">Wholesale Rate:</span>
            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
              ₹{pricing.finalPurchasePrice?.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] text-slate-400 ml-1">
              (+{p.gst_rate}% GST)
            </span>
          </div>

          <div className="text-right">
            <span className={`text-[10px] font-bold ${p.stock_available > 0 ? 'text-emerald-600' : 'text-rose-600'} block`}>
              {p.stock_available > 0 ? `${p.stock_available} stock` : 'Out of Stock'}
            </span>
            <span className="text-[9px] text-blue-700 font-semibold bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
              Min: {moq}
            </span>
          </div>
        </div>

        {/* Sleek, Non-Intrusive Single Product Resale Price Suggestion */}
        <div className="mt-1 px-2 py-1 bg-emerald-50/70 border border-emerald-200/70 rounded-lg flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-slate-500 font-medium text-[9px]">Suggested resale:</span>
            {isEditingPrice ? (
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-bold text-slate-700">₹</span>
                <input
                  type="number"
                  step="0.5"
                  value={singleSellPrice}
                  onChange={(e) => setSingleSellPrice(Math.max(0.1, Number(e.target.value) || 0))}
                  className="w-11 px-1 py-0.2 text-[10px] font-bold bg-white border border-emerald-500 rounded outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <span className="font-extrabold text-emerald-950 text-[10px]">
                ₹{singleSellPrice.toFixed(0)}/{innerLabel.toLowerCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="font-bold text-emerald-700 text-[9px]">
              +{singleMarginPct}% margin
            </span>
            <button
              onClick={() => setIsEditingPrice(!isEditingPrice)}
              className="text-slate-400 hover:text-emerald-800 p-0.5 cursor-pointer"
              title="Tweak target single selling price"
            >
              <Edit3 className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 📦 Wholesale Order Controls & Actions */}
      <div className="mt-2 pt-1.5 border-t border-slate-100 space-y-1.5">
        {/* Compact Quantity Stepper + Batch Profit Pill */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-slate-600">Qty:</span>
            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 p-0.5">
              <button
                onClick={() => handleQtyChange(-1)}
                disabled={quantity <= moq}
                className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-30 text-slate-600 cursor-pointer"
                title={`Minimum order is ${moq} units`}
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                value={quantity}
                min={moq}
                onChange={(e) => setQuantity(Math.max(moq, parseInt(e.target.value) || moq))}
                className="w-8 text-center text-xs font-black text-slate-900 bg-transparent outline-none"
              />
              <button
                onClick={() => handleQtyChange(1)}
                className="p-0.5 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <span className="text-[9px] text-slate-400 font-mono">({quantity * innerCount} pcs)</span>
          </div>

          {/* Net Profit Pill */}
          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex-shrink-0">
            +₹{totalProfit.toLocaleString('en-IN')} profit
          </span>
        </div>

        {/* Action Controls: 1-Click Order Now or Add to Cart */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOrder(false)}
            disabled={p.stock_available <= 0}
            className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 border cursor-pointer ${
              justAdded
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
            title="Add to cart and keep browsing wholesale catalogue"
          >
            {justAdded ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Added ✓</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ Cart</span>
              </>
            )}
          </button>

          <button
            onClick={() => handleOrder(true)}
            disabled={p.stock_available <= 0}
            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-sm shadow-emerald-600/30 cursor-pointer truncate"
          >
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Buy • ₹{totalWholesaleCost.toLocaleString('en-IN')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const MarketplaceView = ({ onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('POPULAR');
  const [quickFilter, setQuickFilter] = useState('ALL');

  // Compare Offers Feature
  const [compareList, setCompareList] = useState([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { sortBy };
      if (search) params.search = search;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedSupplier) params.enterpriseId = selectedSupplier;
      if (inStockOnly) params.inStockOnly = '1';

      const res = await api.retailer.getMarketplace(params);

      setProducts(res.products || []);
      setSuppliers(res.suppliers || []);
      setCategories(res.categories || []);
    } catch (e) {
      console.error('Marketplace fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedSupplier, inStockOnly, sortBy]);

  const toggleCompare = (prod) => {
    if (compareList.find(p => p.id === prod.id)) {
      setCompareList(prev => prev.filter(p => p.id !== prod.id));
    } else {
      if (compareList.length >= 4) {
        alert('You can compare up to 4 wholesale products at a time.');
        return;
      }
      setCompareList(prev => [...prev, prod]);
    }
  };

  const handleOpenCompare = async () => {
    if (compareList.length === 0) return;
    setCompareLoading(true);
    setIsCompareModalOpen(true);
    try {
      const ids = compareList.map(p => p.id).join(',');
      const res = await api.retailer.compareProducts(ids);
      setComparisonData(res.comparison || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCompareLoading(false);
    }
  };

  // Quick filter pills for daily essentials
  const quickFilters = [
    { id: 'ALL', label: 'All Wholesale Items' },
    { id: 'BRUSH', label: '🪥 Toothbrush & Oral', keyword: 'brush' },
    { id: 'SOAP', label: '🧼 Soaps & Hygiene', keyword: 'soap' },
    { id: 'OIL', label: '🛢️ Cooking & Hair Oils', keyword: 'oil' },
    { id: 'CLEANING', label: '🧺 Cleaners & Detergents', keyword: 'detergent' },
    { id: 'STAPLES', label: '🌾 Atta, Rice & Salt', keyword: 'atta' },
  ];

  const handleQuickFilterSelect = (filter) => {
    setQuickFilter(filter.id);
    if (filter.id === 'ALL') {
      setSearch('');
    } else if (filter.id === 'BRUSH') {
      setSearch('brush');
    } else if (filter.id === 'SOAP') {
      setSearch('soap');
    } else if (filter.id === 'OIL') {
      setSearch('oil');
    } else if (filter.id === 'CLEANING') {
      setSearch('clean');
    } else if (filter.id === 'STAPLES') {
      setSearch('salt');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wholesale Direct Marketplace</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Order daily essentials directly from verified distributors with transparent factory rates and live retail profit calculation.
            </p>
          </div>

          {compareList.length > 0 && (
            <button
              onClick={handleOpenCompare}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-2 self-start sm:self-auto animate-pulse"
            >
              <Scale className="w-4 h-4" />
              <span>Compare {compareList.length} Selected Offers</span>
            </button>
          )}
        </div>

        {/* Quick Essential Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {quickFilters.map((qf) => (
            <button
              key={qf.id}
              onClick={() => handleQuickFilterSelect(qf)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                quickFilter === qf.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {qf.label}
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search daily essentials: brush, soap, oil, atta, rice, tea..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Supplier Select */}
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none"
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.company_name} ({s.city})</option>
              ))}
            </select>

            {/* In-Stock Toggle */}
            <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="rounded text-emerald-600 w-3.5 h-3.5"
              />
              <span>In Stock Only</span>
            </label>

            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold outline-none"
            >
              <option value="POPULAR">Most Popular</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="NEWEST">New Arrivals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          Loading wholesale marketplace catalogue...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-xs text-slate-400 space-y-2">
          <Package className="w-8 h-8 mx-auto text-slate-300" />
          <p className="font-semibold text-slate-700">No products match your filter criteria.</p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('');
              setSelectedSupplier('');
              setInStockOnly(false);
              setQuickFilter('ALL');
            }}
            className="text-xs text-emerald-600 font-bold hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductOrderCard
              key={p.id}
              product={p}
              onAddToCart={onAddToCart}
              onToggleCompare={toggleCompare}
              isComparing={!!compareList.find(c => c.id === p.id)}
            />
          ))}
        </div>
      )}

      {/* Compare Offers Modal */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        title="Side-by-Side Wholesale Comparison"
        subtitle="Compare supplier wholesale rates, tax structures, and unit economics"
        maxWidth="max-w-4xl"
      >
        {compareLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3">Specification</th>
                  {comparisonData.map(c => (
                    <th key={c.id} className="p-3 font-bold text-slate-900 border-l min-w-[180px]">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y text-slate-700">
                <tr>
                  <td className="p-3 font-semibold bg-slate-50">Supplier</td>
                  {comparisonData.map(c => (
                    <td key={c.id} className="p-3 border-l font-bold text-blue-700">
                      {c.supplier_name} ({c.supplier_city})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold bg-slate-50">Wholesale Base Price</td>
                  {comparisonData.map(c => (
                    <td key={c.id} className="p-3 border-l font-semibold">
                      ₹{c.wholesale_price}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold bg-slate-50">GST Slab (%)</td>
                  {comparisonData.map(c => (
                    <td key={c.id} className="p-3 border-l">
                      {c.gst_rate}% (HSN: {c.hsn_code})
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold bg-slate-50">Final Purchase Price (Unit)</td>
                  {comparisonData.map(c => (
                    <td key={c.id} className="p-3 border-l font-bold text-sm text-slate-900">
                      ₹{c.finalUnitPrice}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold bg-slate-50">Minimum Order (MOQ)</td>
                  {comparisonData.map(c => (
                    <td key={c.id} className="p-3 border-l">
                      {c.moq} Units
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-3 font-semibold bg-slate-50">Action</td>
                  {comparisonData.map(c => (
                    <td key={c.id} className="p-3 border-l">
                      <button
                        onClick={() => {
                          onAddToCart && onAddToCart(c);
                          setIsCompareModalOpen(false);
                        }}
                        className="w-full py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow"
                      >
                        Order This SKU
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MarketplaceView;
