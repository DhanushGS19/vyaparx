import React, { useState } from 'react';
import { ArrowLeft, Store, Lock, Mail, Phone, MapPin, Calculator, ShieldCheck, AlertCircle } from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import { useAuth } from '../context/AuthContext';

export const RetailerAuth = ({ initialMode = 'LOGIN', onBack }) => {
  const [mode, setMode] = useState(initialMode); // 'LOGIN' or 'REGISTER'
  const { loginRetailer, registerRetailer } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: 'retailer@krishna.com',
    password: 'password123',
  });

  const [regForm, setRegForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    gstin: '',
    gstType: 'REGULAR', // REGULAR, COMPOSITION, UNREGISTERED
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400069',
    pricingPreferenceMargin: 18,
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginRetailer(loginForm.email, loginForm.password);
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await registerRetailer(regForm);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal Selection</span>
        </button>

        <div className="flex justify-center">
          <BrandLogo size="lg" portal="RETAILER" light />
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          {mode === 'LOGIN' ? 'Retailer Shopkeeper Login' : 'Register Retailer Account'}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          {mode === 'LOGIN'
            ? 'Sign in to order wholesale products, calculate profit margins, and manage payments'
            : 'Join VyaparX to connect directly with wholesale distributors and boost store profits'}
        </p>
      </div>

      <div className={`sm:mx-auto sm:w-full ${mode === 'LOGIN' ? 'sm:max-w-md' : 'sm:max-w-2xl'}`}>
        <div className="bg-slate-800/90 border border-slate-700/80 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-900/30 border border-red-700/50 flex items-start gap-3 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'LOGIN' ? (
            /* RETAILER LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Retailer Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="shop@store.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Role: Retailer / Shopkeeper</span>
                <span className="text-emerald-400 hover:text-emerald-300 cursor-pointer">
                  Forgot password?
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign in to Retailer Portal'}
              </button>

              <div className="mt-4 pt-4 border-t border-slate-700/60 text-center text-xs text-slate-400">
                New shopkeeper on VyaparX?{' '}
                <button
                  type="button"
                  onClick={() => setMode('REGISTER')}
                  className="font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Register Retailer
                </button>
              </div>
            </form>
          ) : (
            /* RETAILER REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Shop / Store Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.shopName}
                    onChange={(e) => setRegForm({ ...regForm, shopName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Mahavir Kirana Stores"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Proprietor / Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.ownerName}
                    onChange={(e) => setRegForm({ ...regForm, ownerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. Suresh Kumar"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (WhatsApp) *</label>
                  <input
                    type="tel"
                    required
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="+91 98200 54321"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="retailer@store.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Create Password *</label>
                  <input
                    type="password"
                    required
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Min 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GST Registration Type</label>
                  <select
                    value={regForm.gstType}
                    onChange={(e) => setRegForm({ ...regForm, gstType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="REGULAR">Regular GST (Input Tax Credit Eligible)</option>
                    <option value="COMPOSITION">Composition Scheme (Non-ITC)</option>
                    <option value="UNREGISTERED">Unregistered Small Shop</option>
                  </select>
                </div>
              </div>

              {regForm.gstType !== 'UNREGISTERED' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number (if registered)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={regForm.gstin}
                    onChange={(e) => setRegForm({ ...regForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="e.g. 27AABCK4321C1Z8"
                  />
                </div>
              )}

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Store / Shop Delivery Address *</label>
                <input
                  type="text"
                  required
                  value={regForm.address}
                  onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Shop No., Market / Road / Landmark"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={regForm.city}
                    onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={regForm.state}
                    onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GST State Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={regForm.stateCode}
                    onChange={(e) => setRegForm({ ...regForm, stateCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="27"
                  />
                </div>
              </div>

              {/* Profit Preference */}
              <div className="pt-2 border-t border-slate-700/60">
                <label className="block text-xs font-semibold text-emerald-400 mb-1">
                  Default Target Selling Profit Margin (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={regForm.pricingPreferenceMargin}
                    onChange={(e) => setRegForm({ ...regForm, pricingPreferenceMargin: Number(e.target.value) })}
                    className="flex-1 accent-emerald-500"
                  />
                  <span className="text-sm font-bold text-white w-12 text-right">
                    {regForm.pricingPreferenceMargin}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Used by the Smart Pricing Calculator to generate automatic retail price recommendations.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Retailer Account...' : 'Complete Retailer Registration'}
              </button>

              <div className="text-center text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Retailer Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RetailerAuth;

