// One entry point for "pay now". Every network (MTN, Telecel, AirtelTigo) works the same way:
// the customer sends money to our number(s) and submits the transaction ID, then an admin
// confirms it in the dashboard.
import { NETWORKS, NETWORK_IDS } from './momo.js';
import { config } from '../config.js';

// Every network can take payment (by manual confirmation).
export const isAvailable = () => true;

export const listNetworks = () =>
  NETWORK_IDS.map((id) => ({ id, label: NETWORKS[id].label, available: true }));

// Starts the payment. Resolves with { next: 'manual', numbers } (customer must send money themselves).
export async function start() {
  return { next: 'manual', numbers: config.manualPay.numbers };
}
