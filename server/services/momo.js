// Ghana mobile money helpers: number cleanup and the three networks.
// Prefixes are only a hint for pre-selecting a network. Numbers can be ported between
// networks, so the network the customer picks is what counts.
export const NETWORKS = {
  mtn: { id: 'mtn', label: 'MTN MoMo', prefixes: ['024', '025', '053', '054', '055', '059'] },
  telecel: { id: 'telecel', label: 'Telecel Cash', prefixes: ['020', '050'] },
  airteltigo: { id: 'airteltigo', label: 'AirtelTigo Money', prefixes: ['026', '027', '056', '057'] },
};
export const NETWORK_IDS = Object.keys(NETWORKS);
export const isNetwork = (id) => NETWORK_IDS.includes(id);

// Returns a local 10-digit number like 0241234567, or null.
export function normalizePhone(input) {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('233') && d.length === 12) d = '0' + d.slice(3);
  else if (d.length === 9) d = '0' + d;
  return /^0\d{9}$/.test(d) ? d : null;
}

// Best guess at the network from the number's prefix, or null.
export function guessNetwork(phone) {
  const p = normalizePhone(phone);
  if (!p) return null;
  return NETWORK_IDS.find((id) => NETWORKS[id].prefixes.includes(p.slice(0, 3))) || null;
}

// MTN's API wants MSISDN format: country code + number, no plus or leading zero.
export const toMsisdn = (phone) => '233' + normalizePhone(phone).slice(1);
