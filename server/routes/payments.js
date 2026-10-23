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

// Asks the provider directly what happened and updates our record. Returns 'paid' | 'failed' | 'pending'.
async function check(order) {
  if (order.payment_status === 'paid') return 'paid';
  if (!order.payment_reference) return 'pending';
  const network = order.payment_network || 'mtn'; // orders from before multi-network were all MTN
  if (pay.isManual(network)) return order.payment_status; // an admin confirms these by hand
  let tx;
  try {
    tx = await pay.getPayment(order.payment_reference);
  } catch (e) {
    if (e.gateway) return 'pending';
    throw e;
  }
  if (tx.status === 'SUCCESSFUL') {
    if (Math.abs(Number(tx.amount) - Number(order.total)) < 0.005 && tx.currency === pay.currencyFor(network)) {
      await orders.markPaidByNo(order.order_no);
      return 'paid';
    }
    console.error(`Amount mismatch on ${order.order_no}: got ${tx.amount} ${tx.currency}`);
    return 'failed';
  }
  if (tx.status === 'FAILED') {
    await orders.markFailedByNo(order.order_no);
    return 'failed';
  }
  return 'pending';
}

// Which networks can pay online right now (the checkout greys out the rest).
r.get('/networks', (_req, res) => res.json(pay.listNetworks()));

// 1) Send the payment prompt to the customer's phone.
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
  const step = await pay.start({ network, referenceId, order, phone });
  if (step.next === 'manual') {
    return res.json({ status: 'pending', next: 'manual', numbers: step.numbers, amount: Number(order.total) });
  }
  res.json({ status: 'pending', next: step.next, message: 'Approve the prompt on your phone with your MoMo PIN.' });
}));

// 1b) Telecel / AirtelTigo: the customer has sent the money and tells us the transaction ID.
//     The order stays unpaid until an admin confirms it.
r.post('/momo/manual', wrap(async (req, res) => {
  const order = await loadPayable(req.body.orderNo);
  if (order.payment_status === 'paid') return res.json({ status: 'success', message: 'Already paid' });
  if (!order.payment_reference || !pay.isManual(order.payment_network || 'mtn')) throw bad('Start the payment first');
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

// 2) The browser polls this while the customer approves on their phone.
r.get('/status/:orderNo', wrap(async (req, res) => {
  const order = await loadPayable(req.params.orderNo);
  res.json({ payment_status: await check(order), submitted: !!order.payment_txn_id });
}));

// 3) Optional MTN callback (production). The body is never trusted: it only triggers a
//    fresh status check straight from MTN.
r.all('/momo/callback', wrap(async (req, res) => {
  const no = String(req.body?.externalId || '').toUpperCase();
  const order = no ? await orders.getByNo(no) : null;
  if (order) await check(order).catch(console.error);
  res.sendStatus(200);
}));

export default r;
