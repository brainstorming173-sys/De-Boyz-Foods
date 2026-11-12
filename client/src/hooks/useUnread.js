import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Number of unread chat messages for the signed-in person. Checked every 30 seconds.
export function useUnread() {
  const { user } = useAuth();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!user) { setN(0); return; }
    let live = true;
    const load = () => api.unreadMessages().then((r) => live && setN(r.unread || 0)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { live = false; clearInterval(t); document.removeEventListener('visibilitychange', onVisible); };
  }, [user]);
  return n;
}
