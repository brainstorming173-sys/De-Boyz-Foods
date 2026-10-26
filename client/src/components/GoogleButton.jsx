import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise;
const loadGoogle = () =>
  (scriptPromise ||= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const s = document.createElement('script');
    s.src = SRC; s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Google')); };
    document.head.appendChild(s);
  }));

// "Continue with Google". Renders nothing until the server reports a Google client ID,
// so the site works exactly as before if Google isn't set up.
export default function GoogleButton({ onDone, onError, text = 'continue_with' }) {
  const { google } = useAuth();
  const box = useRef(null);
  const [clientId, setClientId] = useState(null);
  const cb = useRef({});
  cb.current = { google, onDone, onError };

  useEffect(() => { api.googleConfig().then((r) => setClientId(r.clientId)).catch(() => {}); }, []);

  useEffect(() => {
    if (!clientId || !box.current) return;
    let cancelled = false;
    loadGoogle().then(() => {
      if (cancelled || !box.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try { cb.current.onDone(await cb.current.google(credential)); }
          catch (e) { cb.current.onError?.(e.message); }
        },
      });
      box.current.innerHTML = '';
      window.google.accounts.id.renderButton(box.current, {
        theme: 'outline', size: 'large', shape: 'pill', text, width: Math.min(box.current.offsetWidth || 320, 400),
      });
    }).catch(() => cb.current.onError?.('Could not load Google sign-in. Check your connection.'));
    return () => { cancelled = true; };
  }, [clientId, text]);

  if (!clientId) return null;
  return (
    <div>
      <div ref={box} className="flex min-h-[44px] w-full justify-center" />
      <div className="my-4 flex items-center gap-3 text-xs text-black/40">
        <span className="h-px flex-1 bg-black/10" />or<span className="h-px flex-1 bg-black/10" />
      </div>
    </div>
  );
}
