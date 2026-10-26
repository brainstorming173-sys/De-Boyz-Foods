// Every fetch to the backend goes through this file.
const TOKEN_KEY = 'db_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  health: () => request('/health'),

  // auth
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  googleConfig: () => request('/auth/google-config'),
  google: (credential) => request('/auth/google', { method: 'POST', body: { credential } }),
  me: () => request('/auth/me'),
  verifyEmail: (token) => request('/auth/verify-email', { method: 'POST', body: { token } }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),

  // catalog
  categories: () => request('/categories'),
  products: (params = {}) => request(`/products?${new URLSearchParams(params)}`),
  mealsToday: () => request('/meals/today'),

  // orders & payments
  storeSettings: () => request('/orders/settings'),
  placeOrder: (b) => request('/orders', { method: 'POST', body: b }),
  trackOrder: (no) => request(`/orders/track/${encodeURIComponent(no)}`),
  myOrders: () => request('/orders/mine'),
  paymentNetworks: () => request('/payments/networks'),
  chargeMomo: (orderNo, phone, network) => request('/payments/momo/charge', { method: 'POST', body: { orderNo, phone, network } }),
  submitManualPayment: (orderNo, txnId, senderPhone) => request('/payments/momo/manual', { method: 'POST', body: { orderNo, txnId, senderPhone } }),
  paymentStatus: (orderNo) => request(`/payments/status/${encodeURIComponent(orderNo)}`),

  // admin
  admin: {
    stats: () => request('/orders/stats'),
    orders: (status) => request(`/orders${status ? `?status=${status}` : ''}`),
    setOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    setPaymentStatus: (id, status) => request(`/orders/${id}/payment`, { method: 'PATCH', body: { status } }),
    meals: () => request('/admin/meals'),
    createMeal: (b) => request('/meals', { method: 'POST', body: b }),
    updateMeal: (id, b) => request(`/meals/${id}`, { method: 'PATCH', body: b }),
    deleteMeal: (id) => request(`/meals/${id}`, { method: 'DELETE' }),
    createProduct: (b) => request('/products', { method: 'POST', body: b }),
    updateProduct: (id, b) => request(`/products/${id}`, { method: 'PATCH', body: b }),
    deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    createCategory: (name) => request('/categories', { method: 'POST', body: { name } }),
    uploadImage: (file) => {
      const form = new FormData();
      form.append('image', file);
      return request('/uploads', { method: 'POST', form });
    },
  },
};

export const money = (n) => {
  const v = Number(n) || 0;
  return `GH₵${Number.isInteger(v) ? v : v.toFixed(2)}`;
};
