import { Router } from 'express';
import { products, meals, categories } from '../db/store.js';
import { requireAdmin } from '../middleware/auth.js';
import { wrap, bad } from '../middleware/error.js';

const r = Router();
const num = (v) => (v === undefined || v === '' ? undefined : Number(v));

function checkPrice(v) {
  if (v !== undefined && (Number.isNaN(v) || v < 0)) throw bad('Enter a valid price');
}

/* ---- public ---- */
r.get('/categories', wrap(async (_req, res) => res.json(await categories.list())));

r.get('/products', wrap(async (req, res) => {
  res.json(await products.list({
    categoryId: num(req.query.category),
    q: req.query.q?.toString().trim() || undefined,
    includeOutOfStock: req.query.in_stock !== '1',
  }));
}));

r.get('/meals/today', wrap(async (_req, res) => res.json(await meals.listToday())));

/* ---- admin ---- */
r.get('/admin/meals', requireAdmin, wrap(async (_req, res) => res.json(await meals.listAll())));

r.post('/categories', requireAdmin, wrap(async (req, res) => {
  if (!req.body.name?.trim()) throw bad('Enter a category name');
  res.status(201).json(await categories.create(req.body.name.trim()));
}));

r.post('/products', requireAdmin, wrap(async (req, res) => {
  const b = req.body; const price = num(b.price);
  if (!b.name?.trim()) throw bad('Enter a product name');
  if (price === undefined) throw bad('Enter a price');
  checkPrice(price);
  res.status(201).json(await products.create({ ...b, price }));
}));
r.patch('/products/:id', requireAdmin, wrap(async (req, res) => {
  const price = num(req.body.price); checkPrice(price);
  const row = await products.update(req.params.id, { ...req.body, price });
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
  res.status(201).json(await meals.create({ ...b, price }));
}));
r.patch('/meals/:id', requireAdmin, wrap(async (req, res) => {
  const price = num(req.body.price); checkPrice(price);
  const row = await meals.update(req.params.id, { ...req.body, price });
  if (!row) throw bad('Meal not found', 404);
  res.json(row);
}));
r.delete('/meals/:id', requireAdmin, wrap(async (req, res) => {
  if (!(await meals.remove(req.params.id))) throw bad('Meal not found', 404);
  res.json({ ok: true });
}));

export default r;
