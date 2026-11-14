import React, { useState } from 'react';
import {
  Building2,
  Store,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Phone,
  MapPin,
  User,
  ShoppingBag,
  FileText
} from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import { useAuth } from '../context/AuthContext';

export const ModernLoginPage = () => {
  const { loginEnterprise, loginRetailer, registerEnterprise, registerRetailer } = useAuth();

  // Role: 'ENTERPRISE' or 'RETAILER'
  const [role, setRole] = useState('ENTERPRISE');
  // Mode: 'LOGIN' or 'REGISTER'
  const [mode, setMode] = useState('LOGIN');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Login form state
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

  // 1-Click Quick Demo Login
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-8 selection:bg-blue-600 selection:text-white">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="flex justify-center mb-2">
          <BrandLogo size="lg" />
        </div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide">
          B2B Wholesale & Retail Supply Chain Network
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/80 border border-slate-200 p-6 sm:p-8 transition-all">
        {/* Role Segmented Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200/60">
          <button
            type="button"
            onClick={() => handleRoleSwitch('ENTERPRISE')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isEnterprise
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Wholesale Supplier</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleSwitch('RETAILER')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              !isEnterprise
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Retail Store / Kirana</span>
          </button>
        </div>

        {/* Form Title & Subtitle */}
        <div className="mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            {mode === 'LOGIN'
              ? (isEnterprise ? 'Supplier Sign In' : 'Retailer Sign In')
              : (isEnterprise ? 'Register Supplier' : 'Register Retail Store')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'LOGIN'
              ? (isEnterprise ? 'Access wholesale inventory, dispatches, and B2B orders' : 'Order at direct factory rates and track your store margins')
              : (isEnterprise ? 'Join the network as a verified distributor or manufacturer' : 'Register your retail store for instant wholesale access')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* -------------------- LOGIN MODE -------------------- */}
        {mode === 'LOGIN' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder={isEnterprise ? 'enterprise@apex.com' : 'retailer@krishna.com'}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-medium placeholder-slate-400 outline-none transition-all focus:bg-white focus:border-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                isEnterprise
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
              } disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In as {isEnterprise ? 'Supplier' : 'Retailer'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* 1-Click Quick Demo Login */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] mb-2 font-semibold">
                <span className="text-slate-500">Quick Demo Login (1-Click):</span>
                <span className="text-slate-400 text-[10px]">Pass: password123</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {isEnterprise ? (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickDemo('ENTERPRISE', 'enterprise@apex.com')}
                      className="py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs"
                    >
                      <span className="truncate">Apex Distributing</span>
                      <span className="text-[11px] font-mono">→</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickDemo('ENTERPRISE', 'enterprise@bharat.com')}
                      className="py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs"
                    >
                      <span className="truncate">Bharat Agro</span>
                      <span className="text-[11px] font-mono">→</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickDemo('RETAILER', 'retailer@krishna.com')}
                      className="py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs"
                    >
                      <span className="truncate">Krishna Kirana</span>
                      <span className="text-[11px] font-mono">→</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleQuickDemo('RETAILER', 'retailer@gupta.com')}
                      className="py-2 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold transition-all flex items-center justify-between cursor-pointer shadow-xs"
                    >
                      <span className="truncate">Gupta Kirana</span>
                      <span className="text-[11px] font-mono">→</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Toggle Mode */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('REGISTER');
                  setError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Don't have an account?{' '}
                <span className={`font-bold underline ${isEnterprise ? 'text-blue-600' : 'text-emerald-600'}`}>
                  Register {isEnterprise ? 'Supplier' : 'Store'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* -------------------- REGISTER MODE: ENTERPRISE -------------------- */}
        {mode === 'REGISTER' && isEnterprise && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                value={entRegForm.companyName}
                onChange={(e) => setEntRegForm({ ...entRegForm, companyName: e.target.value })}
                placeholder="Apex National Distributing Ltd"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN *</label>
                <input
                  type="text"
                  required
                  maxLength="15"
                  value={entRegForm.gstin}
                  onChange={(e) => setEntRegForm({ ...entRegForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="27AAACA1234A1Z5"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={entRegForm.phone}
                  onChange={(e) => setEntRegForm({ ...entRegForm, phone: e.target.value })}
                  placeholder="+91 98200 12345"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={entRegForm.email}
                  onChange={(e) => setEntRegForm({ ...entRegForm, email: e.target.value })}
                  placeholder="admin@supplier.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={entRegForm.password}
                  onChange={(e) => setEntRegForm({ ...entRegForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={entRegForm.city}
                  onChange={(e) => setEntRegForm({ ...entRegForm, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">State *</label>
                <input
                  type="text"
                  required
                  value={entRegForm.state}
                  onChange={(e) => setEntRegForm({ ...entRegForm, state: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/25 transition-all cursor-pointer"
            >
              {loading ? 'Creating Supplier Account...' : 'Complete Supplier Registration'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Already have an account? <span className="text-blue-600 font-bold underline">Sign in</span>
              </button>
            </div>
          </form>
        )}

        {/* -------------------- REGISTER MODE: RETAILER -------------------- */}
        {mode === 'REGISTER' && !isEnterprise && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Retail Store / Shop Name *</label>
              <input
                type="text"
                required
                value={retRegForm.shopName}
                onChange={(e) => setRetRegForm({ ...retRegForm, shopName: e.target.value })}
                placeholder="Shree Ganesh Kirana & General Stores"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  value={retRegForm.ownerName}
                  onChange={(e) => setRetRegForm({ ...retRegForm, ownerName: e.target.value })}
                  placeholder="Rameshwar Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={retRegForm.phone}
                  onChange={(e) => setRetRegForm({ ...retRegForm, phone: e.target.value })}
                  placeholder="+91 98190 22334"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={retRegForm.email}
                  onChange={(e) => setRetRegForm({ ...retRegForm, email: e.target.value })}
                  placeholder="ramesh@kirana.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={retRegForm.password}
                  onChange={(e) => setRetRegForm({ ...retRegForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={retRegForm.city}
                  onChange={(e) => setRetRegForm({ ...retRegForm, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  maxLength="15"
                  value={retRegForm.gstin}
                  onChange={(e) => setRetRegForm({ ...retRegForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="27AABCK4321C1Z8"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 outline-none focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
            >
              {loading ? 'Creating Store Account...' : 'Complete Retailer Registration'}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Already have an account? <span className="text-emerald-600 font-bold underline">Sign in</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Clean Footer */}
      <p className="text-[11px] text-slate-400 mt-6 text-center font-medium">
        © 2026 VyaparX • Modern B2B Supply Chain & Logistics Network
      </p>
    </div>
  );
};

export default ModernLoginPage;
