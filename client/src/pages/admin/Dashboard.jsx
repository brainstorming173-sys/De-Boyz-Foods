import { useEffect, useState } from 'react';
import Loading from '../../components/Loading.jsx';
import { Navigation } from 'lucide-react';
import { api, money } from '../../api.js';
import { MealsManager, ProductsManager } from './CatalogManager.jsx';

const STATUSES = ['new', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];
const PAY = { momo_now: 'Mobile money (pay now)', momo: 'MoMo on delivery', cash: 'Cash' };
const NETWORK = { mtn: 'MTN', telecel: 'Telecel', airteltigo: 'AirtelTigo' };
const LABEL = { new: 'New', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'Out for delivery', completed: 'Completed', cancelled: 'Cancelled' };

export default function Dashboard() {
  const [tab, setTab] = useState('orders');
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = () => {
    api.admin.stats().then(setStats).catch((e) => setError(e.message));
    api.admin.orders().then(setOrders).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  async function setStatus(id, status) {
    try {
      const row = await api.admin.setOrderStatus(id, status);
      setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, status: row.status } : o)));
    } catch (e) { setError(e.message); }
  }

  async function setPay(id, status) {
    try {
      const row = await api.admin.setPaymentStatus(id, status);
      setOrders((cur) => cur.map((o) => (o.id === id ? { ...o, payment_status: row.payment_status } : o)));
    } catch (e) { setError(e.message); }
  }

  // Turn-by-turn directions to the customer's pin (falls back to the typed address for older orders).
  const directions = (o) => {
    if (o.fulfillment !== 'delivery') return null;
    const pinned = o.delivery_lat != null && o.delivery_lng != null;
    if (!pinned && !o.address) return null;
    const google = pinned
      ? `https://www.google.com/maps/dir/?api=1&destination=${o.delivery_lat},${o.delivery_lng}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(o.address)}&travelmode=driving`;
    return (
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <a href={google} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-leaf px-3 py-1 font-semibold text-white"><Navigation className="h-3.5 w-3.5" /> {pinned ? 'Get directions' : 'Directions (from address)'}</a>
        {pinned && <a href={`https://waze.com/ul?ll=${o.delivery_lat},${o.delivery_lng}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-black/15">Waze</a>}
      </div>
    );
  };

  // Every mobile money payment is confirmed by hand: shows the customer's transaction ID and the confirm / reject buttons.
  const manualPay = (o) => o.payment_method === 'momo_now' && o.payment_network && (
    <div className="mt-2 space-y-1 text-xs">
      {o.payment_txn_id
        ? <p className="break-all text-black/70">Txn ID: <strong>{o.payment_txn_id}</strong><br />From: {o.payment_sender}</p>
        : <p className="text-black/50">No transaction ID submitted yet</p>}
      {o.payment_status !== 'paid' && (
        <div className="flex gap-2">
          <button onClick={() => setPay(o.id, 'paid')} className="rounded-full bg-leaf px-3 py-1 font-semibold text-white">Mark paid</button>
          {o.payment_status === 'pending' && o.payment_txn_id && <button onClick={() => setPay(o.id, 'failed')} className="rounded-full bg-white px-3 py-1 font-semibold text-chili ring-1 ring-chili/30">Reject</button>}
        </div>
      )}
      {o.payment_status === 'paid' && <button onClick={() => setPay(o.id, 'pending')} className="text-black/50 underline">Undo</button>}
    </div>
  );

  const tabBtn = (id, label) => (
    <button onClick={() => setTab(id)} className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold sm:px-5 ${tab === id ? 'bg-leaf text-white' : 'bg-white ring-1 ring-black/10 hover:bg-black/5'}`}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 sm:px-6 sm:py-10">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Admin</h1>

      {stats && (
        <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-4 md:grid-cols-5">
          {[['Orders today', stats.orders_today], ['Revenue today', money(stats.revenue_today)], ['New orders', stats.new_orders], ['Signups this month', stats.signups_month], ['Total users', stats.total_users]].map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-2xl border border-black/5 bg-white p-3 sm:p-5">
              <p className="text-xs leading-tight text-black/60 sm:text-sm">{k}</p><p className="mt-1 break-words font-display text-lg font-bold leading-tight sm:text-3xl">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="-mx-3 mt-6 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-8 sm:px-0">{tabBtn('orders', 'Orders')}{tabBtn('meals', 'Today\'s meals')}{tabBtn('products', 'Groceries')}</div>
      {error && <p role="alert" className="mt-4 text-chili">{error}</p>}

      {tab === 'orders' && (
        <>
        {/* Phones: one card per order */}
        <ul className="mt-5 space-y-3 md:hidden">
          {orders === null && <li className="rounded-2xl border border-black/5 bg-white"><Loading message="Loading orders..." className="py-8" /></li>}
          {orders?.length === 0 && <li className="rounded-2xl border border-black/5 bg-white p-5 text-black/60">No orders yet.</li>}
          {orders?.map((o) => (
            <li key={o.id} className="rounded-2xl border border-black/5 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold">{o.order_no}</p>
                  <p className="text-xs text-black/50">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <p className="shrink-0 font-display text-lg font-bold">{money(o.total)}</p>
              </div>

              <div className="mt-3 text-sm">
                <p className="font-semibold">{o.customer_name}</p>
                <a href={`tel:${o.phone}`} className="text-leaf underline">{o.phone}</a>
                <p className="break-words text-black/60">{o.fulfillment === 'pickup' ? 'Pickup' : o.address}</p>
                {directions(o)}
              </div>

              <ul className="mt-3 space-y-0.5 rounded-xl bg-black/[0.03] p-3 text-sm">
                {o.items.map((i, n) => <li key={n}>{i.qty} &times; {i.name}</li>)}
              </ul>

              <p className="mt-3 text-sm">
                {PAY[o.payment_method]} <span className="text-xs text-black/50">({o.payment_status})</span>
                {o.payment_method === 'momo_now' && NETWORK[o.payment_network] && <span className="text-xs text-black/50"> · {NETWORK[o.payment_network]}</span>}
              </p>
              {manualPay(o)}

              <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="field mt-3 py-2.5" aria-label={`Status for ${o.order_no}`}>
                {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
              </select>
            </li>
          ))}
        </ul>

        {/* Tablets and up: table */}
        <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-black/5 bg-white md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-black/5 text-black/60">
              <tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Items</th><th className="p-4">Total</th><th className="p-4">Payment</th><th className="p-4">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {orders === null && <tr><td colSpan={6}><Loading message="Loading orders..." className="py-8" /></td></tr>}
              {orders?.length === 0 && <tr><td className="p-6 text-black/60" colSpan={6}>No orders yet.</td></tr>}
              {orders?.map((o) => (
                <tr key={o.id} className="align-top">
                  <td className="p-4 font-semibold">{o.order_no}<div className="text-xs font-normal text-black/50">{new Date(o.created_at).toLocaleString()}</div></td>
                  <td className="p-4">{o.customer_name}<div className="text-xs text-black/50">{o.phone}</div><div className="text-xs text-black/50">{o.fulfillment === 'pickup' ? 'Pickup' : o.address}</div>{directions(o)}</td>
                  <td className="p-4">{o.items.map((i, n) => <div key={n}>{i.qty} &times; {i.name}</div>)}</td>
                  <td className="p-4 font-semibold">{money(o.total)}</td>
                  <td className="p-4">{PAY[o.payment_method]} <span className="text-xs text-black/50">({o.payment_status})</span>{o.payment_method === 'momo_now' && NETWORK[o.payment_network] && <div className="text-xs text-black/50">{NETWORK[o.payment_network]}</div>}{manualPay(o)}</td>
                  <td className="p-4">
                    <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="field py-1.5" aria-label={`Status for ${o.order_no}`}>
                      {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      {tab === 'meals' && <MealsManager setError={setError} />}
      {tab === 'products' && <ProductsManager setError={setError} />}
    </div>
  );
}
