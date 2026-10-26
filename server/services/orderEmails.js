// Order emails. These run in the background after the response is sent, so a mail problem
// can never fail a checkout or an admin action.
import { orders } from '../db/store.js';
import { sendOrderNotification, sendOrderReceipt } from './email.js';

const safely = (label, fn) =>
  Promise.resolve().then(fn).catch((e) => console.error(`[order-email] ${label} failed:`, e.message));

// Just after checkout: tell the shop, and confirm the order to the customer.
export function onOrderPlaced(order) {
  return safely('order placed', async () => {
    if (await orders.claimEmail(order.id, 'owner_notified_at')) {
      const ok = await sendOrderNotification(order);
      if (!ok) await orders.releaseEmail(order.id, 'owner_notified_at');
    }
    await sendOrderReceipt(order); // confirmation (unpaid) or receipt, depending on payment_status
  });
}

// When an order becomes paid (admin confirms the money): send the customer their paid receipt once.
export function onOrderPaid(orderId) {
  return safely('order paid', async () => {
    if (!(await orders.claimEmail(orderId, 'receipt_sent_at'))) return;
    const order = await orders.getById(orderId);
    if (!order || order.payment_status !== 'paid' || !order.email) return;
    const ok = await sendOrderReceipt(order);
    if (!ok) await orders.releaseEmail(orderId, 'receipt_sent_at');
  });
}
