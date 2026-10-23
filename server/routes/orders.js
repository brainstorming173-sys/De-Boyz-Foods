import { Router } from 'express';
import { orders, stats } from '../db/store.js';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap, bad } from '../middleware/error.js';
import { config } from '../config.js';

const r = Router();
const STATUSES = ['new', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];

// Checkout. No account needed; if a valid token is sent the order is linked to that user.
r.post('/', optionalAuth, wrap(async (req, res) => {
  const { items, customer = {}, fulfillment = 'delivery', paymentMethod = 'cash' } = req.body;
  if (!Array.isArray(items) || !items.length) throw bad('Your cart is empty');
  if (!customer.name?.trim()) throw bad('Enter your name');
  if (!/^[0-9+\s-]{9,15}$/.test(customer.phone || '')) throw bad('Enter a valid phone number');
  if (!['delivery', 'pickup'].includes(fulfillment)) throw bad('Choose delivery or pickup');
  if (!['cash', 'momo', 'momo_now'].includes(paymentMethod)) throw bad('Choose a payment method');
  if (fulfillment === 'delivery' && !customer.address?.trim()) throw bad('Enter your delivery address');
  const order = await orders.create({ userId: req.user?.id, customer, items, fulfillment, paymentMethod });
  res.status(201).json(order);
}));

r.get('/settings', (_req, res) => res.json(config.store));

r.get('/mine', requireAuth, wrap(async (req, res) => res.json(await orders.listForUser(req.user.id))));

// Order lookup by order number (the number acts as the guest's receipt).
r.get('/track/:orderNo', wrap(async (req, res) => {
  const o = await orders.getByNo(req.params.orderNo.toUpperCase());
  if (!o) throw bad('Order not found', 404);
  const { user_id, email, ...safe } = o;
  res.json(safe);
}));

/* ---- admin ---- */
r.get('/', requireAdmin, wrap(async (req, res) => res.json(await orders.listAll({ status: req.query.status }))));
r.get('/stats', requireAdmin, wrap(async (_req, res) => res.json(await stats.overview())));
r.patch('/:id/status', requireAdmin, wrap(async (req, res) => {
  if (!STATUSES.includes(req.body.status)) throw bad('Invalid status');
  const row = await orders.setStatus(req.params.id, req.body.status);
  if (!row) throw bad('Order not found', 404);
  res.json(row);
}));

// Admin confirms (or rejects) a manual Telecel / AirtelTigo payment after checking the money arrived.
r.patch('/:id/payment', requireAdmin, wrap(async (req, res) => {
  if (!['paid', 'failed', 'pending'].includes(req.body.status)) throw bad('Invalid payment status');
  const row = await orders.setPaymentStatus(req.params.id, req.body.status);
  if (!row) throw bad('Order not found', 404);
  res.json(row);
}));

export default r;
