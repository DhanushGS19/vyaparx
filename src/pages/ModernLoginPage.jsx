import React, { useState } from 'react';
import {
  Building2,
  Store,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Truck,
  Cpu,
  Layers,
  Phone,
  MapPin,
  Landmark,
  User,
  ShoppingBag
} from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import { useAuth } from '../context/AuthContext';

export const ModernLoginPage = () => {
  const { loginEnterprise, loginRetailer, registerEnterprise, registerRetailer } = useAuth();

  // Active Role: 'ENTERPRISE' or 'RETAILER'
  const [role, setRole] = useState('ENTERPRISE');
  // Mode: 'LOGIN' or 'REGISTER'
  const [mode, setMode] = useState('LOGIN');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login credentials state
  const [loginForm, setLoginForm] = useState({
    email: 'enterprise@apex.com',
    password: 'password123',
  });

  // Enterprise Registration form
  const [entRegForm, setEntRegForm] = useState({
    companyName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400001',
    bankName: 'HDFC Bank Ltd',
    accountNumber: '',
    ifscCode: '',
  });

  // Retailer Registration form
  const [retRegForm, setRetRegForm] = useState({
    shopName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    gstin: '',
    gstType: 'REGULAR',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    stateCode: '27',
    pincode: '400069',
    pricingPreferenceMargin: 18,
  });

  // Handle Role Change
  const handleRoleSwitch = (newRole) => {
    setRole(newRole);
    setError(null);
    if (newRole === 'ENTERPRISE') {
      setLoginForm({
        email: 'enterprise@apex.com',
        password: 'password123',
      });
    } else {
      setLoginForm({
        email: 'retailer@krishna.com',
        password: 'password123',
      });
    }
  };

  // Quick Demo Auto-Fill & Submit
  const handleQuickDemo = async (targetRole, demoEmail, demoPass = 'password123') => {
    setRole(targetRole);
    setMode('LOGIN');
    setLoginForm({ email: demoEmail, password: demoPass });
    setLoading(true);
    setError(null);
    try {
      if (targetRole === 'ENTERPRISE') {
        await loginEnterprise(demoEmail, demoPass);
      } else {
        await loginRetailer(demoEmail, demoPass);
      }
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (role === 'ENTERPRISE') {
        await loginEnterprise(loginForm.email, loginForm.password);
      } else {
        await loginRetailer(loginForm.email, loginForm.password);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (role === 'ENTERPRISE') {
        await registerEnterprise(entRegForm);
      } else {
        await registerRetailer(retRegForm);
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const isEnterprise = role === 'ENTERPRISE';

  return (
    <div className="min-h-screen w-full max-w-full bg-slate-950 text-white flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-x-hidden">
      {/* Background Decorative Ambient Glow Orbs - Contained with overflow-hidden */}
      <div
        className={`absolute top-0 -left-32 sm:-left-48 w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-[110px] sm:blur-[140px] pointer-events-none transition-all duration-700 ${
          isEnterprise ? 'bg-blue-600/20' : 'bg-emerald-600/20'
        }`}
      />
      <div
        className={`absolute bottom-0 -right-32 sm:-right-48 w-72 sm:w-96 h-72 sm:h-96 rounded-full blur-[110px] sm:blur-[140px] pointer-events-none transition-all duration-700 ${
          isEnterprise ? 'bg-indigo-600/15' : 'bg-teal-600/15'
        }`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

      {/* Top Navbar: Compact and Responsive on Mobile */}
      <header className="relative z-20 border-b border-slate-800/80 backdrop-blur-md bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <BrandLogo size="sm" light />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] font-semibold bg-slate-900 border border-slate-700/80 text-slate-300">
              <span className={`w-1.5 h-1.5 rounded-full ${isEnterprise ? 'bg-blue-400' : 'bg-emerald-400'} animate-pulse`} />
              <span className="hidden xs:inline">Live</span> B2B Network
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-12 items-center">
          
          {/* AUTH CARD: Rendered FIRST on mobile (order-1) so phone users see it immediately above the fold */}
          <div className="order-1 lg:order-2 lg:col-span-6 w-full max-w-md mx-auto">
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl relative">
              
              {/* Segmented Role Switcher: Mobile Optimized with No Overflow */}
              <div className="p-1 rounded-xl sm:rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center mb-4 sm:mb-6">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('ENTERPRISE')}
                  className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isEnterprise
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Wholesale Supplier</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSwitch('RETAILER')}
                  className={`flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !isEnterprise
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="truncate">Retail Store / Kirana</span>
                </button>
              </div>

              {/* Title & Badge */}
              <div className="mb-4 sm:mb-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base sm:text-xl md:text-2xl font-black text-white tracking-tight">
                    {mode === 'LOGIN' ? 'Sign In to Portal' : 'Create Account'}
                  </h2>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                    isEnterprise ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isEnterprise ? 'Supplier' : 'Retailer'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
                  {mode === 'LOGIN'
                    ? (isEnterprise ? 'Manage wholesale inventory, orders, and partial shipments' : 'Source directly at wholesale prices and track store profit')
                    : (isEnterprise ? 'Register your company on the VyaparX wholesale network' : 'Register your retail store to access direct distributor pricing')}
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {/* Mode Tabs (Sign In / Register) */}
              <div className="flex border-b border-slate-800 mb-4 sm:mb-5">
                <button
                  type="button"
                  onClick={() => { setMode('LOGIN'); setError(null); }}
                  className={`pb-2 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    mode === 'LOGIN'
                      ? (isEnterprise ? 'border-blue-500 text-blue-400' : 'border-emerald-500 text-emerald-400')
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('REGISTER'); setError(null); }}
                  className={`pb-2 px-3 sm:px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                    mode === 'REGISTER'
                      ? (isEnterprise ? 'border-blue-500 text-blue-400' : 'border-emerald-500 text-emerald-400')
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Register New {isEnterprise ? 'Supplier' : 'Store'}
                </button>
              </div>

              {/* -------------------- LOGIN FORM -------------------- */}
              {mode === 'LOGIN' && (
                <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-300 mb-1">Registered Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2 sm:py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-${
                          isEnterprise ? 'blue-500' : 'emerald-500'
                        }`}
                        placeholder="you@domain.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-300 mb-1">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        className={`w-full pl-9 pr-10 py-2 sm:py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 outline-none transition-all focus:border-${
                          isEnterprise ? 'blue-500' : 'emerald-500'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg mt-2 ${
                      isEnterprise
                        ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    } disabled:opacity-50`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to {isEnterprise ? 'Enterprise' : 'Retailer'} Portal</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* 1-Click Instant Demo Accounts Embedded in Card for Phone Ease */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                      ⚡ Quick 1-Click Demo Login:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {isEnterprise ? (
                        <>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleQuickDemo('ENTERPRISE', 'enterprise@apex.com')}
                            className="py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl bg-blue-950/70 hover:bg-blue-900/80 border border-blue-800/60 text-[10px] sm:text-[11px] text-blue-300 font-semibold transition-all flex items-center justify-between cursor-pointer truncate shadow-xs"
                          >
                            <span className="truncate">Apex Dist.</span>
                            <span className="text-[10px] text-blue-400 font-mono ml-1">→</span>
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleQuickDemo('ENTERPRISE', 'enterprise@bharat.com')}
                            className="py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl bg-blue-950/70 hover:bg-blue-900/80 border border-blue-800/60 text-[10px] sm:text-[11px] text-blue-300 font-semibold transition-all flex items-center justify-between cursor-pointer truncate shadow-xs"
                          >
                            <span className="truncate">Bharat Agro</span>
                            <span className="text-[10px] text-blue-400 font-mono ml-1">→</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleQuickDemo('RETAILER', 'retailer@krishna.com')}
                            className="py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/60 text-[10px] sm:text-[11px] text-emerald-300 font-semibold transition-all flex items-center justify-between cursor-pointer truncate shadow-xs"
                          >
                            <span className="truncate">Krishna Kirana</span>
                            <span className="text-[10px] text-emerald-400 font-mono ml-1">→</span>
                          </button>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleQuickDemo('RETAILER', 'retailer@omsai.com')}
                            className="py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/60 text-[10px] sm:text-[11px] text-emerald-300 font-semibold transition-all flex items-center justify-between cursor-pointer truncate shadow-xs"
                          >
                            <span className="truncate">Om Sai Store</span>
                            <span className="text-[10px] text-emerald-400 font-mono ml-1">→</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </form>
              )}

              {/* -------------------- REGISTER FORMS -------------------- */}
              {mode === 'REGISTER' && isEnterprise && (
                <form onSubmit={handleRegisterSubmit} className="space-y-2.5 max-h-[360px] sm:max-h-[420px] overflow-y-auto pr-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Company Registered Name *</label>
                    <input
                      type="text"
                      required
                      value={entRegForm.companyName}
                      onChange={(e) => setEntRegForm({ ...entRegForm, companyName: e.target.value })}
                      className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                      placeholder="e.g. Apex National Distributing Ltd"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">GSTIN (15 Digits) *</label>
                      <input
                        type="text"
                        required
                        value={entRegForm.gstin}
                        onChange={(e) => setEntRegForm({ ...entRegForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase outline-none focus:border-blue-500"
                        placeholder="27AAAAA1234A1Z5"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Company PAN *</label>
                      <input
                        type="text"
                        required
                        value={entRegForm.pan}
                        onChange={(e) => setEntRegForm({ ...entRegForm, pan: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase outline-none focus:border-blue-500"
                        placeholder="AAAAA1234A"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Work Email *</label>
                      <input
                        type="email"
                        required
                        value={entRegForm.email}
                        onChange={(e) => setEntRegForm({ ...entRegForm, email: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                        placeholder="admin@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Password *</label>
                      <input
                        type="password"
                        required
                        value={entRegForm.password}
                        onChange={(e) => setEntRegForm({ ...entRegForm, password: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Official Phone *</label>
                      <input
                        type="tel"
                        required
                        value={entRegForm.phone}
                        onChange={(e) => setEntRegForm({ ...entRegForm, phone: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                        placeholder="+91 98200 11223"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">City *</label>
                      <input
                        type="text"
                        required
                        value={entRegForm.city}
                        onChange={(e) => setEntRegForm({ ...entRegForm, city: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                        placeholder="Mumbai"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-1"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Complete Enterprise Registration</span>}
                  </button>
                </form>
              )}

              {mode === 'REGISTER' && !isEnterprise && (
                <form onSubmit={handleRegisterSubmit} className="space-y-2.5 max-h-[360px] sm:max-h-[420px] overflow-y-auto pr-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Retail Store / Kirana Name *</label>
                    <input
                      type="text"
                      required
                      value={retRegForm.shopName}
                      onChange={(e) => setRetRegForm({ ...retRegForm, shopName: e.target.value })}
                      className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                      placeholder="e.g. Krishna Supermarket & Kirana"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Proprietor / Owner Name *</label>
                      <input
                        type="text"
                        required
                        value={retRegForm.ownerName}
                        onChange={(e) => setRetRegForm({ ...retRegForm, ownerName: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="Owner name"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Mobile / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        value={retRegForm.phone}
                        onChange={(e) => setRetRegForm({ ...retRegForm, phone: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="+91 98200 44556"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Email *</label>
                      <input
                        type="email"
                        required
                        value={retRegForm.email}
                        onChange={(e) => setRetRegForm({ ...retRegForm, email: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="shop@kirana.in"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">Password *</label>
                      <input
                        type="password"
                        required
                        value={retRegForm.password}
                        onChange={(e) => setRetRegForm({ ...retRegForm, password: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                        placeholder="Min 6 characters"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">GST Registration Type *</label>
                      <select
                        value={retRegForm.gstType}
                        onChange={(e) => setRetRegForm({ ...retRegForm, gstType: e.target.value })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-emerald-500"
                      >
                        <option value="REGULAR">Regular GST (ITC Eligible)</option>
                        <option value="COMPOSITION">Composition Scheme</option>
                        <option value="UNREGISTERED">Unregistered / UR Kirana</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-0.5">GSTIN (Optional)</label>
                      <input
                        type="text"
                        value={retRegForm.gstin}
                        onChange={(e) => setRetRegForm({ ...retRegForm, gstin: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 sm:py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase outline-none focus:border-emerald-500"
                        placeholder="27ABCDE1234F1Z5"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md mt-1"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Complete Retailer Registration</span>}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* SHOWCASE COLUMN: Placed below the auth card on mobile (order-2 lg:order-1) so it never pushes the login card off-screen on phones */}
          <div className="order-2 lg:order-1 lg:col-span-6 space-y-3.5 sm:space-y-6">
            <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[10px] sm:text-[11px] font-semibold">
              <Sparkles className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isEnterprise ? 'text-blue-400' : 'text-emerald-400'}`} />
              <span className="text-slate-300">Intelligent B2B Supply Ecosystem</span>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <h1 className="text-xl sm:text-3xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                {isEnterprise ? (
                  <>
                    Central Command for{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400">
                      Wholesale Suppliers
                    </span>
                  </>
                ) : (
                  <>
                    Wholesale Sourcing for{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400">
                      Smart Retailers
                    </span>
                  </>
                )}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
                {isEnterprise
                  ? 'Manage product catalogs, warehouse stock, AI demand forecasting, partial dispatches, and multi-channel payment recovery.'
                  : 'Order direct from verified distributors, calculate single-item resale margins, claim full GST ITC credits, and settle invoices on terms.'}
              </p>
            </div>

            {/* Dynamic Ecosystem Highlights Card */}
            <div className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-2.5 sm:space-y-3 backdrop-blur-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {isEnterprise ? 'Enterprise Key Capabilities' : 'Retailer Advantage & Tools'}
              </span>

              {isEnterprise ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800/80">
                    <Cpu className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-[11px] sm:text-xs">AI Demand Intelligence</p>
                      <p className="text-[10px] text-slate-400">Multi-month forecasts</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800/80">
                    <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-[11px] sm:text-xs">Oversell Protection</p>
                      <p className="text-[10px] text-slate-400">Locked inventory reserve</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800/80">
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-[11px] sm:text-xs">Partial Dispatches</p>
                      <p className="text-[10px] text-slate-400">Waybill & vehicle tracking</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800/80">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-[11px] sm:text-xs">Retailer 360°</p>
                      <p className="text-[10px] text-slate-400">Reminders & reconciliation</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800/80">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-[11px] sm:text-xs">Single-Piece Margin</p>
                      <p className="text-[10px] text-slate-400">Real-time profit preview</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800/80">
                    <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-[11px] sm:text-xs">Multi-Supplier Cart</p>
                      <p className="text-[10px] text-slate-400">Combined wholesale orders</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800/80">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-[11px] sm:text-xs">ITC GST Tax Engine</p>
                      <p className="text-[10px] text-slate-400">Instant input tax credit</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800/80">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-[11px] sm:text-xs">Direct Settlement</p>
                      <p className="text-[10px] text-slate-400">UPI & custom invoice pay</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 py-3 px-3 text-center text-[10px] sm:text-[11px] text-slate-500">
        <p>© 2026 VyaparX Network Inc. Secure B2B Wholesale Commerce with Automated GST Reconciliation & Logistics Tracking.</p>
      </footer>
    </div>
  );
};

export default ModernLoginPage;
