import { useEffect, useState } from 'react';
import Loading from '../components/Loading.jsx';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Flame, Truck, Wallet, Clock, MousePointerClick } from 'lucide-react';
import { api, money } from '../api.js';
import ItemCard from '../components/ItemCard.jsx';

function HeroCard({ tone, badge, BadgeIcon, title, text, cta, to, image }) {
  const green = tone === 'green';
  return (
    <section className={`relative flex min-h-[14rem] flex-col justify-start sm:justify-between overflow-hidden rounded-3xl p-5 sm:min-h-[16rem] sm:p-6 text-white shadow-card ${green ? 'bg-leaf' : 'bg-chili'}`}>
      {/* Drop photos at client/public/images/groceries.jpg and food.jpg; the card still looks right without them. */}
      <img src={image} alt="" onError={(e) => (e.currentTarget.style.display = 'none')}
        className="relative mb-4 h-36 w-full rounded-2xl object-cover sm:absolute sm:right-0 sm:top-0 sm:mb-0 sm:h-[62%] sm:w-[34%] sm:rounded-none" />
      <div className="relative sm:max-w-[60%]">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          <BadgeIcon className="h-4 w-4" /> {badge}
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:mt-4 sm:text-4xl">{title}</h2>
        <p className="mt-2 text-base leading-snug text-white/90">{text}</p>
      </div>
      <Link to={to} className={`relative mt-5 flex items-center justify-between gap-2 rounded-full bg-white px-6 py-3 sm:mt-6 sm:py-2.5 text-base font-bold ${green ? 'text-leaf' : 'text-chili'}`}>
        <span className="flex items-center gap-3">{cta} <ArrowRight className="h-5 w-5" /></span>
      </Link>
    </section>
  );
}

export default function Home() {
  const [meals, setMeals] = useState(null);
  const [settings, setSettings] = useState({ mealZones: [], groceryDeliveryFee: 20 });

  useEffect(() => {
    api.mealsToday().then((m) => setMeals(Array.isArray(m) ? m : [])).catch(() => setMeals([]));
    api.storeSettings().then(setSettings).catch(() => {});
  }, []);

  const trust = [
    { Icon: Truck, title: 'Fast Delivery', text: `Meals from ${money(Math.min(...(settings.mealZones.length ? settings.mealZones.map((z) => z.fee) : [5])))}` },
    { Icon: Wallet, title: 'Pay on Delivery', text: 'MoMo or cash' },
    { Icon: Clock, title: 'Fresh Daily', text: 'Meals cooked today' },
    { Icon: MousePointerClick, title: 'Easy Ordering', text: 'Sign up in one tap with Google' },
  ];

  return (
    <>
      <div className="mx-auto max-w-7xl px-3 pb-6 pt-6 sm:px-6 sm:pb-8 sm:pt-8">
        <p className="text-center text-[11px] font-bold uppercase leading-relaxed tracking-[0.1em] text-leaf sm:text-xs sm:tracking-[0.25em]">
          Fresh groceries &amp; hot Ghanaian meals, ordered in minutes.
        </p>
        <h1 className="mt-3 text-center text-2xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
          What would you like today?
        </h1>

        <div className="mt-6 grid gap-4 sm:mt-8 lg:grid-cols-2">
          <HeroCard tone="green" BadgeIcon={Leaf} badge="Fresh & everyday essentials" title="Buy Groceries"
            text="Shop for groceries and everyday essentials. Delivered to your door." cta="Shop Groceries" to="/groceries" image="/images/groceries.jpg" />
          <HeroCard tone="red" BadgeIcon={Flame} badge="Today's hot Ghanaian specials" title="Order Food"
            text="See today's available meals and place an order for pickup or delivery." cta="Order Food" to="/food" image="/images/food.jpg" />
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-3 pb-10 sm:px-6 sm:pb-12">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold sm:gap-3 sm:text-2xl"><Flame className="h-5 w-5 text-chili sm:h-6 sm:w-6" /> Today's Hot Meals</h2>
          <Link to="/food" className="shrink-0 font-semibold text-leaf hover:underline">View menu &rsaquo;</Link>
        </div>
        <div className="mt-5">
          {meals === null ? (
            <Loading message="Loading today's meals..." className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-12" />
          ) : meals.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-black/10 bg-white px-6 py-12 text-center text-black/60">
              No meals posted for today yet. Please check back later.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {meals.slice(0, 4).map((m) => <ItemCard key={m.id} item={m} type="meal" accent="red" />)}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-black/5 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-3 gap-y-5 px-3 py-6 sm:gap-6 sm:px-6 sm:py-8 lg:grid-cols-4">
          {trust.map(({ Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-leaf" />
              <div><p className="font-display font-bold">{title}</p><p className="text-sm text-black/60">{text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
