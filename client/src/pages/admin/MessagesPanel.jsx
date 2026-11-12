import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Loading from '../../components/Loading.jsx';
import OrderChat from '../../components/OrderChat.jsx';
import { api } from '../../api.js';

// Admin inbox: every order a customer has written about, plus any order you open a chat on.
export default function MessagesPanel({ openOrderNo, setError, onChange }) {
  const [list, setList] = useState(null);
  const [active, setActive] = useState(openOrderNo || null);

  const load = () => api.admin.inbox().then((l) => { setList(l); onChange?.(l.reduce((s, c) => s + c.unread, 0)); }).catch((e) => { setError(e.message); setList([]); });
  useEffect(() => {
    load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 15000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => { if (openOrderNo) setActive(openOrderNo); }, [openOrderNo]);

  if (active) {
    return (
      <div className="mt-6 max-w-2xl">
        <button onClick={() => { setActive(null); load(); }} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-leaf hover:underline"><ArrowLeft className="h-4 w-4" /> All messages</button>
        <OrderChat orderNo={active} asAdmin onRead={load} />
      </div>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white">
      {list === null && <li><Loading message="Loading messages..." className="py-8" /></li>}
      {list?.length === 0 && <li className="p-6 text-black/60">No conversations yet. Use the "Message" button on an order to write to a customer, and their replies will show up here.</li>}
      {list?.map((c) => (
        <li key={c.id}>
          <button onClick={() => setActive(c.order_no)} className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-black/[0.02]">
            <div className="min-w-0">
              <p className="font-semibold">{c.customer_name} <span className="text-sm font-normal text-black/50">· {c.order_no}</span></p>
              <p className="truncate text-sm text-black/60">{c.last_role === 'admin' ? 'You: ' : ''}{c.last_body}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-black/45">{new Date(c.last_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
              {c.unread > 0 && <span className="mt-1 inline-block rounded-full bg-chili px-2 py-0.5 text-xs font-bold text-white">{c.unread} new</span>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
