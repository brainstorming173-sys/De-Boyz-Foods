// One-time helper: creates a SANDBOX API user + key on MTN's developer portal.
// Needs MOMO_SUBSCRIPTION_KEY (Collections product) in .env. Prints the values to paste back into .env.
import crypto from 'node:crypto';
import '../config.js';

const key = process.env.MOMO_SUBSCRIPTION_KEY;
const base = 'https://sandbox.momodeveloper.mtn.com';
if (!key) {
  console.error('Set MOMO_SUBSCRIPTION_KEY in .env first (MTN developer portal > Collections > Primary key).');
  process.exit(1);
}

const user = crypto.randomUUID();
const created = await fetch(`${base}/v1_0/apiuser`, {
  method: 'POST',
  headers: { 'X-Reference-Id': user, 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ providerCallbackHost: 'localhost' }),
});
if (created.status !== 201) {
  console.error('Could not create API user:', created.status, await created.text());
  process.exit(1);
}
const keyRes = await fetch(`${base}/v1_0/apiuser/${user}/apikey`, {
  method: 'POST',
  headers: { 'Ocp-Apim-Subscription-Key': key },
});
const { apiKey } = await keyRes.json();
console.log('\nAdd these to .env:\n');
console.log('MOMO_ENV=sandbox');
console.log(`MOMO_API_USER=${user}`);
console.log(`MOMO_API_KEY=${apiKey}\n`);
