import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Check, Search } from 'lucide-react';
import { api } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';

export default function Groceries() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const [inStockOnly, setInStockOnly] = useState(true);
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.categories().then(setCats).catch(() => {}); }, []);
  useEffect(() => {
    setItems(null);
    setError('');
    const p = {};
    if (q) p.q = q;
    if (category) p.category = category;
    if (inStockOnly) p.in_stock = '1';
    api.products(p).then(setItems).catch((e) => { setError(e.message); setItems([]); });
  }, [q, category, inStockOnly]);

  const pick = (id) => {
    const next = new URLSearchParams(params);
    id ? next.set('category', id) : next.delete('category');
    setParams(next);
  };
  const chip = (active) =>
    `shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition sm:px-5 sm:py-2 sm:text-base ${active ? 'bg-leaf text-white' : 'border border-black/10 bg-white text-ink hover:bg-black/5'}`;

  return (
    <div className="px-3 pb-12 pt-6 sm:px-6 sm:pt-8">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Groceries</h1>
      <p className="mt-1 text-base text-black/65 sm:text-lg">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : 'Fresh produce and everyday essentials, delivered to you.'}
      </p>

      {/* Search lives in the navbar on desktop; show it here on small screens. */}
      <div className="relative mt-4 md:hidden">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/50" />
        <input
          value={q}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            e.target.value ? next.set('q', e.target.value) : next.delete('q');
            setParams(next, { replace: true });
          }}
          placeholder="Search groceries..."
          aria-label="Search groceries"
          className="w-full rounded-full border border-black/10 bg-white py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-leaf/30"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-3 sm:mt-6">
        <span className="flex items-center gap-2 text-sm font-semibold text-black/70 sm:text-base"><SlidersHorizontal className="h-4 w-4" /> Categories</span>

        <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-medium text-black/70 sm:order-last sm:text-base">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="peer sr-only" />
          <span className="grid h-6 w-6 place-items-center rounded-md border border-black/25 bg-white text-white peer-checked:border-leaf peer-checked:bg-leaf peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf">
            <Check className={`h-4 w-4 ${inStockOnly ? '' : 'opacity-0'}`} strokeWidth={3} />
          </span>
          In stock only
        </label>

        <div className="-mx-3 flex w-[calc(100%+1.5rem)] gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:w-auto sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          <button className={chip(!category)} onClick={() => pick('')}>All</button>
          {cats.map((c) => (
            <button key={c.id} className={chip(String(c.id) === category)} onClick={() => pick(c.id)}>{c.name}</button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {error && <p role="alert" className="mb-4 text-chili">{error}</p>}
        {items === null ? (
          <p className="text-black/50">Loading groceries...</p>
        ) : items.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-black/60">
            Nothing here yet. Try another category or search.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((p) => <ItemCard key={p.id} item={p} type="product" />)}
          </div>
        )}
      </div>
    </div>
  );
}
