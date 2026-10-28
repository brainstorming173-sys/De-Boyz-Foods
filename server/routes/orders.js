import { Router } from 'express';
import { orders, stats, users } from '../db/store.js';
import { optionalAuth, requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap, bad } from '../middleware/error.js';
import { config } from '../config.js';
import { onOrderPlaced, onOrderPaid } from '../services/orderEmails.js';

const r = Router();
const STATUSES = ['new', 'confirmed', 'preparing', 'out_for_delivery', 'completed', 'cancelled'];

// Checkout. An account is required, so every order is linked to a user.
r.post('/', requireAuth, wrap(async (req, res) => {
  const { items, customer = {}, fulfillment = 'delivery', paymentMethod = 'cash' } = req.body;
  if (!Array.isArray(items) || !items.length) throw bad('Your cart is empty');
  if (!customer.name?.trim()) throw bad('Enter your name');
  if (!/^[0-9+\s-]{9,15}$/.test(customer.phone || '')) throw bad('Enter a valid phone number');
  if (!['delivery', 'pickup'].includes(fulfillment)) throw bad('Choose delivery or pickup');
  if (!['cash', 'momo', 'momo_now'].includes(paymentMethod)) throw bad('Choose a payment method');
  if (fulfillment === 'delivery' && !customer.address?.trim()) throw bad('Enter your delivery address');
  // Delivery orders must carry the pin the customer dropped on the map (used for rider directions).
  let location = null;
  if (fulfillment === 'delivery') {
    const { lat, lng } = req.body.location || {};
    const ok = typeof lat === 'number' && typeof lng === 'number' && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (!ok) throw bad('Drop a pin on the map to mark your delivery location');
    location = { lat, lng };
  }
  // The checkout form has no email box: use the signed-in account's email so the receipt always has somewhere to go.
  if (!customer.email?.trim()) customer.email = (await users.findById(req.user.id))?.email || null;
  const order = await orders.create({ userId: req.user?.id, customer, items, fulfillment, paymentMethod, location, deliveryZone: req.body.deliveryZone });
  res.status(201).json(order);
  onOrderPlaced(order); // emails go out in the background
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
r.get('/users', requireAdmin, wrap(async (_req, res) => res.json(await users.listWithOrders())));
r.get('/stats', requireAdmin, wrap(async (_req, res) => res.json({ ...(await stats.overview()), ...(await stats.users()) })));
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
  if (row.payment_status === 'paid') onOrderPaid(row.id); // paid receipt to the customer (once)
}));

export default r;
