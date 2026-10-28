import { Resend } from 'resend';
import { config } from '../config.js';

const resend = config.resendKey ? new Resend(config.resendKey) : null;

async function send({ to, subject, html }) {
  if (!resend) {
    console.log(`\n[email:dev] to=${to}\nsubject=${subject}\n${html.replace(/<[^>]+>/g, ' ')}\n`);
    return true;
  }
  // Resend allows only a couple of requests per second. If we hit that limit, wait and try again.
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { error } = await resend.emails.send({ from: config.emailFrom, to, subject, html });
      if (!error) return true;
      console.error(`Resend error (try ${attempt}) sending "${subject}" to ${[].concat(to).join(', ')}:`, error);
      const limited = error.statusCode === 429 || error.name === 'rate_limit_exceeded';
      if (!limited) return false;
    } catch (e) {
      console.error(`Resend error sending "${subject}":`, e.message);
      return false;
    }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  return false;
}

const wrapHtml = (body) =>
  `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1b1b1b">
     <h2 style="color:#0b6b2e;margin:0 0 16px">De-Boyz Foods</h2>${body}</div>`;

export const sendVerificationEmail = (to, name, token) => {
  const link = `${config.clientOrigin}/verify-email?token=${token}`;
  return send({
    to,
    subject: 'Verify your email',
    html: wrapHtml(`<p>Hi ${name},</p><p>Confirm your email to finish setting up your account.</p>
      <p><a href="${link}" style="background:#0b6b2e;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Verify email</a></p>`),
  });
};

export const sendPasswordResetEmail = (to, name, token) => {
  const link = `${config.clientOrigin}/reset-password?token=${token}`;
  return send({
    to,
    subject: 'Reset your password',
    html: wrapHtml(`<p>Hi ${name},</p><p>Use this link to choose a new password. It expires in 1 hour.</p>
      <p><a href="${link}" style="background:#0b6b2e;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Reset password</a></p>
      <p>If you didn't ask for this, you can ignore this email.</p>`),
  });
};

/* ---------------- order emails ---------------- */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ghs = (n) => `GH₵${Number(n || 0).toFixed(2)}`;
const NETWORK = { mtn: 'MTN MoMo', telecel: 'Telecel Cash', airteltigo: 'AirtelTigo Money' };
const METHOD = { cash: 'Cash on delivery / pickup', momo: 'MoMo on delivery', momo_now: 'Mobile money (pay now)' };
const PAY = {
  paid: { label: 'PAID', color: '#0b6b2e' },
  pending: { label: 'PENDING', color: '#c27803' },
  failed: { label: 'FAILED', color: '#d9381e' },
};

const orderEmailShell = ({ title, heading, body }) => `<!doctype html><html><body style="margin:0;background:#f2f2f2;padding:12px">
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;color:#1b1b1b">
  <div style="background:#0b6b2e;color:#fff;text-align:center;padding:28px 16px">
    <div style="font-size:26px;font-weight:800;letter-spacing:2px">DE-BOYZ FOODS</div>
    <div style="margin-top:6px;font-size:15px;color:#d9f2e0">${esc(title)}</div>
  </div>
  <div style="padding:24px">
    <h2 style="margin:0 0 16px;font-size:20px;line-height:1.3">${esc(heading)}</h2>${body}
  </div></div></body></html>`;

const row = (label, value) =>
  `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px"><strong>${esc(label)}:</strong> ${value}</td></tr>`;

