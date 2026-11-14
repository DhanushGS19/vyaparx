/**
 * VyaparX Centralized API Client
 * Manages HTTP communication with Express backend, JWT token injection, and structured error handling.
 */

// Smart Backend URL Resolver:
// 1. If served directly from Express on port 5000: relative '/api'
// 2. If served from Vite (5173 / 4173) or any other port:
//    tries relative '/api' via proxy first, with automatic fallback directly to backend port 5000!
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'file:') {
      return 'http://127.0.0.1:5000/api';
    }
    return '/api';
  }
  return 'http://127.0.0.1:5000/api';
};

const BASE_URL = getBaseUrl();

// Safe universal fetch with automatic cross-port fallback for local dev
const _nativeFetch = (typeof window !== 'undefined' ? window.fetch.bind(window) : globalThis.fetch);
const fetch = async (url, options = {}) => {
  try {
    const res = await _nativeFetch(url, options);
    // If running locally (localhost/127.0.0.1) and relative URL returned 404 (e.g. Vite dev or preview without proxy),
    // automatically retry directly against Express backend on port 5000
    if (res.status === 404 && typeof window !== 'undefined') {
      const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
      if (isLocalhost && typeof url === 'string') {
        if (url.startsWith('/api/')) {
          const directUrl = `http://127.0.0.1:5000${url}`;
          const directRes = await _nativeFetch(directUrl, options);
          if (directRes.status !== 404) return directRes;
        } else if (url.startsWith('/')) {
          const directUrl = `http://127.0.0.1:5000/api${url}`;
          const directRes = await _nativeFetch(directUrl, options);
          if (directRes.status !== 404) return directRes;
        }
      }
    }
    return res;
  } catch (netErr) {
    if (typeof window !== 'undefined') {
      const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
      if (isLocalhost && typeof url === 'string' && url.startsWith('/api/')) {
        const directUrl = `http://127.0.0.1:5000${url}`;
        return _nativeFetch(directUrl, options);
      }
    }
    throw netErr;
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('vyaparx_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const handleResponse = async (response) => {
  let data;
  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('vyaparx_token');
      localStorage.removeItem('vyaparx_user');
      localStorage.removeItem('vyaparx_role');
    }
    const message = data.message || data.error || (response.status === 404 ? 'API route not found (404)' : `Server returned HTTP ${response.status}`);
    const error = new Error(message);
    error.status = response.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }
  return data;
};

