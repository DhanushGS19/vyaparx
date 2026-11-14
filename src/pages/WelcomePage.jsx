import React, { useState } from 'react';
import {
  Building2,
  Store,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  Truck,
  ReceiptIndianRupee,
  Calculator,
  UserCheck
} from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import { useAuth } from '../context/AuthContext';

export const WelcomePage = ({ onSelectAuth }) => {
  const { loginEnterprise, loginRetailer } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(null);

  const handleQuickDemo = async (type, email) => {
    setDemoLoading(true);
    setDemoError(null);
    try {
      if (type === 'ENTERPRISE') {
        await loginEnterprise(email, 'password123');
      } else {
        await loginRetailer(email, 'password123');
      }
    } catch (err) {
      setDemoError(err.message || 'Quick demo login failed.');
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 bg-slate-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <BrandLogo size="md" light />
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Live Enterprise B2B Network
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 flex flex-col justify-center">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-semibold tracking-wide uppercase mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen Wholesale Supply Chain Intelligence
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight sm:leading-none">
            One Application. Two Independent Portals.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400">
              One Connected Ecosystem.
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Connecting large supplying enterprises directly with neighborhood retailers. Digitizing wholesale ordering, automated stock reservations, GST calculations, and AI demand forecasting.
          </p>

          {demoError && (
            <div className="mt-4 p-3 rounded-lg bg-red-950/70 border border-red-800 text-red-300 text-xs">
              {demoError}
            </div>
          )}
        </div>

        {/* TWO PROMINENT PORTAL OPTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full mb-12">
          {/* OPTION 1: ENTERPRISE PORTAL */}
          <div className="relative group rounded-3xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-blue-500/30 p-8 shadow-xl shadow-blue-950/50 hover:border-blue-500/60 transition-all duration-300 flex flex-col justify-between">
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
              <span className="bg-blue-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow">
                Wholesale Suppliers
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-105 transition-transform">
                <Building2 className="w-7 h-7" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Enterprise Portal</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Centralized business command center for large supplying companies, FMCG manufacturers, and distributors.
              </p>

              {/* Module Highlights */}
              <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>AI Demand Intelligence & Time-Series Forecasting</span>
                </li>
                <li className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>Warehouse Inventory, Reservation & Oversell Shield</span>
                </li>
                <li className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>Partial Dispatch Management & Waybill Tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <ReceiptIndianRupee className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>Retailer 360° Ledgers & Multi-Channel Payment Reminders</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onSelectAuth('ENTERPRISE_LOGIN')}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group-hover:gap-3"
              >
                <span>Enterprise Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectAuth('ENTERPRISE_REGISTER')}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-all text-center block"
              >
                Register Enterprise
              </button>

              {/* Quick Demo Fill */}
              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-[11px] font-medium text-slate-400 mb-2">Instant Demo Login:</p>
                <div className="flex gap-2">
                  <button
                    disabled={demoLoading}
                    onClick={() => handleQuickDemo('ENTERPRISE', 'enterprise@apex.com')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-[11px] text-blue-300 font-medium transition-colors"
                  >
                    Apex Distributing
                  </button>
                  <button
                    disabled={demoLoading}
                    onClick={() => handleQuickDemo('ENTERPRISE', 'enterprise@bharat.com')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-[11px] text-blue-300 font-medium transition-colors"
                  >
                    Bharat Agro
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* OPTION 2: RETAILER PORTAL */}
          <div className="relative group rounded-3xl bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-emerald-500/30 p-8 shadow-xl shadow-emerald-950/50 hover:border-emerald-500/60 transition-all duration-300 flex flex-col justify-between">
            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
              <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full shadow">
                Shopkeepers & Kirana
              </span>
            </div>

            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-105 transition-transform">
                <Store className="w-7 h-7" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">Retailer Portal</h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Streamlined wholesale ordering, profit engineering, and purchase management tailored for retailers.
              </p>

              {/* Module Highlights */}
              <ul className="space-y-2.5 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Live Resale Pricing & Profit Display on Every Daily Essential</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Configurable GST Engine with Input Tax Credit (ITC)</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Estimated vs Realized Profit Dashboard & Logger</span>
                </li>
                <li className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Multi-Supplier Cart Checkout & Payment Ledgers</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onSelectAuth('RETAILER_LOGIN')}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 group-hover:gap-3"
              >
                <span>Retailer Login</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onSelectAuth('RETAILER_REGISTER')}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition-all text-center block"
              >
                Register Retailer
              </button>

              {/* Quick Demo Fill */}
              <div className="pt-3 border-t border-slate-800 text-center">
                <p className="text-[11px] font-medium text-slate-400 mb-2">Instant Demo Login:</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    disabled={demoLoading}
                    onClick={() => handleQuickDemo('RETAILER', 'retailer@krishna.com')}
                    className="py-1.5 px-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-[10px] text-emerald-300 font-medium truncate"
                    title="Krishna Supermarket (Regular GST)"
                  >
                    Krishna Mart
                  </button>
                  <button
                    disabled={demoLoading}
                    onClick={() => handleQuickDemo('RETAILER', 'retailer@gupta.com')}
                    className="py-1.5 px-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-[10px] text-emerald-300 font-medium truncate"
                    title="Gupta Kirana (Regular GST)"
                  >
                    Gupta Kirana
                  </button>
                  <button
                    disabled={demoLoading}
                    onClick={() => handleQuickDemo('RETAILER', 'retailer@mahalaxmi.com')}
                    className="py-1.5 px-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-[10px] text-emerald-300 font-medium truncate"
                    title="Mahalaxmi Mart (Composition GST)"
                  >
                    Mahalaxmi Mart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Strict Isolation Notice */}
        <div className="max-w-2xl mx-auto text-center px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <span>
            <strong>Strict Portal Boundary:</strong> Enterprise accounts and Retailer accounts operate in strict isolation. Portal-switching is disabled by architecture and protected via backend role verification.
          </span>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 VyaparX Network Technologies India. Connecting Suppliers. Empowering Retailers. Simplifying Business.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>GST Compliant</span>
            <span>•</span>
            <span>Real-time Inward/Outward</span>
            <span>•</span>
            <span>Bank Reconciliation</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;

