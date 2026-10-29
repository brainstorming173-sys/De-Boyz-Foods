import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import Loading from '../../components/Loading.jsx';
import { api, money } from '../../api.js';
import ManualOrder from './ManualOrder.jsx';

const RANGES = [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days']];
const nice = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

// Daily revenue, overall totals, and a way to add an order that was forgotten on an earlier day.
export default function Revenue({ setError }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState(null);

  const load = () => api.admin.revenue(days).then(setData).catch((e) => setError(e.message));
  useEffect(() => { setData(null); load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayKey = data?.daily?.[0]?.day;
  const rangeTotal = data?.daily.reduce((s, d) => s + d.revenue, 0) || 0;

  return (
    <div className="mt-5">
      {!data ? (
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
        onCreated={() => load()}
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
            <tr><th className="p-3 sm:p-4">Day</th><th className="p-3 sm:p-4">Orders</th><th className="p-3 sm:p-4">Revenue</th><th className="p-3 sm:p-4"><span className="sr-only">Add</span></th></tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {data?.daily.map((d) => (
              <tr key={d.day}>
                <td className="p-3 font-semibold sm:p-4">{nice(d.day)}{d.day === todayKey && <span className="ml-2 rounded-full bg-leaf/10 px-2 py-0.5 text-xs text-leaf">Today</span>}</td>
                <td className="p-3 sm:p-4">{d.orders}</td>
                <td className="p-3 font-semibold sm:p-4">{money(d.revenue)}{d.manual_revenue > 0 && <div className="text-xs font-normal text-black/50">{money(d.manual_revenue)} walk-in / phone</div>}</td>
                <td className="p-3 text-right sm:p-4">
                  <button onClick={() => setPicked({ day: d.day, t: Date.now() })} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold ring-1 ring-black/15 hover:bg-black/5"><Plus className="h-3.5 w-3.5" /> Add order</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}