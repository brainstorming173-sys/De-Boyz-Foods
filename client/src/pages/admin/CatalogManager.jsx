import { useEffect, useRef, useState } from 'react';
import Loading from '../../components/Loading.jsx';
import { Pencil, Trash2, Plus, ImagePlus, X } from 'lucide-react';
import { api, money } from '../../api.js';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ---------- image picker: uploads to /api/uploads (Cloudinary) and returns a URL ---------- */
function ImageField({ value, onChange, onError }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await api.admin.uploadImage(file);
      onChange(url);
    } catch (err) { onError(err.message); }
    finally { setBusy(false); e.target.value = ''; }
  }

  return (
    <div>
      <span className="label">Photo</span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F1F0EE] text-black/30">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7" strokeWidth={1.5} />}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? 'Uploading...' : value ? 'Change photo' : 'Upload photo'}
          </button>
          {value && <button type="button" className="btn-ghost" onClick={() => onChange('')} aria-label="Remove photo"><X className="h-4 w-4" /></button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[#0B6B2E]" />
      {label}
    </label>
  );
}

function Row({ item, sub, badge, onEdit, onDelete }) {
  return (
    <div className="flex items-start gap-3 p-3 sm:items-center sm:gap-4 sm:p-4">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#F1F0EE] sm:h-14 sm:w-14">
        {item.image_url && <img src={item.image_url} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold leading-snug sm:truncate">{item.name} {badge}</p>
        <p className="truncate text-sm text-black/55">{sub}</p>
        <p className="mt-0.5 font-display font-bold sm:hidden">{money(item.price)}</p>
      </div>
      <span className="hidden font-display text-lg font-bold sm:block">{money(item.price)}</span>
      <div className="flex shrink-0 gap-1.5 sm:gap-2">
        <button onClick={onEdit} className="btn-ghost h-10 w-10 p-0" aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4" /></button>
        <button onClick={onDelete} className="btn-ghost h-10 w-10 p-0 text-chili" aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

const Pill = ({ children, tone }) => (
  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone === 'bad' ? 'bg-chili-soft text-chili' : 'bg-leaf-soft text-leaf'}`}>{children}</span>
);

/* ---------- Today's meals ---------- */
const blankMeal = () => ({ name: '', description: '', price: '', image_url: '', available_date: todayStr(), is_available: true });

export function MealsManager({ setError }) {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null); // null = closed
  const [saving, setSaving] = useState(false);

  const load = () => api.admin.meals().then(setList).catch((e) => { setError(e.message); setList([]); });
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const edit = (m) => setForm({ ...m, price: String(m.price), description: m.description || '', image_url: m.image_url || '', available_date: String(m.available_date).slice(0, 10) });

  async function save(e) {
    e.preventDefault(); setError(''); setSaving(true);
    const body = { name: form.name.trim(), description: form.description.trim(), price: form.price, image_url: form.image_url, available_date: form.available_date, is_available: form.is_available };
    try {
      form.id ? await api.admin.updateMeal(form.id, body) : await api.admin.createMeal(body);
      setForm(null); await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function remove(m) {
    if (!window.confirm(`Delete "${m.name}"?`)) return;
    try { await api.admin.deleteMeal(m.id); setList((cur) => cur.filter((x) => x.id !== m.id)); }
    catch (err) { setError(err.message); }
  }

  const today = todayStr();

  return (
    <div className="mt-6">
      {!form && <button className="btn-red" onClick={() => setForm(blankMeal())}><Plus className="h-4 w-4" /> Add meal</button>}

      {form && (
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-black/5 bg-white p-4 sm:p-6">
          <h2 className="text-xl font-bold">{form.id ? 'Edit meal' : 'New meal'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="m-name">Meal name</label><input id="m-name" required className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jollof rice with chicken" /></div>
            <div><label className="label" htmlFor="m-price">Price (GH₵)</label><input id="m-price" required type="number" min="0" step="0.01" className="field" value={form.price} onChange={(e) => set('price', e.target.value)} /></div>
            <div><label className="label" htmlFor="m-date">Available on</label><input id="m-date" required type="date" className="field" value={form.available_date} onChange={(e) => set('available_date', e.target.value)} /></div>
            <div className="flex items-end pb-2"><Toggle checked={form.is_available} onChange={(v) => set('is_available', v)} label="Available to order" /></div>
          </div>
          <div><label className="label" htmlFor="m-desc">Description (optional)</label><textarea id="m-desc" rows={2} className="field" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <ImageField value={form.image_url} onChange={(v) => set('image_url', v)} onError={setError} />
          <div className="flex gap-2">
            <button className="btn-red" disabled={saving}>{saving ? 'Saving...' : 'Save meal'}</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <ul className="mt-6 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white">
        {list === null && <li><Loading message="Loading meals..." className="py-8" /></li>}
        {list?.length === 0 && <li className="p-6 text-black/60">No meals yet. Add today's menu above.</li>}
        {list?.map((m) => {
          const date = String(m.available_date).slice(0, 10);
          return (
            <li key={m.id}>
              <Row item={m} onEdit={() => edit(m)} onDelete={() => remove(m)}
                sub={date === today ? 'Today' : date}
                badge={!m.is_available ? <Pill tone="bad">Hidden</Pill> : date === today ? <Pill>Live today</Pill> : null} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Groceries ---------- */
const blankProduct = () => ({ name: '', description: '', price: '', unit: '', category_id: '', image_url: '', in_stock: true });

export function ProductsManager({ setError }) {
  const [list, setList] = useState(null);
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => api.products().then(setList).catch((e) => { setError(e.message); setList([]); });
  const loadCats = () => api.categories().then(setCats).catch(() => {});
  useEffect(() => { load(); loadCats(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const edit = (p) => setForm({ ...p, price: String(p.price), description: p.description || '', unit: p.unit || '', image_url: p.image_url || '', category_id: p.category_id ? String(p.category_id) : '' });

  async function addCategory() {
    const name = window.prompt('New category name (e.g. Vegetables)');
    if (!name?.trim()) return;
    try { const c = await api.admin.createCategory(name.trim()); await loadCats(); set('category_id', String(c.id)); }
    catch (err) { setError(err.message); }
  }

  async function save(e) {
    e.preventDefault(); setError(''); setSaving(true);
    const body = { name: form.name.trim(), description: form.description.trim(), price: form.price, unit: form.unit.trim(), category_id: form.category_id || null, image_url: form.image_url, in_stock: form.in_stock };
    try {
      form.id ? await api.admin.updateProduct(form.id, body) : await api.admin.createProduct(body);
      setForm(null); await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function toggleStock(p) {
    try {
      const row = await api.admin.updateProduct(p.id, { in_stock: !p.in_stock });
      setList((cur) => cur.map((x) => (x.id === p.id ? { ...x, in_stock: row.in_stock } : x)));
    } catch (err) { setError(err.message); }
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    try { await api.admin.deleteProduct(p.id); setList((cur) => cur.filter((x) => x.id !== p.id)); }
    catch (err) { setError(err.message); }
  }

  return (
    <div className="mt-6">
      {!form && <button className="btn-green" onClick={() => setForm(blankProduct())}><Plus className="h-4 w-4" /> Add grocery item</button>}

      {form && (
        <form onSubmit={save} className="space-y-4 rounded-2xl border border-black/5 bg-white p-4 sm:p-6">
          <h2 className="text-xl font-bold">{form.id ? 'Edit item' : 'New grocery item'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="p-name">Item name</label><input id="p-name" required className="field" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Tomatoes" /></div>
            <div><label className="label" htmlFor="p-price">Price (GH₵)</label><input id="p-price" required type="number" min="0" step="0.01" className="field" value={form.price} onChange={(e) => set('price', e.target.value)} /></div>
            <div><label className="label" htmlFor="p-unit">Unit (optional)</label><input id="p-unit" className="field" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="per kg, 1 litre, tin..." /></div>
            <div>
              <label className="label" htmlFor="p-cat">Category</label>
              <div className="flex gap-2">
                <select id="p-cat" className="field" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                  <option value="">No category</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className="btn-ghost whitespace-nowrap" onClick={addCategory}>+ New</button>
              </div>
            </div>
          </div>
          <div><label className="label" htmlFor="p-desc">Description (optional)</label><textarea id="p-desc" rows={2} className="field" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
          <ImageField value={form.image_url} onChange={(v) => set('image_url', v)} onError={setError} />
          <Toggle checked={form.in_stock} onChange={(v) => set('in_stock', v)} label="In stock" />
          <div className="flex gap-2">
            <button className="btn-green" disabled={saving}>{saving ? 'Saving...' : 'Save item'}</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      )}

      <ul className="mt-6 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-white">
        {list === null && <li><Loading message="Loading groceries..." className="py-8" /></li>}
        {list?.length === 0 && <li className="p-6 text-black/60">No grocery items yet. Add your first one above.</li>}
        {list?.map((p) => (
          <li key={p.id}>
            <Row item={p} onEdit={() => edit(p)} onDelete={() => remove(p)}
              sub={[p.category_name, p.unit].filter(Boolean).join(' · ') || 'Uncategorised'}
              badge={!p.in_stock ? <Pill tone="bad">Out of stock</Pill> : null} />
            <div className="-mt-1 pb-3 pl-[72px] pr-3 sm:-mt-2 sm:pl-[88px]">
              <button onClick={() => toggleStock(p)} className="py-1 text-xs font-semibold text-leaf hover:underline">
                Mark as {p.in_stock ? 'out of stock' : 'in stock'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
