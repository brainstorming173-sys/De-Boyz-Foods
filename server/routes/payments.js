import { Router } from 'express';
import crypto from 'node:crypto';
import { orders } from '../db/store.js';
import * as pay from '../services/payments.js';
import { NETWORKS, isNetwork, normalizePhone, guessNetwork } from '../services/momo.js';
import { wrap, bad } from '../middleware/error.js';

const r = Router();

async function loadPayable(orderNo) {
  const order = await orders.getByNo(String(orderNo || '').toUpperCase());
  if (!order) throw bad('Order not found', 404);
  if (order.payment_method !== 'momo_now') throw bad('This order is not set to pay now');
  return order;
}

// Which networks can pay online right now (the checkout greys out the rest).
r.get('/networks', (_req, res) => res.json(pay.listNetworks()));

// 1) Register the payment attempt and tell the customer which number(s) to send the money to.
r.post('/momo/charge', wrap(async (req, res) => {
  const order = await loadPayable(req.body.orderNo);
  if (order.payment_status === 'paid') return res.json({ status: 'success', message: 'Already paid' });

  const phone = normalizePhone(req.body.phone);
  if (!phone) throw bad('Enter a valid mobile money number, e.g. 024 123 4567');
  const network = req.body.network || guessNetwork(phone);
  if (!isNetwork(network)) throw bad('Choose your mobile money network');
  if (!pay.isAvailable(network)) {
    throw bad(`Pay now isn't available for ${NETWORKS[network].label} yet. Choose cash or MoMo on delivery instead.`);
  }

  const referenceId = crypto.randomUUID(); // a new one per attempt
  await orders.setPaymentRef(order.order_no, referenceId, network);
  const step = await pay.start();
  res.json({ status: 'pending', next: step.next, numbers: step.numbers, amount: Number(order.total) });
}));

// 2) The customer has sent the money and tells us the transaction ID.
//    The order stays unpaid until an admin confirms it.
r.post('/momo/manual', wrap(async (req, res) => {
  const order = await loadPayable(req.body.orderNo);
  if (order.payment_status === 'paid') return res.json({ status: 'success', message: 'Already paid' });
  if (!order.payment_reference) throw bad('Start the payment first');
  const txnId = String(req.body.txnId || '').trim();
  if (!/^[A-Za-z0-9]{6,20}$/.test(txnId)) throw bad('Enter the transaction ID from your payment confirmation SMS');
  const sender = normalizePhone(req.body.senderPhone);
  if (!sender) throw bad('Enter the number you sent the money from');
  try {
    await orders.setManualPayment(order.order_no, txnId, sender);
  } catch (e) {
    if (e.code === '23505') throw bad('That transaction ID has already been used on another order');
    throw e;
  }
  res.json({ status: 'pending', message: 'Thanks! We are confirming your payment.' });
}));

// 3) The browser polls this while an admin confirms the payment.
r.get('/status/:orderNo', wrap(async (req, res) => {
  const order = await loadPayable(req.params.orderNo);
  res.json({ payment_status: order.payment_status, submitted: !!order.payment_txn_id });
}));

export default r;
