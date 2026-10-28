import { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { api, money } from '../../api.js';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const blank = () => ({ name: '', price: '', qty: '1' });

// Admin form for customers who call or walk in instead of using the website.
export default function ManualOrder({ onCreated, setError }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([blank()]);
  const [date, setDate] = useState(todayStr());
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [busy, setBusy] = useState(false);

  const setItem = (n, patch) => setItems((cur) => cur.map((it, i) => (i === n ? { ...it, ...patch } : it)));
  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (parseInt(i.qty, 10) || 0), 0);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const order = await api.admin.createManualOrder({ items, date, customerName, paymentMethod });
      onCreated(order);
      setItems([blank()]);
      setCustomerName('');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mt-5 rounded-2xl border border-black/5 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 p-4 text-left sm:p-5" aria-expanded={open}>
        <span>
          <span className="block font-display text-lg font-bold">Add a walk-in or phone order</span>
          <span className="block text-xs text-black/60">For customers who call or buy in person. Counts toward revenue.</span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <form onSubmit={submit} className="space-y-4 border-t border-black/5 p-4 sm:p-5">
          <div className="space-y-3">
            {items.map((it, n) => (
              <div key={n} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_7rem_5rem_auto]">
                <input className="field col-span-2 sm:col-span-1" placeholder="Food (e.g. Jollof rice with chicken)" value={it.name} onChange={(e) => setItem(n, { name: e.target.value })} required aria-label="Food" />
                <input className="field" type="number" inputMode="decimal" min="0" step="0.01" placeholder="Price (GH₵)" value={it.price} onChange={(e) => setItem(n, { price: e.target.value })} required aria-label="Price each" />
                <input className="field sm:w-20" type="number" inputMode="numeric" min="1" max="999" placeholder="Qty" value={it.qty} onChange={(e) => setItem(n, { qty: e.target.value })} required aria-label="Quantity" />
                {items.length > 1 && <button type="button" className="btn-ghost px-3" onClick={() => setItems((cur) => cur.filter((_, i) => i !== n))} aria-label="Remove item"><Trash2 className="h-4 w-4" /></button>}
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={() => setItems((cur) => [...cur, blank()])}><Plus className="h-4 w-4" /> Add another item</button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium">Date
              <input className="field mt-1" type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label className="block text-sm font-medium">Customer name (optional)
              <input className="field mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Walk-in" />
            </label>
            <label className="block text-sm font-medium">Paid with
              <select className="field mt-1" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="momo">Mobile money</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-lg font-bold">Total: {money(total)}</p>
            <button className="btn-green" disabled={busy}>{busy ? 'Saving...' : 'Add to orders'}</button>
          </div>
        </form>
      )}
    </div>
  );
}
