import { Router } from 'express';
import { messages } from '../db/store.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { wrap, bad } from '../middleware/error.js';
import { sendMessageToCustomer, sendMessageToShop } from '../services/email.js';

const r = Router();
const EMAIL_GAP_MS = 10 * 60 * 1000; // at most one notification email per 10 minutes per conversation side

// Unread count for the badge in the navbar (customer: replies from the shop; admin: customer messages).
r.get('/unread', requireAuth, wrap(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ unread: await messages.unreadCount(req.user) });
}));

// Admin inbox.
r.get('/inbox', requireAdmin, wrap(async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await messages.inbox());
}));

// A conversation. Opening it marks the other side's messages as read.
r.get('/order/:orderNo', requireAuth, wrap(async (req, res) => {
  const { order, error, status } = await messages.orderFor(req.params.orderNo.toUpperCase(), req.user);
  if (error) throw bad(error, status);
  res.set('Cache-Control', 'no-store');
  res.json({ order_no: order.order_no, customer_name: order.customer_name, messages: await messages.thread(order.id, req.user.role === 'admin' ? 'admin' : 'customer') });
}));

r.post('/order/:orderNo', requireAuth, wrap(async (req, res) => {
  const body = String(req.body.body || '').trim();
  if (!body) throw bad('Type a message first');
  if (body.length > 1000) throw bad('That message is too long (1000 characters max)');
  const { order, error, status } = await messages.orderFor(req.params.orderNo.toUpperCase(), req.user);
  if (error) throw bad(error, status);
  const role = req.user.role === 'admin' ? 'admin' : 'customer';
  if (role === 'admin' && !order.user_id) throw bad('This walk-in order has no customer account to message');
  const msg = await messages.add(order.id, role, body);
  res.status(201).json(msg);

  // Background email, throttled so a quick back-and-forth does not flood anyone's inbox.
  (async () => {
    const prev = await messages.previousFrom(order.id, role, msg.id);
    if (prev && Date.now() - new Date(prev).getTime() < EMAIL_GAP_MS) return;
    if (role === 'admin') { if (order.email) await sendMessageToCustomer({ to: order.email, orderNo: order.order_no, body }); }
    else await sendMessageToShop({ orderNo: order.order_no, customerName: order.customer_name, body });
  })().catch((e) => console.error('[message-email] failed:', e.message));
}));

export default r;
