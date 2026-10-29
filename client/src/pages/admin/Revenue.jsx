import { Fragment, useEffect, useState } from 'react';
import { Plus, ChevronDown, Trash2 } from 'lucide-react';
import Loading from '../../components/Loading.jsx';
import { api, money } from '../../api.js';
import ManualOrder from './ManualOrder.jsx';

const RANGES = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']];
const nice = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const PAY = { momo_now: 'Mobile money (pay now)', momo: 'MoMo', cash: 'Cash' };

// Daily revenue, overall totals, each day's orders (with delete), and a way to add an order forgotten on an earlier day.
export default function Revenue({ setError, onOrderAdded, onDelete }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [openDay, setOpenDay] = useState(null);
  const [dayOrders, setDayOrders] = useState(null);

  const load = () => api.admin.revenue(days).then((d) => { setLoadError(''); setData(d); }).catch((e) => setLoadError(e.message || 'Could not load revenue'));
  useEffect(() => { setData(null); load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDay = (day) => api.admin.ordersOnDay(day).then(setDayOrders).catch((e) => { setError(e.message); setDayOrders([]); });

  function toggleDay(day) {
    if (openDay === day) { setOpenDay(null); return; }
    setOpenDay(day);
    setDayOrders(null);
    loadDay(day);
  }

  async function remove(o) {
    const done = await onDelete?.(o);
    if (!done) return;
    setDayOrders((cur) => (cur || []).filter((x) => x.id !== o.id));
    load();
  }

  const todayKey = data?.daily?.[0]?.day;
  const rangeTotal = data?.daily.reduce((s, d) => s + d.revenue, 0) || 0;

  return (
    <div className="mt-5">
      {loadError ? (
        <div className="rounded-2xl border border-chili/30 bg-white p-5">
          <p className="font-semibold text-chili">Could not load revenue: {loadError}</p>
          <button onClick={() => { setLoadError(''); load(); }} className="mt-3 rounded-full bg-leaf px-4 py-1.5 text-sm font-semibold text-white">Try again</button>
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-black/5 bg-white"><Loading message="Loading revenue..." className="py-8" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
            {[['Total revenue (all time)', data.total_revenue], ['This month', data.this_month], ['Today', data.today], [`Last ${days} days`, rangeTotal]].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-2xl border border-black/5 bg-white p-3 sm:p-5">
                <p className="text-xs leading-tight text-black/60 sm:text-sm">{k}</p>
                <p className="mt-1 break-words font-display text-lg font-bold leading-tight sm:text-3xl">{money(v)}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-black/50">{data.total_orders} orders counted. Cancelled orders are left out.</p>
        </>
      )}

      <ManualOrder
        title="Forgot to add an order? Add it to a day"
        pickedDate={picked}
        setError={setError}
        onCreated={(order) => { onOrderAdded?.(order); load(); if (openDay) loadDay(openDay); }}
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Revenue by day</h2>
        <div className="flex gap-2">
          {RANGES.map(([n, label]) => (
            <button key={n} onClick={() => setDays(n)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${days === n ? 'bg-leaf text-white' : 'bg-white ring-1 ring-black/10'}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="border-b border-black/5 text-black/60">
            <tr><th className="p-3 sm:p-4">Day</th><th className="p-3 sm:p-4">Orders</th><th className="p-3 sm:p-4">Revenue</th><th className="p-3 sm:p-4"><span className="sr-only">Actions</span></th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data?.daily.map((d) => (
              <Fragment key={d.day}>
                <tr>
                  <td className="p-3 font-semibold sm:p-4">{nice(d.day)}{d.day === todayKey && <span className="ml-2 rounded-full bg-leaf/10 px-2 py-0.5 text-xs text-leaf">Today</span>}</td>
                  <td className="p-3 sm:p-4">{d.orders}</td>
                  <td className="p-3 font-semibold sm:p-4">{money(d.revenue)}{d.manual_revenue > 0 && <div className="text-xs font-normal text-black/50">{money(d.manual_revenue)} walk-in / phone</div>}</td>
                  <td className="p-3 text-right sm:p-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button onClick={() => toggleDay(d.day)} aria-expanded={openDay === d.day} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-black/15 hover:bg-black/5">View orders <ChevronDown className={`h-3.5 w-3.5 transition ${openDay === d.day ? 'rotate-180' : ''}`} /></button>
                      <button onClick={() => setPicked({ day: d.day, t: Date.now() })} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-black/15 hover:bg-black/5"><Plus className="h-3.5 w-3.5" /> Add order</button>
                    </div>
                  </td>
                </tr>
                {openDay === d.day && (
                  <tr className="bg-black/[0.02]">
                    <td colSpan={4} className="p-3 sm:p-4">
                      {dayOrders === null ? <Loading message="Loading orders..." className="py-4" /> : dayOrders.length === 0 ? (
                        <p className="text-black/60">No orders on this day.</p>
                      ) : (
                        <ul className="space-y-2">
                          {dayOrders.map((o) => (
                            <li key={o.id} className={`rounded-xl border border-black/5 bg-white p-3 ${o.status === 'cancelled' ? 'opacity-60' : ''}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-semibold">{o.order_no}{o.source === 'manual' && <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-black/60">Walk-in / phone</span>}{o.status === 'cancelled' && <span className="ml-2 rounded-full bg-chili/10 px-2 py-0.5 text-xs font-semibold text-chili">Cancelled</span>}</p>
                                  <p className="text-xs text-black/50">{new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {o.customer_name} · {PAY[o.payment_method] || o.payment_method} ({o.payment_status})</p>
                                  <p className="mt-1 text-sm text-black/70">{o.items.map((i) => `${i.qty} × ${i.name}`).join(', ')}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <p className="font-display font-bold">{money(o.total)}</p>
                                  <button onClick={() => remove(o)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-chili"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}