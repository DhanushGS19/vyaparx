import React, { useState } from 'react';
import { ArrowLeft, Building2, Lock, Mail, Phone, MapPin, Landmark, ShieldCheck, AlertCircle } from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import { useAuth } from '../context/AuthContext';

export const EnterpriseAuth = ({ initialMode = 'LOGIN', onBack }) => {
  const [mode, setMode] = useState(initialMode); // 'LOGIN' or 'REGISTER'
  const { loginEnterprise, registerEnterprise } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: 'enterprise@apex.com',
    password: 'password123',
  });

  const [regForm, setRegForm] = useState({
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginEnterprise(loginForm.email, loginForm.password);
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
      await registerEnterprise(regForm);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal Selection</span>
        </button>

        <div className="flex justify-center">
          <BrandLogo size="lg" portal="ENTERPRISE" light />
        </div>

        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          {mode === 'LOGIN' ? 'Enterprise Supplier Login' : 'Register New Enterprise'}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          {mode === 'LOGIN'
            ? 'Sign in to access your inventory, order dispatch, and financial ledgers'
            : 'Join the VyaparX network as a verified supplying enterprise'}
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
            /* ENTERPRISE LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enterprise Work Email
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
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="name@company.com"
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
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Role: Enterprise Supplier</span>
                <span className="text-blue-400 hover:text-blue-300 cursor-pointer">
                  Forgot password?
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign in to Enterprise Portal'}
              </button>

              <div className="mt-4 pt-4 border-t border-slate-700/60 text-center text-xs text-slate-400">
                Don't have an enterprise account yet?{' '}
                <button
                  type="button"
                  onClick={() => setMode('REGISTER')}
                  className="font-semibold text-blue-400 hover:text-blue-300"
                >
                  Register Enterprise
                </button>
              </div>
            </form>
          ) : (
            /* ENTERPRISE REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={regForm.companyName}
                    onChange={(e) => setRegForm({ ...regForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Acme FMCG Corp Ltd"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Trade Name / Brand Name</label>
                  <input
                    type="text"
                    value={regForm.tradeName}
                    onChange={(e) => setRegForm({ ...regForm, tradeName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Acme Wholesale Direct"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    value={regForm.gstin}
                    onChange={(e) => setRegForm({ ...regForm, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 27AAACA1234A1Z5"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="+91 98200 12345"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Official Work Email *</label>
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="distributor@company.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Create Password *</label>
                  <input
                    type="password"
                    required
                    value={regForm.password}
                    onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Warehouse / Head Office Address *</label>
                <input
                  type="text"
                  required
                  value={regForm.address}
                  onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Plot / Street / Industrial Area"
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
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={regForm.state}
                    onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="27"
                  />
                </div>
              </div>

              {/* Settlement Bank Details */}
              <div className="pt-2 border-t border-slate-700/60">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider block mb-2">
                  Settlement & Invoicing Bank Account
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={regForm.bankName}
                      onChange={(e) => setRegForm({ ...regForm, bankName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={regForm.accountNumber}
                      onChange={(e) => setRegForm({ ...regForm, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={regForm.ifscCode}
                      onChange={(e) => setRegForm({ ...regForm, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Enterprise Account...' : 'Complete Enterprise Registration'}
              </button>

              <div className="text-center text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="font-semibold text-blue-400 hover:text-blue-300"
                >
                  Enterprise Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnterpriseAuth;

