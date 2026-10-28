import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import { api, money } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const LABEL = { new: 'Received', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'On the way', completed: 'Completed', cancelled: 'Cancelled' };
const TONE = { completed: 'bg-leaf-soft text-leaf', cancelled: 'bg-chili-soft text-chili' };

// Track an order by its number, and (when signed in) see all of your own orders.
export default function Orders() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [no, setNo] = useState('');
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    api.myOrders().then(setList).catch((e) => setError(e.message));
  }, [user]);

  function find(e) {
    e.preventDefault();
    let v = no.trim().toUpperCase().replace(/^#/, '');
    if (/^[0-9A-F]{6}$/.test(v)) v = `DB-${v}`; // allow typing just the 6 characters
    if (v) nav(`/order/${encodeURIComponent(v)}`);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Track your order</h1>
      <p className="mt-2 text-black/60">Enter your order number, for example DB-A1B2C3, to see how far along it is.</p>

      <form onSubmit={find} className="mt-5 flex gap-2">
        <input className="field" placeholder="DB-XXXXXX" value={no} onChange={(e) => setNo(e.target.value)} aria-label="Order number" />
        <button className="btn-green shrink-0"><Search className="h-4 w-4" /> Track</button>
      </form>

      <h2 className="mt-10 text-xl font-bold">Your orders</h2>
      {loading ? (
        <Loading message="Loading..." />
      ) : !user ? (
        <p className="mt-3 rounded-2xl border border-dashed border-black/10 bg-white px-6 py-8 text-center text-black/60">
          <Link to="/login" state={{ from: '/orders' }} className="font-semibold text-leaf hover:underline">Sign in</Link> to see all your orders in one place.
        </p>
      ) : error ? (
        <p role="alert" className="mt-3 text-chili">{error}</p>
      ) : !list ? (
        <Loading message="Loading your orders..." />
      ) : !list.length ? (
        <p className="mt-3 rounded-2xl border border-dashed border-black/10 bg-white px-6 py-8 text-center text-black/60">You haven't placed any orders yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white">
          {list.map((o) => (
            <li key={o.order_no}>
              <Link to={`/order/${o.order_no}`} className="flex items-center justify-between gap-3 p-4 hover:bg-black/[0.02]">
                <div className="min-w-0">
                  <p className="font-semibold">{o.order_no}</p>
                  <p className="text-xs text-black/50">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{money(o.total)}</p>
                  <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[o.status] || 'bg-black/[0.06] text-black/70'}`}>{LABEL[o.status] || o.status}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
