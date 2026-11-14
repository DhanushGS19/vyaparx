import React, { useState, useEffect } from 'react';
import {
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Building2,
  Percent,
  Check,
  RefreshCw,
  Save
} from 'lucide-react';
import { api } from '../../services/api';

export const RetailerProfileView = () => {
  const [profile, setProfile] = useState(null);
  const [connectedSuppliers, setConnectedSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    gstin: '',
    gstType: 'REGULAR',
    pricingPreferenceMargin: 18,
  });

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.retailer.getProfile();
      setProfile(res.profile);
      setConnectedSuppliers(res.connectedSuppliers || []);
      if (res.profile) {
        setForm({
          shopName: res.profile.shop_name || '',
          ownerName: res.profile.owner_name || '',
          phone: res.profile.phone || '',
          address: res.profile.address || '',
          city: res.profile.city || '',
          state: res.profile.state || '',
          stateCode: res.profile.state_code || '27',
          pincode: res.profile.pincode || '',
          gstin: res.profile.gstin || '',
          gstType: res.profile.gst_type || 'REGULAR',
          pricingPreferenceMargin: res.profile.pricing_preference_margin || 18,
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.retailer.updateProfile(form);
      setSaveSuccess(true);
      fetchProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Retailer Store Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Retailer Account & Business Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage store registration details, delivery coordinates, and supplier relationships</p>
        </div>

        {saveSuccess && (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>Profile Updated Successfully</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form (8 cols) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
            Store Registration & Tax Details
          </h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shop / Kirana Name *</label>
                <input
                  type="text"
                  required
                  value={form.shopName}
                  onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Proprietor Name *</label>
                <input
                  type="text"
                  required
                  value={form.ownerName}
                  onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GST Registration Type</label>
                <select
                  value={form.gstType}
                  onChange={(e) => setForm({ ...form, gstType: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                >
                  <option value="REGULAR">Regular GST (Input Tax Credit Eligible)</option>
                  <option value="COMPOSITION">Composition Scheme (Non-ITC)</option>
                  <option value="UNREGISTERED">Unregistered Store</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                maxLength={15}
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs uppercase font-mono outline-none"
                placeholder="27AABCK4321C1Z8"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Delivery Address *</label>
              <input
                type="text"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            {/* Pricing Margin Preference */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <label className="block text-xs font-semibold text-emerald-900 mb-1">
                Default Target Profit Margin Preference ({form.pricingPreferenceMargin}%)
              </label>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={form.pricingPreferenceMargin}
                onChange={(e) => setForm({ ...form, pricingPreferenceMargin: Number(e.target.value) })}
                className="w-full accent-emerald-600"
              />
              <span className="text-[10px] text-emerald-700 mt-1 block">
                Automatic suggested selling prices in your profit calculator will default to this target margin.
              </span>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-2 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
            </button>
          </form>
        </div>

        {/* Right Sidebar: Connected Suppliers & Revolving Credit (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Authorized Supplier Network
            </h3>

            <div className="space-y-3">
              {connectedSuppliers.map((s) => (
                <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{s.company_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {s.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{s.city}, {s.state}</p>
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-[11px]">
                    <span className="text-slate-500">Credit Limit:</span>
                    <span className="font-bold text-slate-800">₹{s.credit_limit?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">Payment Terms:</span>
                    <span className="font-semibold text-slate-800">{s.payment_terms_days} Days Net</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerProfileView;

