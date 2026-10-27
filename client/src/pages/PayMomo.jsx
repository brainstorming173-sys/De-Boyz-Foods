import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Smartphone, CheckCircle2, XCircle, Loader2, Copy, Check } from 'lucide-react';
import { api, money } from '../api.js';
import { NETWORKS, guessNetwork, normalizePhone } from '../momo.js';
import NetworkPicker from '../components/NetworkPicker.jsx';
import Loading from '../components/Loading.jsx';

const POLL_MS = 4000;

// Defined outside PayMomo so inputs keep focus while typing.
const Card = ({ children }) => <div className="mx-auto max-w-md px-4 py-10 text-center sm:py-16">{children}</div>;

export default function PayMomo() {
  const { orderNo } = useParams();
  const { state } = useLocation();
  const nav = useNavigate();
  const started = useRef(false);

  const [order, setOrder] = useState(null);
  const [stage, setStage] = useState('loading'); // loading | form | starting | send | review | paid | failed
  const [phone, setPhone] = useState(state?.phone || '');
  const [picked, setPicked] = useState(state?.network || null); // customer's choice; falls back to a guess from the number
  const [networks, setNetworks] = useState({ mtn: true, telecel: true, airteltigo: true }); // id -> can pay online
  const [payTo, setPayTo] = useState([]); // numbers to send money to (Telecel / AirtelTigo)
  const [txnId, setTxnId] = useState('');
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  const network = picked || guessNetwork(phone);
  const label = network ? NETWORKS[network].label : 'mobile money';

  async function start(p = phone, n = network) {
    setError('');
    if (!normalizePhone(p)) return setError('Enter a valid mobile money number, e.g. 024 123 4567');
    if (!n) return setError('Choose your mobile money network');
    setStage('starting');
    try {
      const res = await api.chargeMomo(orderNo, p, n);
      setPayTo(res.numbers || []); setTxnId(''); setStage('send');
    } catch (e) {
      setError(e.message);
      setStage('form');
    }
  }

  async function sendDetails(e) {
    e.preventDefault();
    setError('');
    if (!normalizePhone(phone)) return setError('Enter the number you sent the money from');
    if (!/^[A-Za-z0-9]{6,20}$/.test(txnId.trim())) return setError('Enter the transaction ID from your payment SMS');
    setStage('waiting-submit');
    try {
      await api.submitManualPayment(orderNo, txnId.trim(), phone);
      setStage('review');
    } catch (err) {
      setError(err.message);
      setStage('send');
    }
  }

  async function copy(n) {
    try { await navigator.clipboard.writeText(n); setCopied(n); setTimeout(() => setCopied(''), 1500); } catch { /* clipboard blocked: number is still visible */ }
  }

  useEffect(() => {
    api.paymentNetworks().then((list) => setNetworks(Object.fromEntries(list.map((n) => [n.id, n.available])))).catch(() => {});
  }, []);

  useEffect(() => {
    api.trackOrder(orderNo).then((o) => {
      setOrder(o);
      if (o.payment_status === 'paid') return setStage('paid');
      if (o.payment_method !== 'momo_now') return nav(`/order/${orderNo}`, { replace: true });
      const n = state?.network || o.payment_network || guessNetwork(state?.phone);
      if (!picked && n) setPicked(n);
      // The server refuses a network that can't take online payment and says so; start() shows that message.
      if (o.payment_txn_id) return setStage('review'); // already submitted, awaiting confirmation
      if (state?.phone && n && !started.current) { started.current = true; start(state.phone, n); }
      else setStage('form');
    }).catch((e) => { setError(e.message); setStage('failed'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNo]);

  // While we confirm the customer's transfer, ask the server every few seconds.
  useEffect(() => {
    if (stage !== 'review') return;
    const id = setInterval(async () => {
      try {
        const { payment_status } = await api.paymentStatus(orderNo);
        if (payment_status === 'paid') setStage('paid');
        else if (payment_status === 'failed') { setError("We couldn't confirm that payment. Check the details and try again, or contact us."); setStage('failed'); }
      } catch { /* keep polling through network blips */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [stage, orderNo]);

  useEffect(() => {
    if (stage !== 'paid') return;
    const t = setTimeout(() => nav(`/order/${orderNo}`, { replace: true }), 2000);
    return () => clearTimeout(t);
  }, [stage, orderNo, nav]);

  const amount = order ? money(order.total) : '';

  if (stage === 'loading') return <Card><Loading message="Loading your payment..." className="py-4" /></Card>;

  if (stage === 'paid') return (
    <Card>
      <CheckCircle2 className="mx-auto h-14 w-14 text-leaf" />
      <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">Payment received</h1>
      <p className="mt-2 text-black/65">{amount} paid for order {orderNo}. Taking you to your order...</p>
      <Link to={`/order/${orderNo}`} className="btn-green mt-6">View order</Link>
    </Card>
  );

  if (stage === 'send' || stage === 'waiting-submit') return (
    <Card>
      <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-soft"><Smartphone className="h-9 w-9 text-leaf" /></span>
      <h1 className="mt-6 text-2xl font-extrabold sm:text-3xl">Send {amount}</h1>
      <p className="mt-2 text-base text-black/70">Send exactly <strong>{amount}</strong> from your {label} to either number below. Use <strong>{orderNo}</strong> as the reference if your network asks for one.</p>
      <ul className="mt-5 space-y-2">
        {payTo.map((n) => (
          <li key={n} className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3">
            <span className="font-display text-lg font-bold tracking-wide">{n}</span>
            <button type="button" onClick={() => copy(n)} className="inline-flex items-center gap-1 text-sm font-semibold text-leaf">
              {copied === n ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={sendDetails} className="mt-6 space-y-4 text-left">
        <p className="text-sm text-black/65">Once the money is sent, enter the details from your confirmation SMS so we can match your payment.</p>
        <div><label className="label" htmlFor="tx">Transaction ID</label><input id="tx" className="field" required autoComplete="off" value={txnId} onChange={(e) => setTxnId(e.target.value)} /></div>
        <div><label className="label" htmlFor="sp">Number you sent from</label><input id="sp" className="field" inputMode="tel" required placeholder="020 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-chili">{error}</p>}
        <button className="btn-green w-full py-3.5" disabled={stage === 'waiting-submit'}>{stage === 'waiting-submit' ? 'Sending...' : "I've sent the money"}</button>
      </form>
    </Card>
  );

  if (stage === 'review') return (
    <Card>
      <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-leaf-soft"><Loader2 className="h-9 w-9 animate-spin text-leaf" /></span>
      <h1 className="mt-6 text-2xl font-extrabold sm:text-3xl">We're confirming your payment</h1>
      <p className="mt-2 text-base text-black/70">We've got your details for <strong>{amount}</strong>. This page updates as soon as we confirm the money arrived. You can also close it and check your order later.</p>
      <Link to={`/order/${orderNo}`} className="btn-ghost mt-6">View order</Link>
    </Card>
  );

  if (stage === 'starting') return <Card><Loader2 className="mx-auto h-8 w-8 animate-spin text-leaf" /></Card>;

  if (stage === 'failed') return (
    <Card>
      <XCircle className="mx-auto h-14 w-14 text-chili" />
      <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">Payment didn't go through</h1>
      <p className="mt-2 text-black/65">{error || 'Your order is saved, so you can try again.'}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button className="btn-green" onClick={() => { setError(''); setStage('form'); }}>Try again</button>
        <Link to={`/order/${orderNo}`} className="btn-ghost">View order</Link>
      </div>
    </Card>
  );

  // stage === 'form'
  return (
    <Card>
      <h1 className="text-2xl font-extrabold sm:text-3xl">Pay {amount}</h1>
      <p className="mt-2 text-black/65">Order {orderNo}. You'll send the money from your {label} number.</p>
      <form onSubmit={(e) => { e.preventDefault(); start(); }} className="mt-6 space-y-4 text-left">
        <div>
          <p className="label">Network</p>
          <NetworkPicker value={network} onChange={setPicked} available={networks} />
        </div>
        <div><label className="label" htmlFor="mp">{label} number you'll send from</label><input id="mp" className="field" inputMode="tel" required placeholder="024 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-chili">{error}</p>}
        <button className="btn-green w-full py-3.5"><Smartphone className="h-4 w-4" /> Show where to send the money</button>
      </form>
    </Card>
  );
}
