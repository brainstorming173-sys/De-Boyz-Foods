import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, UtensilsCrossed } from 'lucide-react';
import { api } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';

export default function Food() {
  const [meals, setMeals] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { api.mealsToday().then(setMeals).catch(() => setMeals([])); }, []);

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }).replace(',', '');
  const shown = useMemo(
    () => (meals || []).filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase())),
    [meals, q]
  );

  return (
    <div className="mx-auto max-w-[1104px] px-3 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-9">
      <span className="inline-flex items-center gap-2 rounded-full bg-chili-soft px-4 py-2 font-semibold text-chili">
        <CalendarDays className="h-4 w-4" /> {today}
      </span>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:mt-6 sm:text-4xl">Today's Menu</h1>
      <p className="mt-1 text-base text-black/65 sm:text-lg">Hot meals available today. Order for pickup or delivery.</p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search today's meals..."
        aria-label="Search today's meals"
        className="mt-5 w-full rounded-full border border-black/10 bg-white px-5 py-3 text-base sm:mt-7 sm:px-6 sm:py-4 outline-none placeholder:text-black/40 focus:ring-2 focus:ring-chili/30"
      />

      <div className="mt-6">
        {meals === null ? (
          <p className="text-black/50">Loading today's meals...</p>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-black/10 bg-white px-6 py-16 text-center">
            <UtensilsCrossed className="h-12 w-12 text-black/55" strokeWidth={1.5} />
            <p className="mt-5 font-display text-2xl font-semibold">{q && meals.length ? 'No meals match your search' : 'No meals posted for today'}</p>
            <p className="mt-1 text-lg text-black/60">{q && meals.length ? 'Try a different name.' : 'Please check back later today.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {shown.map((m) => <ItemCard key={m.id} item={m} type="meal" accent="red" />)}
          </div>
        )}
      </div>
    </div>
  );
}
