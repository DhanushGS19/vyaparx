import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import ModernLoginPage from './pages/ModernLoginPage';
import EnterprisePortal from './pages/EnterprisePortal';
import RetailerPortal from './pages/RetailerPortal';
import { RefreshCw } from 'lucide-react';

const MainApp = () => {
  const { isAuthenticated, isEnterprise, isRetailer, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading VyaparX...</p>
        </div>
      </div>
    );
  }

  // If user is authenticated, route strictly to their assigned portal
  // CRITICAL REQUIREMENT: An enterprise user must never access retailer portal. A retailer must never access enterprise portal.
  if (isAuthenticated) {
    if (isEnterprise) {
      return <EnterprisePortal />;
    }
    if (isRetailer) {
      return <RetailerPortal />;
    }
  }

  // Modern, unified, high-aesthetic Authentication Experience
  return <ModernLoginPage />;
};

export const App = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;

