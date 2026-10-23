import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api, money } from '../api.js';

const LABEL = { new: 'Received', confirmed: 'Confirmed', preparing: 'Preparing', out_for_delivery: 'On the way', completed: 'Completed', cancelled: 'Cancelled' };

export default function OrderDone() {
  const { orderNo } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.trackOrder(orderNo).then(setOrder).catch((e) => setError(e.message)); }, [orderNo]);

  if (error) return <p className="p-16 text-center text-chili">{error}</p>;
  if (!order) return <p className="p-16 text-center text-black/50">Loading your order...</p>;

  const unpaidOnline = order.payment_method === 'momo_now' && order.payment_status !== 'paid';

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-14">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-leaf" />
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">Order {order.order_no} placed</h1>
        <p className="mt-2 text-black/60">Status: <strong>{LABEL[order.status]}</strong>. Save your order number to check back.</p>
      </div>

      {unpaidOnline && (
        <div className="mt-6 rounded-xl bg-chili-soft px-4 py-3 text-sm text-chili">
          {order.payment_txn_id && order.payment_network !== 'mtn' && order.payment_status === 'pending' ? (
            <p>We're confirming your payment. This usually doesn't take long.</p>
          ) : (
            <>
              <p>We haven't received your mobile money payment yet.</p>
              <Link to={`/pay/${order.order_no}`} className="mt-1 inline-block font-semibold underline">Pay now</Link>
            </>
          )}
        </div>
      )}

      <ul className="mt-8 divide-y divide-black/5 rounded-2xl border border-black/5 bg-white">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 p-4 text-sm">
            <span className="min-w-0 break-words">{i.qty} &times; {i.name}</span><span className="shrink-0 font-semibold">{money(i.unit_price * i.qty)}</span>
          </li>
        ))}
        <li className="flex justify-between p-4 text-sm text-black/60"><span>Delivery</span><span>{Number(order.delivery_fee) === 0 ? 'Free' : money(order.delivery_fee)}</span></li>
        <li className="flex justify-between p-4 font-display text-lg font-bold"><span>Total</span><span>{money(order.total)}</span></li>
      </ul>

      <div className="mt-8 text-center"><Link to="/" className="btn-green">Back to home</Link></div>
    </div>
  );
}
