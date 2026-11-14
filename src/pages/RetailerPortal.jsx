import React, { useState } from 'react';
import {
  Store,
  ShoppingCart,
  Calculator,
  Receipt,
  TrendingUp,
  Clock,
  Sparkles,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  Package,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';
import NotificationBell from '../components/common/NotificationBell';
import { useAuth } from '../context/AuthContext';

// Retailer Views
import RetailerHomeView from '../components/retailer/RetailerHomeView';
import MarketplaceView from '../components/retailer/MarketplaceView';
import ProfitCalculatorView from '../components/retailer/ProfitCalculatorView';
import CartCheckoutView from '../components/retailer/CartCheckoutView';
import MyOrdersView from '../components/retailer/MyOrdersView';
import FinancialsView from '../components/retailer/FinancialsView';
import PurchaseIntelligenceView from '../components/retailer/PurchaseIntelligenceView';
import ProfitDashboardView from '../components/retailer/ProfitDashboardView';
import RetailerProfileView from '../components/retailer/RetailerProfileView';

export const RetailerPortal = () => {
  const { profile, logout } = useAuth();
  const [activeModule, setActiveModule] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calculatorProductId, setCalculatorProductId] = useState(null);
  const [cartToast, setCartToast] = useState(null);

  // Cart State (Persisted in LocalStorage & SessionStorage)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('vyaparx_cart') || sessionStorage.getItem('vyaparx_cart');
      if (!saved || saved === 'undefined') return [];
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  });

  const saveCart = (updaterOrItems) => {
    setCartItems((prev) => {
      const nextItems = typeof updaterOrItems === 'function' ? updaterOrItems(prev) : updaterOrItems;
      try {
        localStorage.setItem('vyaparx_cart', JSON.stringify(nextItems));
        sessionStorage.setItem('vyaparx_cart', JSON.stringify(nextItems));
      } catch (e) {
        console.error('Failed to save cart to storage', e);
      }
      return nextItems;
    });
  };

  const handleAddToCart = (product, redirectToCart = true) => {
    const qty = product.quantity || product.moq || 1;
    const prodId = product.id || product.productId;
    saveCart((prev) => {
      const existing = prev.find(i => (i.id || i.productId) === prodId);
      if (existing) {
        return prev.map(i => (i.id || i.productId) === prodId ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...product, id: prodId, quantity: qty }];
    });

    if (redirectToCart) {
      setActiveModule('cart');
    } else {
      setCartToast({
        name: product.name || 'Wholesale item',
        qty,
        id: Date.now(),
      });
      setTimeout(() => {
        setCartToast(null);
      }, 3500);
    }
  };

  const handleUpdateQuantity = (productId, newQty) => {
    saveCart((prev) => prev.map(i => (i.id || i.productId) === productId ? { ...i, quantity: newQty } : i));
  };

  const handleRemoveItem = (productId) => {
    saveCart((prev) => prev.filter(i => (i.id || i.productId) !== productId));
  };

  const handleClearCart = () => {
    saveCart([]);
  };

  const handleReorder = (items) => {
    saveCart((prev) => {
      let current = [...prev];
      items.forEach(it => {
        const prodId = it.product_id || it.id;
        const existing = current.find(i => (i.id || i.productId) === prodId);
        if (existing) {
          current = current.map(i => (i.id || i.productId) === prodId ? { ...i, quantity: i.quantity + it.quantity } : i);
        } else {
          current.push({
            id: prodId,
            productId: prodId,
            name: it.product_name || it.name,
            sku: it.sku,
            wholesale_price: it.base_price || it.wholesale_price,
            quantity: it.quantity,
          });
        }
      });
      return current;
    });
    setActiveModule('cart');
  };

  const navigationItems = [
    { id: 'home', label: 'Store Home', icon: Store },
    { id: 'marketplace', label: 'Wholesale Market', icon: Package, badge: 'Direct FMCG' },
    { id: 'cart', label: 'Cart & Checkout', icon: ShoppingCart, count: cartItems.length },
    { id: 'orders', label: 'My Orders & Dispatches', icon: Clock },
    { id: 'financials', label: 'Ledgers & Payments', icon: Receipt },
    { id: 'intelligence', label: 'Purchase Intelligence', icon: Sparkles },
    { id: 'profit', label: 'Profit Dashboard', icon: TrendingUp },
    { id: 'profile', label: 'Store Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row selection:bg-emerald-600 selection:text-white">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <BrandLogo size="sm" portal="RETAILER" light />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModule('cart')}
            className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 relative"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {cartItems.length}
              </span>
            )}
          </button>
          <NotificationBell />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Responsive Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 flex flex-col h-full">
          {/* Logo & Store Info */}
          <div className="pb-5 border-b border-slate-800 mb-6">
            <BrandLogo size="md" portal="RETAILER" light />
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center gap-2">
              <Store className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="truncate text-xs">
                <span className="font-bold text-white block truncate">{profile?.shop_name || 'Retailer Shop'}</span>
                <span className="text-[10px] text-slate-400">{profile?.city} • {profile?.owner_name}</span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
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
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>

                  {item.count > 0 && (
                    <span className="bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer & Logout */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-[10px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Strict Retailer Role Boundary</span>
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
        {/* Desktop Top Header */}
        <header className="hidden lg:flex bg-white h-16 border-b border-slate-200/80 px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Retailer Portal</span>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="text-xs font-bold text-slate-900 capitalize">
              {navigationItems.find(n => n.id === activeModule)?.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveModule('cart')}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Wholesale Cart ({cartItems.length})</span>
            </button>

            <NotificationBell />

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2.5 text-xs text-right">
              <div>
                <span className="font-bold text-slate-900 block">{profile?.shop_name}</span>
                <span className="text-[10px] text-slate-500">{profile?.city} • {profile?.owner_name}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold flex items-center justify-center text-xs">
                {profile?.shop_name?.charAt(0) || 'R'}
              </div>
            </div>
          </div>
        </header>

        {/* View Component Display */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {activeModule === 'home' && (
            <RetailerHomeView
              onNavigate={(mod) => setActiveModule(mod)}
              onAddToCart={handleAddToCart}
            />
          )}

          {(activeModule === 'marketplace' || activeModule === 'calculator') && (
            <MarketplaceView
              onAddToCart={handleAddToCart}
            />
          )}

          {activeModule === 'cart' && (
            <CartCheckoutView
              cartItems={cartItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onNavigate={(mod) => setActiveModule(mod)}
            />
          )}

          {activeModule === 'orders' && (
            <MyOrdersView onReorder={handleReorder} />
          )}

          {activeModule === 'financials' && (
            <FinancialsView />
          )}

          {activeModule === 'intelligence' && (
            <PurchaseIntelligenceView onAddToCart={handleAddToCart} />
          )}

          {activeModule === 'profit' && (
            <ProfitDashboardView />
          )}

          {activeModule === 'profile' && (
            <RetailerProfileView />
          )}
        </main>
      </div>

      {/* Instant Floating Cart Toast Notification */}
      {cartToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 pr-1">
            <p className="text-xs font-bold text-white leading-tight">Added to Wholesale Cart!</p>
            <p className="text-[11px] text-slate-300 truncate max-w-[220px]">{cartToast.qty}x {cartToast.name}</p>
          </div>
          <button
            onClick={() => {
              setCartToast(null);
              setActiveModule('cart');
            }}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer flex-shrink-0"
          >
            <span>View Cart</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default RetailerPortal;

