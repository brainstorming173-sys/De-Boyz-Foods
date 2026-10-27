import { useEffect, useState } from 'react';
import Loading from '../../components/Loading.jsx';
import { api, money } from '../../api.js';

const LABEL = { new: 'New', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' };

// Admin: every customer with their email, phone and orders.
export default function UsersList() {
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { api.admin.users().then(setList).catch((e) => setError(e.message)); }, []);

  if (error) return <p role="alert" className="mt-4 text-chili">{error}</p>;
  if (!list) return <Loading message="Loading users..." />;

  const term = q.trim().toLowerCase();
  const shown = term
    ? list.filter((u) => [u.name, u.email, u.phone].some((v) => (v || '').toLowerCase().includes(term)))
    : list;

  return (
    <div className="mt-5">
      <input className="field max-w-md" placeholder="Search name, email or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
      {!shown.length ? (
        <p className="mt-4 rounded-2xl border border-dashed border-black/10 bg-white px-6 py-10 text-center text-black/60">No users found.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white">
          {shown.map((u) => (
            <li key={u.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">{u.name}</p>
                  <p className="break-all text-sm"><a href={`mailto:${u.email}`} className="text-leaf hover:underline">{u.email}</a></p>
                  <p className="text-sm">{u.phone ? <a href={`tel:${u.phone}`} className="text-leaf hover:underline">{u.phone}</a> : <span className="text-black/50">No phone yet</span>}</p>
                  <p className="text-xs text-black/50">Joined {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{u.order_count} {u.order_count === 1 ? 'order' : 'orders'}</p>
                  <p className="text-black/60">{money(u.total_spent)} spent</p>
                  {u.order_count > 0 && (
                    <button onClick={() => setOpen(open === u.id ? null : u.id)} className="mt-1 font-semibold text-leaf hover:underline">
                      {open === u.id ? 'Hide orders' : 'View orders'}
                    </button>
                  )}
                </div>
              </div>
              {open === u.id && (
                <ul className="mt-3 space-y-2 rounded-xl bg-black/[0.03] p-3 text-sm">
                  {u.orders.map((o) => (
                    <li key={o.order_no}>
                      <p className="flex flex-wrap justify-between gap-x-3"><span className="font-semibold">{o.order_no}</span><span>{money(o.total)}</span></p>
                      <p className="text-xs text-black/60">{new Date(o.created_at).toLocaleString()} · {LABEL[o.status] || o.status} · {o.fulfillment === 'pickup' ? 'Pickup' : 'Delivery'}</p>
                      {o.items && <p className="text-xs text-black/70">{o.items}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
