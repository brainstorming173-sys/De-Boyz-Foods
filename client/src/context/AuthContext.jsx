import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, tokenStore } from '../api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then((r) => setUser(r.user)).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const finish = useCallback((r) => { tokenStore.set(r.token); setUser(r.user); return r.user; }, []);

  const value = {
    user, loading,
    isAdmin: user?.role === 'admin',
    login: async (email, password) => finish(await api.login({ email, password })),
    register: async (data) => finish(await api.register(data)),
    logout: () => { tokenStore.clear(); setUser(null); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
