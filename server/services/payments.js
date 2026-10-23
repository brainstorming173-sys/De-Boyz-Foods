// One entry point for "pay now". Picks the right flow for the customer's network:
//   MTN                    -> direct MTN MoMo Collections API (mtnmomo.js), confirmed automatically
//   Telecel, AirtelTigo    -> manual: customer sends money to our number(s) and submits the
//                             transaction ID; an admin confirms it in the dashboard
import * as mtn from './mtnmomo.js';
import { NETWORKS, NETWORK_IDS, toMsisdn } from './momo.js';
import { config } from '../config.js';

export const isManual = (network) => network !== 'mtn';

// Every network can take payment now (MTN automatically, the others by manual confirmation).
export const isAvailable = () => true;

export const listNetworks = () =>
  NETWORK_IDS.map((id) => ({ id, label: NETWORKS[id].label, available: true, manual: isManual(id) }));

// The currency the provider reports back (MTN's sandbox only deals in EUR).
export const currencyFor = (network) => (network === 'mtn' ? config.momo.currency : 'GHS');

// Starts the payment. Resolves with { next: 'approve' } (MTN prompt sent)
// or { next: 'manual', numbers } (customer must send money themselves).
export async function start({ network, referenceId, order, phone }) {
  if (network === 'mtn') {
    await mtn.requestToPay({
      referenceId,
      amount: Number(order.total),
      msisdn: toMsisdn(phone),
      externalId: order.order_no,
      payerMessage: `De-Boyz Foods order ${order.order_no}`,
      payeeNote: order.order_no,
    });
    return { next: 'approve' };
  }
  return { next: 'manual', numbers: config.manualPay.numbers };
}

// Only MTN can be checked with the provider. Manual payments are confirmed by an admin.
export const getPayment = (referenceId) => mtn.getPayment(referenceId);