function orderBody(o, { forOwner }) {
  const items = o.items || [];
  const pay = PAY[o.payment_status] || PAY.pending;
  const delivery = o.fulfillment === 'delivery';
  const mapLink = delivery && o.delivery_lat != null && o.delivery_lng != null
    ? `https://www.google.com/maps?q=${o.delivery_lat},${o.delivery_lng}` : null;

  const itemRows = items.map((i) => `<tr>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:14px">${esc(i.name)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:14px;text-align:center">${esc(i.qty)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:14px;text-align:right">${ghs(i.unit_price ?? i.price)}</td>
      <td style="padding:8px 6px;border-bottom:1px solid #eee;font-size:14px;text-align:right">${ghs(Number(i.unit_price ?? i.price) * Number(i.qty))}</td></tr>`).join('');

  const details = [
    row('Order Number', `#${esc(o.order_no)}`),
    row('Customer', esc(o.customer_name)),
    o.email ? row('Email', `<a href="mailto:${esc(o.email)}" style="color:#1a56db">${esc(o.email)}</a>`) : '',
    row('Phone', `<a href="tel:${esc(o.phone)}" style="color:#1a56db">${esc(o.phone)}</a>`),
    row('Order Type', delivery ? 'DELIVERY' : 'PICKUP'),
  ].join('');

  const fulfil = `<div style="background:#f3f4f6;border-radius:10px;padding:14px 16px;margin:16px 0;font-size:14px;line-height:1.6">
      ${delivery ? `<div><strong>Address:</strong> ${esc(o.address)}</div>` : '<div><strong>Pickup:</strong> Customer will collect the order</div>'}
      ${mapLink ? `<div><strong>Map pin:</strong> <a href="${mapLink}" style="color:#1a56db">Open in Google Maps</a></div>` : ''}
      ${o.note ? `<div><strong>Instructions:</strong> ${esc(o.note)}</div>` : ''}
    </div>`;

  const payRows = [
    row('Payment Status', `<strong style="color:${pay.color}">${pay.label}</strong>`),
    row('Payment Method', esc(METHOD[o.payment_method] || o.payment_method)),
    o.payment_network ? row('Network', esc(NETWORK[o.payment_network] || o.payment_network)) : '',
    forOwner && o.payment_txn_id ? row('Transaction ID', esc(o.payment_txn_id)) : '',
    forOwner && o.payment_sender ? row('Paid From', esc(o.payment_sender)) : '',
    row('Order Status', esc(String(o.status).replace(/_/g, ' '))),
  ].join('');

  return `<table style="width:100%;border-collapse:collapse">${details}</table>
    <h3 style="margin:22px 0 6px;font-size:16px">Order Summary</h3>
    <table style="width:100%;border-collapse:collapse">
      <tr style="background:#f6f6f6">
        <th style="padding:8px 6px;text-align:left;font-size:13px">Item</th>
        <th style="padding:8px 6px;text-align:center;font-size:13px">Qty</th>
        <th style="padding:8px 6px;text-align:right;font-size:13px">Price</th>
        <th style="padding:8px 6px;text-align:right;font-size:13px">Amount</th></tr>${itemRows}</table>
    <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:14px">
      <tr><td style="padding:4px 0">Subtotal</td><td style="text-align:right">${ghs(o.subtotal)}</td></tr>
      <tr><td style="padding:4px 0">Delivery fee</td><td style="text-align:right">${Number(o.delivery_fee) ? ghs(o.delivery_fee) : 'Free'}</td></tr>
      <tr><td style="padding:10px 0 0;border-top:2px solid #1b1b1b;font-size:17px;font-weight:bold">Total${o.payment_status === 'paid' ? ' Paid' : ''}</td>
          <td style="padding:10px 0 0;border-top:2px solid #1b1b1b;font-size:17px;font-weight:bold;text-align:right">${ghs(o.total)}</td></tr></table>
    ${fulfil}
    <table style="width:100%;border-collapse:collapse">${payRows}</table>`;
}

// To the shop owner: a new order just came in.
export async function sendOrderNotification(order) {
  const to = config.orderNotifyEmails;
  if (!to.length) { console.warn('[email] No ORDER_NOTIFY_EMAIL or ADMIN_EMAIL set, skipping new-order email.'); return; }
  const paid = order.payment_status === 'paid';
  return send({
    to,
    subject: `${paid ? 'New paid order' : 'New order'} #${order.order_no} · ${ghs(order.total)}`,
    html: orderEmailShell({
      title: paid ? 'New Paid Order' : 'New Order',
      heading: `New De-Boyz Foods order #${order.order_no}`,
      body: orderBody(order, { forOwner: true }),
    }),
  });
}

// To the customer: their receipt (only when they gave an email).
export async function sendOrderReceipt(order) {
  if (!order.email) { console.warn(`[email] Order ${order.order_no} has no customer email, receipt skipped.`); return; }
  const paid = order.payment_status === 'paid';
  return send({
    to: order.email,
    subject: `${paid ? 'Payment receipt' : 'Order confirmation'} · #${order.order_no}`,
    html: orderEmailShell({
      title: paid ? 'Payment Receipt' : 'Order Confirmation',
      heading: `Thank you, ${order.customer_name}!`,
      body: `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">${paid
        ? 'We have received your payment. Here is your receipt.'
        : 'We have received your order and will be in touch shortly.'} You can track it any time with your order number.</p>${orderBody(order, { forOwner: false })}
        <p style="margin:20px 0 0;font-size:13px;color:#666">Questions? Reply to this email or call us.</p>`,
    }),
  });
}
