import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('vyaparx_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize and verify session
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('vyaparx_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res.user) {
          setUser(res.user);
          setRole(res.user.role);
          setProfile(res.profile);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session verification failed:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const loginEnterprise = async (email, password) => {
    const res = await api.loginEnterprise({ email, password });
    if (res.token) {
      localStorage.setItem('vyaparx_token', res.token);
      localStorage.setItem('vyaparx_role', 'ENTERPRISE');
      setToken(res.token);
      setUser(res.user);
      setRole('ENTERPRISE');
      setProfile(res.profile);
    }
    return res;
  };

  const loginRetailer = async (email, password) => {
    const res = await api.loginRetailer({ email, password });
    if (res.token) {
      localStorage.setItem('vyaparx_token', res.token);
      localStorage.setItem('vyaparx_role', 'RETAILER');
      setToken(res.token);
      setUser(res.user);
      setRole('RETAILER');
      setProfile(res.profile);
    }
    return res;
  };

  const registerEnterprise = async (data) => {
    const res = await api.registerEnterprise(data);
    if (res.token) {
      localStorage.setItem('vyaparx_token', res.token);
      localStorage.setItem('vyaparx_role', 'ENTERPRISE');
      setToken(res.token);
      setUser(res.user);
      setRole('ENTERPRISE');
      setProfile(res.profile);
    }
    return res;
  };

  const registerRetailer = async (data) => {
    const res = await api.registerRetailer(data);
    if (res.token) {
      localStorage.setItem('vyaparx_token', res.token);
      localStorage.setItem('vyaparx_role', 'RETAILER');
      setToken(res.token);
      setUser(res.user);
      setRole('RETAILER');
      setProfile(res.profile);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('vyaparx_token');
    localStorage.removeItem('vyaparx_role');
    localStorage.removeItem('vyaparx_user');
    setUser(null);
    setProfile(null);
    setRole(null);
    setToken(null);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getMe();
      if (res.profile) setProfile(res.profile);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isEnterprise: role === 'ENTERPRISE',
        isRetailer: role === 'RETAILER',
        loginEnterprise,
        loginRetailer,
        registerEnterprise,
        registerRetailer,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

