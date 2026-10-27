import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleButton from '../components/GoogleButton.jsx';
import { Minus, Plus, Trash2, ShoppingBag, Smartphone } from 'lucide-react';
import { api, money } from '../api.js';
import { NETWORKS, guessNetwork, normalizePhone } from '../momo.js';
import NetworkPicker from '../components/NetworkPicker.jsx';
import LocationPicker from '../components/LocationPicker.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Cart() {
  const cart = useCart();
  const { user, loading } = useAuth();
  const [gate, setGate] = useState(false); // sign-up popup shown when a guest tries to pay
  const [gateError, setGateError] = useState('');
  const nav = useNavigate();
  const [settings, setSettings] = useState({ mealZones: [], groceryDeliveryFee: 20 });
  const [zone, setZone] = useState(''); // delivery area for meal-only orders
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', note: '' });
  const [fulfillment, setFulfillment] = useState('delivery');
  const [payment, setPayment] = useState('momo_now'); // momo_now = pay now: send money to our number, then confirm
  const [momoPhone, setMomoPhone] = useState('');
  const [pin, setPin] = useState(null); // { lat, lng } dropped on the map (delivery only)
  const [picked, setPicked] = useState(null); // network the customer chose; falls back to a guess from the number
  const [networks, setNetworks] = useState({ mtn: true, telecel: true, airteltigo: true }); // id -> can pay online
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.storeSettings().then(setSettings).catch(() => {}); }, []);
  useEffect(() => {
    api.paymentNetworks().then((list) => setNetworks(Object.fromEntries(list.map((n) => [n.id, n.available])))).catch(() => {});
  }, []);
  useEffect(() => { if (user) setGate(false); }, [user]);
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || '' }));
  }, [user]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const hasGroceries = cart.items.some((i) => i.type === 'product');
  const hasMeals = cart.items.some((i) => i.type === 'meal');
  const needsZone = fulfillment === 'delivery' && hasMeals; // meals: fee depends on the area
  const zoneRow = (settings.mealZones || []).find((z) => z.id === zone);
  // Groceries add the constant fee, meals add the area fee; a mixed order pays both.
  const fee = fulfillment === 'pickup' ? 0 : (hasGroceries ? settings.groceryDeliveryFee : 0) + (hasMeals && zoneRow ? zoneRow.fee : 0);
  const total = cart.subtotal + fee;

  const payNumber = momoPhone || form.phone;
  const numberOk = !!normalizePhone(payNumber);
  const guessed = guessNetwork(payNumber);
  const network = picked || guessed; // may be null until the number or a choice settles it
  const networkLabel = network ? NETWORKS[network].label : 'mobile money';
  const unavailable = network && !networks[network];
  const mismatch = picked && guessed && picked !== guessed;

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!user) { if (!loading) setGate(true); return; }
    if (needsZone && !zoneRow) return setError('Choose your delivery area so we can work out the delivery fee.');
    if (fulfillment === 'delivery' && !pin) return setError('Drop a pin on the map so our rider can find your exact location.');
    if (payment === 'momo_now') {
      if (!numberOk) return setError('Enter a valid mobile money number, e.g. 024 123 4567');
      if (!network) return setError('Choose your mobile money network');
      if (unavailable) return setError(`Pay now isn't available for ${networkLabel} yet. Choose cash or MoMo on delivery instead.`);
    }
    setBusy(true);
    try {
      const order = await api.placeOrder({
        items: cart.items.map((i) => ({ type: i.type, id: i.id, qty: i.qty })),
        customer: form, fulfillment, paymentMethod: payment, deliveryZone: needsZone ? zone : null,
        location: fulfillment === 'delivery' ? pin : null,
      });
      cart.clear();
      if (payment === 'momo_now') {
        // The pay page shows where to send the money, then collects the transaction ID.
        nav(`/pay/${order.order_no}`, { state: { phone: payNumber, network } });
      } else {
        nav(`/order/${order.order_no}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!cart.items.length) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center px-4 pb-16 pt-16 text-center sm:pb-24 sm:pt-24">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-black/[0.05]">
          <ShoppingBag className="h-10 w-10 text-black/60" strokeWidth={1.5} />
        </span>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:mt-8 sm:text-4xl">Your cart is empty</h1>
        <p className="mt-2 text-base text-black/65 sm:text-lg">Browse groceries and add items to get started.</p>
        <Link to="/groceries" className="mt-6 rounded-full bg-leaf px-8 py-3.5 font-display text-base font-bold sm:mt-8 sm:px-9 sm:py-4 sm:text-lg text-white hover:bg-leaf-dark">
          Shop Groceries
        </Link>
      </div>
    );
  }

  const choice = (active) => `flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${active ? 'border-leaf bg-leaf-soft text-leaf' : 'border-black/15 bg-white hover:bg-black/5'}`;
  const payOption = (value, title, sub) => (
    <button type="button" onClick={() => setPayment(value)} className={`w-full rounded-xl border px-4 py-3 text-left transition ${payment === value ? 'border-leaf bg-leaf-soft' : 'border-black/15 bg-white hover:bg-black/5'}`}>
      <span className={`block text-sm font-semibold ${payment === value ? 'text-leaf' : ''}`}>{title}</span>
      <span className="block text-xs text-black/60">{sub}</span>
    </button>
  );

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-3 py-6 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Your cart</h1>
        <ul className="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white sm:mt-6">
          {cart.items.map((i) => (
            <li key={`${i.type}-${i.id}`} className="grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-2 p-3 sm:flex sm:items-center sm:gap-4 sm:p-4">
              <div className="min-w-0 sm:flex-1">
                <p className="break-words font-bold leading-snug sm:truncate">{i.name}</p>
                <p className="text-sm text-black/60">{money(i.price)}{i.unit ? ` · ${i.unit}` : ''}</p>
              </div>
              <button type="button" onClick={() => cart.remove(i)} className="grid h-9 w-9 place-items-center text-black/40 hover:text-chili sm:order-last sm:h-auto sm:w-auto" aria-label={`Remove ${i.name}`}><Trash2 className="h-4 w-4" /></button>
              <div className="col-span-2 flex items-center justify-between gap-3 sm:contents">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => cart.setQty(i, i.qty - 1)} className="btn-ghost h-10 w-10 p-0 sm:h-9 sm:w-9" aria-label={`Remove one ${i.name}`}><Minus className="h-4 w-4" /></button>
                  <span className="w-6 text-center font-semibold">{i.qty}</span>
                  <button type="button" onClick={() => cart.add(i)} className="btn-ghost h-10 w-10 p-0 sm:h-9 sm:w-9" aria-label={`Add one ${i.name}`}><Plus className="h-4 w-4" /></button>
                </div>
                <p className="text-right font-bold sm:w-20">{money(i.price * i.qty)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submit} className="h-fit space-y-4 rounded-2xl border border-black/5 bg-white p-4 sm:p-6">
        <h2 className="text-xl font-bold">Checkout</h2>
        <p className="text-sm text-black/60">{user ? `Ordering as ${user.email}` : 'You\'ll sign up or sign in when you pay.'}</p>

        <div className="flex gap-2">
          <button type="button" className={choice(fulfillment === 'delivery')} onClick={() => setFulfillment('delivery')}>Delivery</button>
          <button type="button" className={choice(fulfillment === 'pickup')} onClick={() => setFulfillment('pickup')}>Pickup</button>
        </div>

        <div><label className="label" htmlFor="name">Full name</label><input id="name" className="field" required value={form.name} onChange={set('name')} /></div>
        <div><label className="label" htmlFor="phone">Phone number</label><input id="phone" className="field" required inputMode="tel" placeholder="024 000 0000" value={form.phone} onChange={set('phone')} /></div>
        {fulfillment === 'delivery' && (
          <div><label className="label" htmlFor="address">Delivery address</label><textarea id="address" className="field" rows={2} required value={form.address} onChange={set('address')} /></div>
        )}
        {needsZone && (
          <div>
            <label className="label" htmlFor="zone">Delivery area</label>
            <select id="zone" className="field" required value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">Choose your area</option>
              {(settings.mealZones || []).map((z) => <option key={z.id} value={z.id}>{z.label} ({money(z.fee)})</option>)}
            </select>
          </div>
        )}
        {fulfillment === 'delivery' && <LocationPicker value={pin} onChange={setPin} />}
        <div><label className="label" htmlFor="note">Note for the kitchen (optional)</label><input id="note" className="field" value={form.note} onChange={set('note')} /></div>

        <div className="space-y-2">
          <p className="label">Payment</p>
          {payOption('momo_now', 'Pay now with mobile money', 'MTN, Telecel or AirtelTigo: send money to our number, then confirm with your transaction ID.')}
          {payOption('cash', 'Cash on delivery', 'Pay the rider or at pickup.')}
          {payOption('momo', 'MoMo on delivery', 'Send MoMo to the rider when your order arrives.')}
        </div>

        {payment === 'momo_now' && (
          <div className="space-y-3 rounded-xl bg-black/[0.03] p-4">
            <div>
              <p className="label">Network</p>
              <NetworkPicker value={network} onChange={setPicked} available={networks} />
            </div>
            <div>
              <label className="label" htmlFor="momoPhone">{networkLabel} number</label>
              <input id="momoPhone" className="field" inputMode="tel" placeholder={form.phone || '024 000 0000'} value={momoPhone} onChange={(e) => setMomoPhone(e.target.value)} />
              <p className="mt-1 text-xs text-black/50">Leave blank to use your phone number above.</p>
            </div>
            {mismatch && (
              <p className="text-xs text-black/60">
                This number usually belongs to {NETWORKS[guessed].short}. If you moved it to {NETWORKS[picked].short}, carry on.
              </p>
            )}
            {unavailable && (
              <p role="alert" className="rounded-lg bg-chili-soft px-3 py-2 text-sm text-chili">
                Pay now isn't available for {networkLabel} yet. Choose cash or MoMo on delivery.
              </p>
            )}
          </div>
        )}

        <dl className="space-y-1 border-t border-black/5 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-black/60">Subtotal</dt><dd>{money(cart.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-black/60">Delivery</dt><dd>{fulfillment === 'pickup' ? 'Free' : needsZone && !zoneRow ? 'Choose area' : money(fee)}</dd></div>
          <div className="flex justify-between pt-2 font-display text-lg font-bold"><dt>Total</dt><dd>{money(total)}</dd></div>
        </dl>

        {error && <p role="alert" className="text-sm text-chili">{error}</p>}
        <button className="btn-green w-full py-3.5 text-base" disabled={busy}
          onClick={(e) => { if (!user && !loading) { e.preventDefault(); setGate(true); } }}>
          {busy ? 'Placing order...' : payment === 'momo_now' ? (<><Smartphone className="h-4 w-4" /> Pay {money(total)}</>) : 'Place order'}
        </button>
      </form>

      {gate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Sign up to continue">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card">
            <h2 className="text-2xl font-extrabold tracking-tight">Sign up to place your order</h2>
            <p className="mt-2 text-sm text-black/60">Create an account first. Your cart will be waiting for you.</p>
            <div className="mt-5">
              <GoogleButton text="signup_with" onDone={() => setGate(false)} onError={setGateError} />
            </div>
            {gateError && <p role="alert" className="mb-3 text-sm text-chili">{gateError}</p>}
            <Link to="/register" state={{ from: '/cart' }} className="btn-green w-full">Sign up with email</Link>
            <p className="mt-4 text-center text-sm">Already have an account? <Link to="/login" state={{ from: '/cart' }} className="font-semibold text-leaf hover:underline">Sign in</Link></p>
            <button type="button" onClick={() => setGate(false)} className="mt-4 w-full text-center text-sm text-black/50 hover:underline">Not now</button>
          </div>
        </div>
      )}
    </div>
  );
}
