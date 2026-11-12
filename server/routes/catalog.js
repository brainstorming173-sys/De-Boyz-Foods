import { Router } from 'express';
import { products, meals, categories, settings, currentPrices } from '../db/store.js';
import { requireAdmin } from '../middleware/auth.js';
import { wrap, bad } from '../middleware/error.js';

const r = Router();
const num = (v) => (v === undefined || v === '' ? undefined : Number(v));

function checkPrice(v) {
  if (v !== undefined && (Number.isNaN(v) || v < 0)) throw bad('Enter a valid price');
}

// Promo price from a request body. undefined = leave as is, null = remove it, number = set it.
function readPromo(body) {
  if (!('promo_price' in body)) return undefined;
  const v = body.promo_price;
  if (v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw bad('Enter a valid promo price');
  return Math.round(n * 100) / 100;
}
const mustBeLower = (promo, price) => {
  if (promo != null && price != null && promo >= price) throw bad('The promo price must be lower than the original price');
};

const THEMES = ['black_friday', 'christmas', 'new_year', 'valentine', 'easter', 'eid', 'independence', 'custom'];
const HEX = /^#[0-9a-f]{6}$/i;
const publicPromo = (s) => s.promo_enabled
  ? { enabled: true, name: s.promo_name, description: s.promo_description, theme: s.promo_theme, colorA: s.promo_color_a, colorB: s.promo_color_b }
  : { enabled: false };
const adminPromo = (s) => ({ enabled: s.promo_enabled, name: s.promo_name, description: s.promo_description, theme: s.promo_theme, colorA: s.promo_color_a, colorB: s.promo_color_b });

/* ---- public ---- */
r.get('/categories', wrap(async (_req, res) => res.json(await categories.list())));

r.get('/products', wrap(async (req, res) => {
  res.json(await products.list({
    categoryId: num(req.query.category),
    q: req.query.q?.toString().trim() || undefined,
    includeOutOfStock: req.query.in_stock !== '1',
    promoOnly: req.query.promo === '1',
  }));
}));

r.get('/meals/today', wrap(async (req, res) => res.json(await meals.listToday({ promoOnly: req.query.promo === '1' }))));

// What the site should look like right now. When promo mode is off this is just { enabled: false }.
r.get('/promo', wrap(async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(publicPromo(await settings.get()));
}));

// Re-prices a saved cart at today's prices (promo on or off), so the cart never shows a stale price.
r.post('/cart/prices', wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await currentPrices(req.body.items));
}));

/* ---- admin ---- */
r.get('/admin/meals', requireAdmin, wrap(async (_req, res) => res.json(await meals.listAll())));

r.get('/admin/promo', requireAdmin, wrap(async (_req, res) => res.json(adminPromo(await settings.get()))));

// Save the event details and/or flip the switch. Turning OFF keeps the details so the next event is quick to set up.
r.put('/admin/promo', requireAdmin, wrap(async (req, res) => {
  const cur = await settings.get();
  const b = req.body;
  const next = {
    promo_enabled: typeof b.enabled === 'boolean' ? b.enabled : cur.promo_enabled,
    promo_name: b.name !== undefined ? String(b.name).trim().slice(0, 60) : cur.promo_name,
    promo_description: b.description !== undefined ? String(b.description).trim().slice(0, 400) : cur.promo_description,
    promo_theme: b.theme !== undefined ? b.theme : cur.promo_theme,
    promo_color_a: b.colorA !== undefined ? b.colorA : cur.promo_color_a,
    promo_color_b: b.colorB !== undefined ? b.colorB : cur.promo_color_b,
  };
  if (!THEMES.includes(next.promo_theme)) throw bad('Choose a valid theme');
  if (!HEX.test(next.promo_color_a) || !HEX.test(next.promo_color_b)) throw bad('Choose valid colours');
  if (next.promo_enabled && !next.promo_name) throw bad('Enter the event name before turning the promo on');
  res.json(adminPromo(await settings.update(next)));
}));

// Start a fresh event: remove every item's promo price.
r.post('/admin/promo/clear-prices', requireAdmin, wrap(async (_req, res) => res.json({ cleared: await settings.clearPromoPrices() })));

r.post('/categories', requireAdmin, wrap(async (req, res) => {
  if (!req.body.name?.trim()) throw bad('Enter a category name');
  res.status(201).json(await categories.create(req.body.name.trim()));
}));

r.post('/products', requireAdmin, wrap(async (req, res) => {
  const b = req.body; const price = num(b.price);
  if (!b.name?.trim()) throw bad('Enter a product name');
  if (price === undefined) throw bad('Enter a price');
  checkPrice(price);
  const promo = readPromo(b); mustBeLower(promo, price);
  res.status(201).json(await products.create({ ...b, price, promo_price: promo }));
}));
r.patch('/products/:id', requireAdmin, wrap(async (req, res) => {
  const price = num(req.body.price); checkPrice(price);
  const promo = readPromo(req.body);
  if (promo != null) { const cur = await products.get(req.params.id); mustBeLower(promo, price ?? (cur && Number(cur.price))); }
  const row = await products.update(req.params.id, { ...req.body, price, promo_price: promo });
  if (!row) throw bad('Product not found', 404);
  res.json(row);
}));
r.delete('/products/:id', requireAdmin, wrap(async (req, res) => {
  if (!(await products.remove(req.params.id))) throw bad('Product not found', 404);
  res.json({ ok: true });
}));

r.post('/meals', requireAdmin, wrap(async (req, res) => {
  const b = req.body; const price = num(b.price);
  if (!b.name?.trim()) throw bad('Enter a meal name');
  if (price === undefined) throw bad('Enter a price');
  checkPrice(price);
  const promo = readPromo(b); mustBeLower(promo, price);
  res.status(201).json(await meals.create({ ...b, price, promo_price: promo }));
}));
r.patch('/meals/:id', requireAdmin, wrap(async (req, res) => {
  const price = num(req.body.price); checkPrice(price);
  const promo = readPromo(req.body);
  if (promo != null) { const cur = await meals.get(req.params.id); mustBeLower(promo, price ?? (cur && Number(cur.price))); }
  const row = await meals.update(req.params.id, { ...req.body, price, promo_price: promo });
  if (!row) throw bad('Meal not found', 404);
  res.json(row);
}));
r.delete('/meals/:id', requireAdmin, wrap(async (req, res) => {
  if (!(await meals.remove(req.params.id))) throw bad('Meal not found', 404);
  res.json({ ok: true });
}));

export default r;
