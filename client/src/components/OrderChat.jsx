import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, MessageCircle } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loading from './Loading.jsx';

const QUICK = ['Your order is on its way.', 'Your order is ready for pickup.', 'We are preparing your order now.', 'Please confirm your delivery location.'];

// One conversation about one order. Used by the customer (order page) and by the admin (Messages tab).
// New messages are fetched every 8 seconds while the page is open.
export default function OrderChat({ orderNo, asAdmin = false, onRead }) {
  const { user, loading } = useAuth();
  const [thread, setThread] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const count = useRef(0);

  useEffect(() => {
    if (!user) return;
    let live = true;
    setThread(null); setError(''); count.current = 0;
    const load = () => api.orderMessages(orderNo)
      .then((r) => { if (live) { setThread(r.messages); onRead?.(); } })
      .catch((e) => { if (live) { setError(e.message); setThread([]); } });
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 8000);
    return () => { live = false; clearInterval(t); };
  }, [orderNo, user]);

  // Scroll to the newest message only when one arrives.
  useEffect(() => {
    if (thread && thread.length !== count.current) { count.current = thread.length; end.current?.scrollIntoView({ block: 'nearest' }); }
  }, [thread]);

  async function send(e, preset) {
    e?.preventDefault();
    const body = (preset ?? text).trim();
    if (!body || busy) return;
    setBusy(true); setError('');
    try {
      const m = await api.sendOrderMessage(orderNo, body);
      setThread((cur) => [...(cur || []), m]);
      setText('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  if (loading) return null;
  if (!user) {
    return (
      <p className="rounded-2xl border border-dashed border-black/10 bg-white px-5 py-6 text-center text-sm text-black/60">
        <Link to="/login" state={{ from: `/order/${orderNo}` }} className="font-semibold text-leaf hover:underline">Sign in</Link> to message us about this order.
      </p>
    );
  }
  if (error && thread && thread.length === 0 && /not your order/i.test(error)) return null; // someone else's order: no chat
  const mine = asAdmin ? 'admin' : 'customer';

  return (
    <section className="rounded-2xl border border-black/5 bg-white" aria-label="Messages">
      <header className="flex items-center gap-2 border-b border-black/5 px-4 py-3">
        <MessageCircle className="h-4 w-4 text-leaf" />
        <h2 className="font-display text-base font-bold">{asAdmin ? `Chat about ${orderNo}` : 'Messages with De-Boyz Foods'}</h2>
      </header>

      <div className="max-h-80 min-h-[8rem] space-y-2 overflow-y-auto p-4" aria-live="polite">
        {thread === null && <Loading message="Loading messages..." className="py-6" />}
        {thread?.length === 0 && !error && <p className="py-4 text-center text-sm text-black/50">{asAdmin ? 'No messages yet. Say hello to the customer.' : 'Have a question about this order? Send us a message here and we will reply.'}</p>}
        {thread?.map((m) => {
          const own = m.sender_role === mine;
          return (
            <div key={m.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${own ? 'rounded-br-md bg-leaf text-white' : 'rounded-bl-md bg-black/[0.06]'}`}>
                {!own && <p className="mb-0.5 text-[11px] font-bold opacity-60">{asAdmin ? 'Customer' : 'De-Boyz Foods'}</p>}
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 text-[10px] ${own ? 'text-white/70' : 'text-black/40'}`}>{new Date(m.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>

      {asAdmin && (
        <div className="flex flex-wrap gap-1.5 border-t border-black/5 px-4 pt-3">
          {QUICK.map((q) => <button key={q} type="button" onClick={(e) => send(e, q)} disabled={busy} className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-medium hover:bg-black/10 disabled:opacity-50">{q}</button>)}
        </div>
      )}

      <form onSubmit={send} className="flex items-end gap-2 p-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={1000} aria-label="Your message"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) send(e); }}
          placeholder="Type a message..." className="field max-h-28 min-h-[2.75rem] resize-none" />
        <button className="btn-green h-11 shrink-0 px-4" disabled={busy || !text.trim()} aria-label="Send message"><Send className="h-4 w-4" /></button>
      </form>
      {error && thread?.length > 0 && <p role="alert" className="px-4 pb-3 text-sm text-chili">{error}</p>}
    </section>
  );
}
