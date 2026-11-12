import { Link } from 'react-router-dom';
import { ArrowRight, Flame, Leaf } from 'lucide-react';
import { resolveTheme } from '../promoThemes.js';
import { usePromo } from '../context/PromoContext.jsx';

// Slim strip at the very top of every page while an event is live.
export function PromoBar({ promo: given, preview = false }) {
  const ctx = usePromo();
  const promo = given || ctx.promo;
  if (!promo?.enabled && !preview) return null;
  const t = resolveTheme(promo);
  const inner = (
    <>
      <span aria-hidden="true">{t.emoji}</span>
      <span className="font-display font-extrabold uppercase tracking-wide">{promo.name || 'Event name'}</span>
      <span className="hidden opacity-90 sm:inline">is on now. Deals up to the last order.</span>
      {!preview && <span className="inline-flex items-center gap-1 font-bold underline underline-offset-2" style={{ color: t.accent }}>Shop deals <ArrowRight className="h-3.5 w-3.5" /></span>}
    </>
  );
  const cls = 'flex items-center justify-center gap-2 px-3 py-2 text-center text-xs sm:text-sm';
  const style = { background: t.gradient, color: t.text };
  return preview
    ? <div className={cls} style={style}>{inner}</div>
    : <Link to="/groceries?promo=1" className={cls} style={style}>{inner}</Link>;
}

// Big event card (Home page, and the live preview in the admin).
export function PromoHero({ promo: given, preview = false }) {
  const ctx = usePromo();
  const promo = given || ctx.promo;
  if (!promo?.enabled && !preview) return null;
  const t = resolveTheme(promo);
  const faint = t.text === '#FFFFFF' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)';
  return (
    <section className="relative overflow-hidden rounded-3xl p-5 shadow-card sm:p-8" style={{ background: t.gradient, color: t.text }} aria-label={`${promo.name} promotion`}>
      {/* decorative emoji, purely visual */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-4 -top-6 select-none text-[9rem] leading-none opacity-20 sm:text-[12rem]">{t.emoji}</span>
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 left-[40%] h-40 w-40 rounded-full" style={{ background: faint }} />

      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest" style={{ background: t.accent, color: luminanceSafe(t.accent) }}>
          <span aria-hidden="true">{t.emoji}</span> Limited time
        </span>
        <h2 className="mt-3 break-words text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">{promo.name || 'Event name'}</h2>
        {promo.description ? (
          <p className="mt-4 rounded-2xl p-4 text-base leading-relaxed sm:text-lg" style={{ background: faint, backdropFilter: 'blur(4px)' }}>{promo.description}</p>
        ) : preview ? (
          <p className="mt-4 rounded-2xl p-4 text-base italic opacity-70" style={{ background: faint }}>Your event description appears here.</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-3">
          {preview ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: t.accent, color: luminanceSafe(t.accent) }}><Leaf className="h-4 w-4" /> Grocery deals</span>
              <span className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ring-2 ring-inset" style={{ '--tw-ring-color': t.text }}><Flame className="h-4 w-4" /> Food deals</span>
            </>
          ) : (
            <>
              <Link to="/groceries?promo=1" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: t.accent, color: luminanceSafe(t.accent) }}><Leaf className="h-4 w-4" /> Grocery deals</Link>
              <Link to="/food?promo=1" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold ring-2 ring-inset" style={{ '--tw-ring-color': t.text }}><Flame className="h-4 w-4" /> Food deals</Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// Text colour that stays readable on the accent pill.
function luminanceSafe(bg) {
  const n = parseInt(bg.slice(1), 16);
  const y = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return y > 0.6 ? '#111111' : '#FFFFFF';
}

// Compact version shown above the product lists on the Groceries and Food pages.
export function PromoStrip() {
  const { promo, theme: t } = usePromo();
  if (!promo.enabled || !t) return null;
  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl p-4" style={{ background: t.gradient, color: t.text }}>
      <span aria-hidden="true" className="text-2xl leading-none">{t.emoji}</span>
      <div className="min-w-0">
        <p className="break-words font-display text-lg font-extrabold leading-tight">{promo.name}</p>
        {promo.description && <p className="mt-1 text-sm opacity-90">{promo.description}</p>}
      </div>
    </div>
  );
}