export const api = {
  // Auth APIs
  loginEnterprise: (credentials) =>
    fetch(`${BASE_URL}/auth/login-enterprise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(handleResponse),

  loginRetailer: (credentials) =>
    fetch(`${BASE_URL}/auth/login-retailer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(handleResponse),

  registerEnterprise: (data) =>
    fetch(`${BASE_URL}/auth/register-enterprise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  registerRetailer: (data) =>
    fetch(`${BASE_URL}/auth/register-retailer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),

  getMe: () =>
    fetch(`${BASE_URL}/auth/me`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  // Notifications
  getNotifications: () =>
    fetch(`${BASE_URL}/notifications`, {
      headers: getAuthHeaders()
    }).then(handleResponse),

  markNotificationRead: (id) =>
    fetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    }).then(handleResponse),

  markAllNotificationsRead: () =>
    fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: getAuthHeaders()
    }).then(handleResponse),

  // ================= ENTERPRISE APIS =================
  enterprise: {
    getDashboard: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/enterprise/dashboard?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    getProducts: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/enterprise/products?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    getCategories: () =>
      fetch(`${BASE_URL}/enterprise/products/categories`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    createProduct: (data) =>
      fetch(`${BASE_URL}/enterprise/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    updateProduct: (id, data) =>
      fetch(`${BASE_URL}/enterprise/products/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    toggleProductVisibility: (id, isVisible) =>
      fetch(`${BASE_URL}/enterprise/products/${id}/visibility`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isVisible })
      }).then(handleResponse),

    deleteProduct: (id) =>
      fetch(`${BASE_URL}/enterprise/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      }).then(handleResponse),

    getInventory: () =>
      fetch(`${BASE_URL}/enterprise/inventory`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getInventoryHistory: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/enterprise/inventory/history?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    adjustStock: (data) =>
      fetch(`${BASE_URL}/enterprise/inventory/adjust`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    createWarehouse: (data) =>
      fetch(`${BASE_URL}/enterprise/inventory/warehouses`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    getOrders: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/enterprise/orders?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    getOrderDetails: (id) =>
      fetch(`${BASE_URL}/enterprise/orders/${id}`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    acceptOrder: (id) =>
      fetch(`${BASE_URL}/enterprise/orders/${id}/accept`, {
        method: 'POST',
        headers: getAuthHeaders()
      }).then(handleResponse),

    rejectOrder: (id, reason) =>
      fetch(`${BASE_URL}/enterprise/orders/${id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason })
      }).then(handleResponse),

    processOrder: (id) =>
      fetch(`${BASE_URL}/enterprise/orders/${id}/process`, {
        method: 'POST',
        headers: getAuthHeaders()
      }).then(handleResponse),

    deliverOrder: (id) =>
      fetch(`${BASE_URL}/enterprise/orders/${id}/deliver`, {
        method: 'POST',
        headers: getAuthHeaders()
      }).then(handleResponse),

    getDispatches: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/enterprise/dispatches?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    getDispatchDetails: (id) =>
      fetch(`${BASE_URL}/enterprise/dispatches/${id}`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    createDispatch: (data) =>
      fetch(`${BASE_URL}/enterprise/dispatches`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    updateDispatchStatus: (id, status) =>
      fetch(`${BASE_URL}/enterprise/dispatches/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      }).then(handleResponse),

    getRetailers: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/enterprise/retailers?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    getRetailer360: (id) =>
      fetch(`${BASE_URL}/enterprise/retailers/${id}/360`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getReminders: () =>
      fetch(`${BASE_URL}/enterprise/reminders`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    sendReminder: (data) =>
      fetch(`${BASE_URL}/enterprise/reminders/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    updateReminderConfig: (data) =>
      fetch(`${BASE_URL}/enterprise/reminders/config`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    getPayments: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/enterprise/payments?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    reconcilePayment: (data) =>
      fetch(`${BASE_URL}/enterprise/payments/reconcile`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    getPaymentReceipt: (id) =>
      fetch(`${BASE_URL}/enterprise/payments/${id}/receipt`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getDemandOverview: () =>
      fetch(`${BASE_URL}/enterprise/forecasting/overview`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getProductForecast: (id) =>
      fetch(`${BASE_URL}/enterprise/forecasting/product/${id}`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getAnalytics: () =>
      fetch(`${BASE_URL}/enterprise/analytics/overview`, {
        headers: getAuthHeaders()
      }).then(handleResponse),
  },

  // ================= RETAILER APIS =================
  retailer: {
    getDashboard: () =>
      fetch(`${BASE_URL}/retailer/dashboard`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getMarketplace: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/retailer/marketplace?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    getCategories: () =>
      fetch(`${BASE_URL}/retailer/marketplace/categories`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    compareProducts: (productIds) =>
      fetch(`${BASE_URL}/retailer/marketplace/compare?productIds=${productIds}`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    calculateProfit: (data) =>
      fetch(`${BASE_URL}/retailer/calculator/calculate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    compareProfitability: (products) =>
      fetch(`${BASE_URL}/retailer/calculator/compare-profitability`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ products })
      }).then(handleResponse),

    validateCart: (items) =>
      fetch(`${BASE_URL}/retailer/cart/validate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ items })
      }).then(handleResponse),

    checkoutCart: (data) =>
      fetch(`${BASE_URL}/retailer/cart/checkout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    getOrders: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return fetch(`${BASE_URL}/retailer/orders?${qs}`, {
        headers: getAuthHeaders()
      }).then(handleResponse);
    },

    getOrderDetails: (id) =>
      fetch(`${BASE_URL}/retailer/orders/${id}`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getFinancials: () =>
      fetch(`${BASE_URL}/retailer/financials`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    acknowledgeReminder: (reminderId) =>
      fetch(`${BASE_URL}/retailer/financials/reminders/${reminderId}/acknowledge`, {
        method: 'POST',
        headers: getAuthHeaders()
      }).then(handleResponse),

    payOnline: (data) =>
      fetch(`${BASE_URL}/retailer/financials/pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    getIntelligence: () =>
      fetch(`${BASE_URL}/retailer/intelligence`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    getProfitDashboard: () =>
      fetch(`${BASE_URL}/retailer/profit`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    logSales: (data) =>
      fetch(`${BASE_URL}/retailer/profit/log-sales`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),

    getProfile: () =>
      fetch(`${BASE_URL}/retailer/profile`, {
        headers: getAuthHeaders()
      }).then(handleResponse),

    updateProfile: (data) =>
      fetch(`${BASE_URL}/retailer/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      }).then(handleResponse),
  }
};

export default api;

