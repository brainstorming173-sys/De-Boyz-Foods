import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api as http } from '../api.js';
import { usePromo } from './PromoContext.jsx';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const KEY = 'db_cart';
const keyOf = (i) => `${i.type}-${i.id}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  // A cart saved before the promo was switched on or off still holds old prices: re-price it from the server.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const refreshPrices = useCallback(async () => {
    const lines = itemsRef.current;
    if (!lines.length) return;
    try {
      const fresh = await http.cartPrices(lines.map(({ type, id }) => ({ type, id })));
      setItems((cur) => cur.map((c) => {
        const f = fresh.find((x) => x.type === c.type && x.id === c.id);
        return f ? { ...c, price: f.price, original_price: f.on_promo ? f.original : null } : c;
      }));
    } catch { /* keep what we have; the server prices the order anyway */ }
  }, []);
  const { promo } = usePromo();
  useEffect(() => { refreshPrices(); }, [promo.enabled, promo.name, refreshPrices]);

  const api = useMemo(() => ({
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + Number(i.price) * i.qty, 0),
    add: (item, qty = 1) =>
      setItems((cur) => {
        const found = cur.find((c) => keyOf(c) === keyOf(item));
        if (found) return cur.map((c) => (keyOf(c) === keyOf(item) ? { ...c, qty: Math.min(99, c.qty + qty) } : c));
        return [...cur, { type: item.type, id: item.id, name: item.name, price: Number(item.final_price ?? item.price), original_price: item.on_promo ? Number(item.price) : null, image_url: item.image_url, unit: item.unit, qty }];
      }),
    setQty: (item, qty) =>
      setItems((cur) => (qty <= 0 ? cur.filter((c) => keyOf(c) !== keyOf(item)) : cur.map((c) => (keyOf(c) === keyOf(item) ? { ...c, qty: Math.min(99, qty) } : c)))),
    remove: (item) => setItems((cur) => cur.filter((c) => keyOf(c) !== keyOf(item))),
    clear: () => setItems([]),
    refreshPrices,
  }), [items, refreshPrices]);

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}
