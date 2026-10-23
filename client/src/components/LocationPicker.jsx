import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Search, Loader2, MapPin } from 'lucide-react';

const KOFORIDUA = [6.0941, -0.2591];

// Red teardrop pin. A custom icon avoids Leaflet's default marker images, which break under bundlers.
const pinIcon = L.divIcon({
  className: '',
  html: '<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg"><path d="M16 0C7.2 0 0 7 0 15.7 0 27 16 42 16 42s16-15 16-26.3C32 7 24.8 0 16 0z" fill="#D9381E"/><circle cx="16" cy="15.5" r="6" fill="#fff"/></svg>',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

// Lets the customer drop (and drag) a pin on the map to mark their exact delivery spot.
// value: { lat, lng } | null.  onChange: called with { lat, lng } whenever the pin moves.
export default function LocationPicker({ value, onChange }) {
  const box = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState('');   // '' | 'search' | 'locate'
  const [note, setNote] = useState('');

  // Move the pin (creating it the first time) and tell the parent.
  function place(lat, lng, { fly = false } = {}) {
    const ll = [lat, lng];
    if (!marker.current) {
      marker.current = L.marker(ll, { icon: pinIcon, draggable: true }).addTo(map.current);
      marker.current.on('dragend', () => {
        const p = marker.current.getLatLng();
        cb.current({ lat: p.lat, lng: p.lng });
      });
    } else {
      marker.current.setLatLng(ll);
    }
    if (fly) map.current.flyTo(ll, Math.max(map.current.getZoom(), 17), { duration: 0.8 });
    cb.current({ lat, lng });
  }

  useEffect(() => {
    const m = L.map(box.current, { center: value ? [value.lat, value.lng] : KOFORIDUA, zoom: value ? 17 : 14, scrollWheelZoom: false });
    map.current = m;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m);
    m.on('click', (e) => { setNote(''); place(e.latlng.lat, e.latlng.lng); });
    if (value) place(value.lat, value.lng);
    setTimeout(() => m.invalidateSize(), 0);
    return () => { m.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function locate() {
    setNote('');
    if (!navigator.geolocation) return setNote('Your browser can’t share your location. Tap the map to drop a pin instead.');
    setBusy('locate');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBusy(''); place(pos.coords.latitude, pos.coords.longitude, { fly: true }); },
      (err) => {
        setBusy('');
        setNote(err.code === 1
          ? 'Location access was blocked. Allow it in your browser settings, or tap the map to drop a pin.'
          : 'We couldn’t get your location. Tap the map to drop a pin instead.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  async function search() {
    const q = query.trim();
    if (!q) return;
    setNote(''); setResults([]); setBusy('search');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=gh&q=${encodeURIComponent(q)}`);
      const list = await res.json();
      if (!list.length) setNote('No match found. Try a nearby landmark, or tap the map.');
      setResults(list);
    } catch {
      setNote('Search isn’t working right now. Tap the map to drop a pin instead.');
    } finally {
      setBusy('');
    }
  }

  function choose(r) {
    setResults([]);
    place(Number(r.lat), Number(r.lon), { fly: true });
  }

  return (
    <div className="space-y-2">
      <p className="label">Pin your exact location</p>

      <div className="flex gap-2">
        <input
          className="field"
          placeholder="Search your area or landmark"
          aria-label="Search for a place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
        />
        <button type="button" onClick={search} className="btn-ghost h-[42px] w-[42px] shrink-0 p-0" aria-label="Search">
          {busy === 'search' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/10 bg-white text-sm">
          {results.map((r) => (
            <li key={r.place_id}>
              <button type="button" onClick={() => choose(r)} className="block w-full px-3 py-2 text-left hover:bg-black/5">{r.display_name}</button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" onClick={locate} className="btn-ghost w-full" disabled={busy === 'locate'}>
        {busy === 'locate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Use my current location
      </button>

      <div className="isolate overflow-hidden rounded-xl border border-black/10">
        <div ref={box} className="h-64 w-full" />
      </div>

      <p className={`flex items-center gap-1.5 text-xs ${value ? 'text-leaf' : 'text-black/60'}`}>
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        {value ? 'Pin set. Drag it to fine-tune the exact spot.' : 'Tap the map to drop a pin where we should deliver.'}
      </p>
      {note && <p role="alert" className="text-xs text-chili">{note}</p>}
    </div>
  );
}
