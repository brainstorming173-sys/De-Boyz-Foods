import { useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import Loading from '../../components/Loading.jsx';
import { PromoBar, PromoHero } from '../../components/PromoBanner.jsx';
import { api } from '../../api.js';
import { usePromo } from '../../context/PromoContext.jsx';
import { THEMES, resolveTheme } from '../../promoThemes.js';

// The master switch for events (Black Friday, Christmas...). ON shows the event across the site and
// applies every item's promo price. OFF puts the site back exactly as it was. Details are kept for next time.
export default function PromoManager({ setError }) {
  const { reload } = usePromo();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => { api.admin.promo().then((p) => { setForm(p); setSaved(p); }).catch((e) => setError(e.message)); }, []);
  if (!form) return <Loading message="Loading promo settings..." />;

  const set = (k, v) => { setNote(''); setForm((f) => ({ ...f, [k]: v })); };
  const dirty = JSON.stringify({ ...form, enabled: 0 }) !== JSON.stringify({ ...saved, enabled: 0 });

  async function save(next) {
    setError(''); setBusy(true); setNote('');
    try {
      const p = await api.admin.savePromo(next);
      setForm(p); setSaved(p); await reload();
      setNote(next.enabled ? 'Saved. The promo is live on the site.' : 'Saved. The promo is off and the site is back to normal.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function clearPrices() {
    if (!window.confirm('Remove the promo price from EVERY grocery item and meal? Use this when starting a brand new event.')) return;
    setError('');
    try { const r = await api.admin.clearPromoPrices(); setNote(`Cleared promo prices on ${r.cleared} item${r.cleared === 1 ? '' : 's'}.`); await reload(); }
    catch (e) { setError(e.message); }
  }

  const t = resolveTheme(form);

  return (
    <div className="mt-6 space-y-6">
      {/* master switch */}
      <div className={`flex items-center justify-between gap-4 rounded-2xl border p-4 sm:p-6 ${form.enabled ? 'border-leaf bg-leaf-soft' : 'border-black/5 bg-white'}`}>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold">{form.enabled ? 'Promo is ON' : 'Promo is OFF'}</p>
          <p className="text-sm text-black/60">{form.enabled ? 'Customers see the event banner and promo prices.' : 'The site shows normal prices and no event.'}</p>
        </div>
        <button type="button" role="switch" aria-checked={form.enabled} aria-label="Promo on or off" disabled={busy}
          onClick={() => save({ ...form, enabled: !form.enabled })}
          className={`relative h-9 w-16 shrink-0 rounded-full transition disabled:opacity-60 ${form.enabled ? 'bg-leaf' : 'bg-black/25'}`}>
          <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${form.enabled ? 'left-8' : 'left-1'}`} />
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={(e) => { e.preventDefault(); save(form); }} className="space-y-4 rounded-2xl border border-black/5 bg-white p-4 sm:p-6">
          <h2 className="text-xl font-bold">Event details</h2>
          <div>
            <label className="label" htmlFor="pr-name">Event name</label>
            <input id="pr-name" className="field" maxLength={60} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Black Friday Sale" />
          </div>
          <div>
            <label className="label" htmlFor="pr-desc">Event description</label>
            <textarea id="pr-desc" rows={3} maxLength={400} className="field" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Up to 30% off groceries and hot meals. Today only!" />
            <p className="mt-1 text-xs text-black/50">{form.description.length}/400</p>
          </div>

          <div>
            <p className="label">Look</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(THEMES).map(([id, th]) => {
                const r = resolveTheme({ theme: id, colorA: form.colorA, colorB: form.colorB });
                const on = form.theme === id;
                return (
                  <button key={id} type="button" onClick={() => set('theme', id)} aria-pressed={on}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${on ? 'border-black ring-2 ring-black/20' : 'border-black/10 hover:bg-black/5'}`}>
                    <span className="h-6 w-6 shrink-0 rounded-full" style={{ background: r.gradient }} />
                    <span className="min-w-0 truncate">{th.emoji} {th.label}</span>
                  </button>
                );
              })}
            </div>
            {form.theme === 'custom' && (
              <div className="mt-3 flex gap-4">
                <label className="text-sm font-medium">Colour 1 <input type="color" value={form.colorA} onChange={(e) => set('colorA', e.target.value)} className="ml-1 h-9 w-14 cursor-pointer align-middle" /></label>
                <label className="text-sm font-medium">Colour 2 <input type="color" value={form.colorB} onChange={(e) => set('colorB', e.target.value)} className="ml-1 h-9 w-14 cursor-pointer align-middle" /></label>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-green" disabled={busy || !dirty}><Save className="h-4 w-4" /> {busy ? 'Saving...' : 'Save changes'}</button>
            {dirty && <span className="text-xs text-black/50">Unsaved changes</span>}
          </div>
          {note && <p role="status" className="text-sm font-medium text-leaf">{note}</p>}
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-6">
            <h2 className="text-xl font-bold">Preview</h2>
            <p className="mb-3 text-sm text-black/60">This is how the event looks on your site{form.enabled ? '.' : ' once you switch it on.'}</p>
            <div className="space-y-3 overflow-hidden rounded-2xl" style={{ background: t.tint }}>
              <PromoBar promo={form} preview />
              <div className="p-3"><PromoHero promo={form} preview /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-bold">Promo prices</h2>
            <p className="mt-1 text-sm text-black/60">Set each item's promo price from the <strong>Groceries</strong> and <strong>Today's meals</strong> tabs (Edit an item). They only apply while the promo is ON.</p>
            <button type="button" onClick={clearPrices} className="btn-ghost mt-3 text-chili"><Trash2 className="h-4 w-4" /> Clear all promo prices (new event)</button>
          </div>
        </div>
      </div>
    </div>
  );
}
