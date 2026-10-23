import { NETWORK_LIST } from '../momo.js';

// Pick the mobile money network. `available` is a map of network id -> boolean.
export default function NetworkPicker({ value, onChange, available = {} }) {
  return (
    <div role="radiogroup" aria-label="Mobile money network" className="grid grid-cols-3 gap-2">
      {NETWORK_LIST.map((n) => {
        const ok = !!available[n.id];
        const active = value === n.id;
        return (
          <button
            key={n.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!ok}
            onClick={() => onChange(n.id)}
            className={`rounded-xl border px-2 py-2.5 text-center transition disabled:cursor-not-allowed disabled:opacity-50 ${
              active ? 'border-leaf bg-leaf-soft text-leaf' : 'border-black/15 bg-white enabled:hover:bg-black/5'
            }`}
          >
            <span className="block text-sm font-bold">{n.short}</span>
            <span className="block text-xs text-black/60">{ok ? n.product : 'Unavailable'}</span>
          </button>
        );
      })}
    </div>
  );
}
