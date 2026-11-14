import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Package,
  Check,
  AlertCircle,
  Tag,
  IndianRupee,
  Layers,
  RefreshCw
} from 'lucide-react';
import { api } from '../../services/api';
import StatusBadge from '../common/StatusBadge';
import Modal from '../common/Modal';

export const ProductsView = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form State
  const initialForm = {
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    description: '',
    imageUrl: '',
    uom: 'Carton',
    basePrice: '',
    gstRate: '18',
    hsnCode: '',
    wholesalePrice: '',
    suggestedRetailPrice: '',
    moq: '1',
    stockAvailable: '100',
    status: 'ACTIVE',
    isVisible: 1,
    bulkTiers: [{ min_qty: 25, price: '' }],
  };

  const [formData, setFormData] = useState(initialForm);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedVisibility) params.visibility = selectedVisibility;

      const [prodRes, catRes] = await Promise.all([
        api.enterprise.getProducts(params),
        api.enterprise.getCategories(),
      ]);

      setProducts(prodRes.products || []);
      setCategories(catRes.categories || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedStatus, selectedVisibility]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      ...initialForm,
      categoryId: categories[0]?.id || '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    let tiers = [];
    if (p.bulk_pricing_json) {
      try { tiers = JSON.parse(p.bulk_pricing_json); } catch (e) {}
    }
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      categoryId: p.category_id,
      description: p.description || '',
      imageUrl: p.image_url || '',
      uom: p.uom,
      basePrice: p.base_price,
      gstRate: String(p.gst_rate),
      hsnCode: p.hsn_code,
      wholesalePrice: p.wholesale_price,
      suggestedRetailPrice: p.suggested_retail_price || '',
      moq: String(p.moq),
      stockAvailable: String(p.stock_available),
      status: p.status,
      isVisible: p.is_visible,
      bulkTiers: tiers.length ? tiers : [{ min_qty: 25, price: '' }],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setFormError(null);

    try {
      const validTiers = formData.bulkTiers
        .filter(t => t.min_qty && t.price)
        .map(t => ({ min_qty: Number(t.min_qty), price: Number(t.price) }));

      const payload = {
        ...formData,
        bulkPricing: validTiers,
      };

      if (editingProduct) {
        await api.enterprise.updateProduct(editingProduct.id, payload);
      } else {
        await api.enterprise.createProduct(payload);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setModalLoading(false);
    }
  };

  const handleToggleVisibility = async (p) => {
    const newVis = p.is_visible === 1 ? 0 : 1;
    try {
      await api.enterprise.toggleProductVisibility(p.id, newVis);
      setProducts(prev => prev.map(item => item.id === p.id ? { ...item, is_visible: newVis } : item));
    } catch (e) {
      alert('Failed to update visibility');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to archive this product? It will be hidden from the catalog.')) return;
    try {
      await api.enterprise.deleteProduct(id);
      fetchProducts();
    } catch (e) {
      alert('Failed to archive product');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wholesale Product Catalogue</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage SKU specifications, HSN tax classifications, MOQ, and retailer visibility</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-600/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or HSN code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Visibility Filter */}
          <select
            value={selectedVisibility}
            onChange={(e) => setSelectedVisibility(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Visibility</option>
            <option value="1">Visible to Retailers</option>
            <option value="0">Hidden / Draft</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-3">SKU & HSN</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Wholesale Price</th>
                <th className="py-3 px-3 text-center">GST Slab</th>
                <th className="py-3 px-3 text-center">Available Stock</th>
                <th className="py-3 px-3 text-center">Visibility</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading product catalogue...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No products found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          <img
                            src={p.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80'}
                            alt={p.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-[10px] text-slate-500">Unit: {p.uom} • MOQ: {p.moq}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="font-mono text-xs font-semibold text-slate-800">{p.sku}</span>
                      <p className="text-[10px] text-slate-400">HSN: {p.hsn_code}</p>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium">
                        {p.category_name}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <p className="font-bold text-slate-900">₹{p.wholesale_price?.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-400 line-through">Base: ₹{p.base_price}</p>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                        {p.gst_rate}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`font-bold ${
                          p.stock_available === 0 ? 'text-red-600' :
                          p.stock_available <= 25 ? 'text-amber-600' : 'text-slate-900'
                        }`}>
                          {p.stock_available}
                        </span>
                        {p.stock_reserved > 0 && (
                          <span className="text-[10px] text-amber-600 font-medium">({p.stock_reserved} res)</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleVisibility(p)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                          p.is_visible === 1
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Click to toggle retailer marketplace visibility"
                      >
                        {p.is_visible === 1 ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{p.is_visible === 1 ? 'Live' : 'Hidden'}</span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                          title="Archive Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Wholesale Product' : 'Add Wholesale Product'}
        subtitle="Configure pricing, tax rates, inventory units, and wholesale bulk discounts"
        maxWidth="max-w-3xl"
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="product-form"
              onClick={handleSaveProduct}
              disabled={modalLoading}
              className="px-5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{modalLoading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}</span>
            </button>
          </div>
        }
      >
        <form id="product-form" onSubmit={handleSaveProduct} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Fortune Sunlite Refined Oil 1L"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product SKU *</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. OIL-FOR-1L"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measurement (UOM) *</label>
              <input
                type="text"
                required
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Carton (12 Pouches), Bag (25kg), Box"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">HSN Code *</label>
              <input
                type="text"
                required
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 1512"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Applicable GST Rate (%) *</label>
              <select
                value={formData.gstRate}
                onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="0">0% (Nil / Exempt)</option>
                <option value="5">5% (Essential Commodities)</option>
                <option value="12">12% (Standard Food / Confectionery)</option>
                <option value="18">18% (Standard FMCG / Detergents)</option>
                <option value="28">28% (Luxury / Aerated Drinks)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Base Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="100.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Wholesale Discounted Price (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.wholesalePrice}
                onChange={(e) => setFormData({ ...formData, wholesalePrice: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="95.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Suggested Retail Price (MSRP) (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.suggestedRetailPrice}
                onChange={(e) => setFormData({ ...formData, suggestedRetailPrice: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="125.00"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Order Quantity (MOQ) *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.moq}
                onChange={(e) => setFormData({ ...formData, moq: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Available Stock Units *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.stockAvailable}
                onChange={(e) => setFormData({ ...formData, stockAvailable: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Image URL</label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Brand specifications, packaging details, and quality certifications..."
            />
          </div>

          {/* Visibility & Status Checkbox */}
          <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={formData.isVisible === 1}
                onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked ? 1 : 0 })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Visible to Retailers in Marketplace</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={formData.status === 'ACTIVE'}
                onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>Catalog Active Status</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProductsView;

