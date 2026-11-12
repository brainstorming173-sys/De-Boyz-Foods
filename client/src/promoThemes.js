// Look of each event. `a` -> `b` is the banner gradient, `accent` is the highlight colour on it,
// `deal` is the colour of promo prices on white cards. "custom" uses the two colours picked in the admin.
export const THEMES = {
  black_friday: { label: 'Black Friday', emoji: '🏷️', a: '#0A0A0A', b: '#2E2E2E', accent: '#F5B301', deal: '#D9381E' },
  christmas:    { label: 'Christmas', emoji: '🎄', a: '#B3122B', b: '#0B6B2E', accent: '#FFD54A', deal: '#B3122B' },
  new_year:     { label: 'New Year', emoji: '🎆', a: '#1B1464', b: '#6D28D9', accent: '#FFD54A', deal: '#6D28D9' },
  valentine:    { label: "Valentine's", emoji: '💝', a: '#BE123C', b: '#EC4899', accent: '#FFE4E6', deal: '#BE123C' },
  easter:       { label: 'Easter', emoji: '🐣', a: '#0E7C7B', b: '#F59E0B', accent: '#FFF3C4', deal: '#0E7C7B' },
  eid:          { label: 'Eid', emoji: '🌙', a: '#065F46', b: '#0F766E', accent: '#FCD34D', deal: '#065F46' },
  independence: { label: 'Independence Day', emoji: '⭐', a: '#CE1126', b: '#006B3F', accent: '#FCD116', deal: '#CE1126' },
  custom:       { label: 'Custom colours', emoji: '🎉', a: '#111111', b: '#F5B301', accent: '#FFFFFF', deal: '#D9381E' },
};

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
export const mix = (hex, withHex, t) => { const x = rgb(hex), y = rgb(withHex); return toHex(x.map((v, i) => v * (1 - t) + y[i] * t)); };
export const luminance = (hex) => { const [r, g, b] = rgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

// promo = { theme, colorA, colorB } -> everything a component needs to paint the event.
export function resolveTheme(promo = {}) {
  const base = THEMES[promo.theme] || THEMES.black_friday;
  const a = promo.theme === 'custom' && isHex(promo.colorA) ? promo.colorA : base.a;
  const b = promo.theme === 'custom' && isHex(promo.colorB) ? promo.colorB : base.b;
  const avg = (luminance(a) + luminance(b)) / 2;
  const light = avg > 0.55; // very light custom colours need dark text
  const custom = promo.theme === 'custom';
  return {
    id: promo.theme, emoji: base.emoji, label: base.label, a, b,
    text: light ? '#111111' : '#FFFFFF',
    accent: custom ? (light ? '#111111' : '#FFFFFF') : base.accent,
    deal: custom ? (luminance(a) < luminance(b) ? a : b) : base.deal,
    gradient: `linear-gradient(120deg, ${a}, ${b})`,
    tint: mix(a, '#FAF8F5', 0.94), // faint page background
  };
}
