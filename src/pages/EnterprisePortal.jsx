import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Cpu,
  Truck,
  Users,
  BarChart3,
  LogOut,
  Bell,
  Menu,
  X,
  Building2,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';

// Enterprise Views
import DashboardView from '../components/enterprise/DashboardView';
import ProductsView from '../components/enterprise/ProductsView';
import InventoryView from '../components/enterprise/InventoryView';
import OrdersView from '../components/enterprise/OrdersView';
import DemandForecastView from '../components/enterprise/DemandForecastView';
import DispatchesView from '../components/enterprise/DispatchesView';
import Retailers360View from '../components/enterprise/Retailers360View';
import AnalyticsView from '../components/enterprise/AnalyticsView';

export const EnterprisePortal = () => {
  const { profile, logout } = useAuth();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [targetOrderId, setTargetOrderId] = useState(null);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Product Catalogue', icon: Package },
    { id: 'inventory', label: 'Inventory & Warehouses', icon: Layers },
    { id: 'orders', label: 'Order Processing', icon: ShoppingCart },
    { id: 'forecasting', label: 'AI Demand Intelligence', icon: Cpu, badge: 'AI' },
    { id: 'dispatches', label: 'Dispatch Tracking', icon: Truck },
    { id: 'retailers', label: 'Retailer 360° & Recovery', icon: Users, badge: 'Core' },
    { id: 'analytics', label: 'Business Analytics', icon: BarChart3 },
  ];

  const handleNavigate = (module, orderId = null) => {
    setActiveModule(module);
    if (orderId) setTargetOrderId(orderId);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row selection:bg-blue-600 selection:text-white">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <BrandLogo size="sm" portal="ENTERPRISE" light />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Desktop / Responsive Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex flex-col h-full">
          {/* Logo & Portal Identifier */}
          <div className="pb-5 border-b border-slate-800 mb-6">
            <BrandLogo size="md" portal="ENTERPRISE" light />
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="truncate text-xs">
                <span className="font-bold text-white block truncate">{profile?.company_name || 'Enterprise'}</span>
                <span className="text-[10px] text-slate-400 font-mono">GST: {profile?.gstin}</span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveModule(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-800 text-blue-400 border border-blue-500/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Signout & Security Notice */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>Strict Role Isolated Session</span>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Topbar */}
        <header className="hidden lg:flex bg-white h-16 border-b border-slate-200/80 px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enterprise Portal</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="text-xs font-bold text-slate-900 capitalize">
              {navigationItems.find(n => n.id === activeModule)?.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-2.5 text-xs text-right">
              <div>
                <span className="font-bold text-slate-900 block">{profile?.company_name}</span>
                <span className="text-[10px] text-slate-500">{profile?.city}, {profile?.state}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs">
                {profile?.company_name?.charAt(0) || 'E'}
              </div>
            </div>
          </div>
        </header>

        {/* View Component Display */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {activeModule === 'dashboard' && <DashboardView onNavigate={handleNavigate} />}
          {activeModule === 'products' && <ProductsView />}
          {activeModule === 'inventory' && <InventoryView />}
          {activeModule === 'orders' && (
            <OrdersView
              initialOrderId={targetOrderId}
              onNavigateToDispatch={(orderId) => handleNavigate('dispatches', orderId)}
            />
          )}
          {activeModule === 'forecasting' && <DemandForecastView />}
          {activeModule === 'dispatches' && <DispatchesView initialOrderId={targetOrderId} />}
          {activeModule === 'retailers' && <Retailers360View />}
          {activeModule === 'analytics' && <AnalyticsView />}
        </main>
      </div>
    </div>
  );
};

export default EnterprisePortal;

