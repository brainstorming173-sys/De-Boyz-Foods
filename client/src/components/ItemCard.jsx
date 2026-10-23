import { Plus, Minus } from 'lucide-react';
import { money } from '../api.js';
import { useCart } from '../context/CartContext.jsx';

// Shared card for groceries (type="product") and hot meals (type="meal").
export default function ItemCard({ item, type, accent = 'green' }) {
  const cart = useCart();
  const line = cart.items.find((c) => c.type === type && c.id === item.id);
  const soldOut = type === 'product' && !item.in_stock;
  const tone = accent === 'red' ? 'btn-red' : 'btn-green';
  const entry = { ...item, type };

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white transition hover:shadow-card">
      <div className="aspect-[4/3] bg-[#F1F0EE] sm:aspect-square">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-black/30"><Plus strokeWidth={1.25} className="h-12 w-12" /></div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <h3 className="break-words font-sans text-base font-medium leading-snug sm:text-lg">{item.name}</h3>
        {item.unit && <p className="text-sm text-black/55 sm:text-base">{item.unit}</p>}
        {item.description && <p className="mt-2 line-clamp-2 text-sm text-black/65 sm:mt-3 sm:line-clamp-none sm:text-base">{item.description}</p>}

        <div className="mt-auto flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
          <span className="font-display text-xl font-bold sm:text-2xl">{money(item.price)}</span>
          {soldOut ? (
            <span className="text-sm font-medium text-chili">Out of stock</span>
          ) : line ? (
            <div className="flex items-center justify-between gap-2 sm:justify-start">
              <button onClick={() => cart.setQty(entry, line.qty - 1)} className="btn-ghost h-11 w-11 p-0 sm:h-10 sm:w-10" aria-label={`Remove one ${item.name}`}><Minus className="h-4 w-4" /></button>
              <span className="w-5 text-center font-semibold">{line.qty}</span>
              <button onClick={() => cart.add(entry)} className={`${tone} h-11 w-11 p-0 sm:h-10 sm:w-10`} aria-label={`Add one ${item.name}`}><Plus className="h-4 w-4" /></button>
            </div>
          ) : (
            <button onClick={() => cart.add(entry)} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black/[0.05] px-5 py-2.5 font-semibold hover:bg-black/10 active:bg-black/10 sm:w-auto">
              <Plus className="h-4 w-4" /> Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
