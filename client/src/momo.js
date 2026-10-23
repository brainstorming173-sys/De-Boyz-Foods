// Ghana mobile money helpers (mirror of server/services/momo.js).
// Prefixes only pre-select a network. Numbers can be ported between networks, so the
// customer's own choice is what gets used.
export const NETWORKS = {
  mtn: { id: 'mtn', short: 'MTN', product: 'MoMo', label: 'MTN MoMo', prefixes: ['024', '025', '053', '054', '055', '059'] },
  telecel: { id: 'telecel', short: 'Telecel', product: 'Cash', label: 'Telecel Cash', prefixes: ['020', '050'] },
  airteltigo: { id: 'airteltigo', short: 'AirtelTigo', product: 'Money', label: 'AirtelTigo Money', prefixes: ['026', '027', '056', '057'] },
};
export const NETWORK_LIST = Object.values(NETWORKS);

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
  return NETWORK_LIST.find((n) => n.prefixes.includes(p.slice(0, 3)))?.id || null;
}
