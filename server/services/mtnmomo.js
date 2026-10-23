// Direct MTN MoMo Collections API. No payment aggregator in between.
import { config } from '../config.js';

const m = config.momo;
const mock = new Map(); // dev-only: referenceId -> { at, amount }
let cached = { token: null, expiresAt: 0 };

const gatewayError = (message, status = 502) => Object.assign(new Error(message), { status, gateway: true });

function assertConfigured() {
  if (m.env === 'mock') return;
  if (!m.subscriptionKey || !m.apiUser || !m.apiKey) {
    throw Object.assign(new Error('Online payment is not set up yet'), { status: 503 });
  }
}

async function getToken() {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const res = await fetch(`${m.baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${m.apiUser}:${m.apiKey}`).toString('base64')}`,
      'Ocp-Apim-Subscription-Key': m.subscriptionKey,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    console.error('MTN token error', res.status, json);
    throw gatewayError('Could not reach MTN MoMo. Try again shortly.');
  }
  cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return cached.token;
}

async function authHeaders(extra = {}) {
  return {
    Authorization: `Bearer ${await getToken()}`,
    'X-Target-Environment': m.targetEnv,
    'Ocp-Apim-Subscription-Key': m.subscriptionKey,
    ...extra,
  };
}

// Sends the approval prompt to the customer's phone. Resolves when MTN accepts the request (HTTP 202).
export async function requestToPay({ referenceId, amount, msisdn, externalId, payerMessage, payeeNote }) {
  assertConfigured();
  if (m.env === 'mock') {
    mock.set(referenceId, { at: Date.now(), amount: String(amount) });
    return;
  }
  const headers = await authHeaders({ 'Content-Type': 'application/json', 'X-Reference-Id': referenceId });
  if (m.env === 'production' && m.callbackUrl) headers['X-Callback-Url'] = m.callbackUrl;

  const res = await fetch(`${m.baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount: String(amount),
      currency: m.currency,
      externalId,
      payer: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage,
      payeeNote,
    }),
  });
  if (res.status !== 202) {
    console.error('MTN requesttopay error', res.status, await res.text().catch(() => ''));
    throw gatewayError(
      res.status === 400 ? 'That number could not be charged. Check it and try again.' : 'MTN MoMo could not start the payment. Try again.',
      res.status === 400 ? 400 : 502
    );
  }
}

// Returns { status: 'PENDING' | 'SUCCESSFUL' | 'FAILED', amount, currency, reason }.
export async function getPayment(referenceId) {
  assertConfigured();
  if (m.env === 'mock') {
    const p = mock.get(referenceId);
    if (!p) throw gatewayError('Unknown reference', 404);
    // Dev simulation: approved 8 seconds after the "prompt".
    return { status: Date.now() - p.at > 8000 ? 'SUCCESSFUL' : 'PENDING', amount: p.amount, currency: m.currency };
  }
  const res = await fetch(`${m.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(referenceId)}`, {
    headers: await authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw gatewayError('Could not check the payment yet', res.status === 404 ? 404 : 502);
  return json;
}
