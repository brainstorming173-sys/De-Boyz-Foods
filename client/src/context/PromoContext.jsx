import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { resolveTheme } from '../promoThemes.js';

const PromoCtx = createContext({ promo: { enabled: false }, theme: null, reload: () => {} });
export const usePromo = () => useContext(PromoCtx);

// Fetches the current event from the server, and keeps it fresh so flipping the admin switch
// shows up for customers within a minute (or straight away when they come back to the tab).
export function PromoProvider({ children }) {
  const [promo, setPromo] = useState({ enabled: false });
  const reload = useCallback(() => api.promo().then((p) => setPromo(p?.enabled ? p : { enabled: false })).catch(() => {}), []);

  useEffect(() => {
    reload();
    const t = setInterval(reload, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [reload]);

  const theme = useMemo(() => (promo.enabled ? resolveTheme(promo) : null), [promo]);

  // Page background picks up a faint tint of the event colour; removed again when the promo is off.
  useEffect(() => {
    document.body.style.backgroundColor = theme ? theme.tint : '';
    return () => { document.body.style.backgroundColor = ''; };
  }, [theme]);

  const value = useMemo(() => ({ promo, theme, reload }), [promo, theme, reload]);
  return <PromoCtx.Provider value={value}>{children}</PromoCtx.Provider>;
}
