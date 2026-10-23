import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const KEY = 'db_cart';
const keyOf = (i) => `${i.type}-${i.id}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(items)); }, [items]);

  const api = useMemo(() => ({
    items,
    count: items.reduce((s, i) => s + i.qty, 0),
    subtotal: items.reduce((s, i) => s + Number(i.price) * i.qty, 0),
    add: (item, qty = 1) =>
      setItems((cur) => {
        const found = cur.find((c) => keyOf(c) === keyOf(item));
        if (found) return cur.map((c) => (keyOf(c) === keyOf(item) ? { ...c, qty: Math.min(99, c.qty + qty) } : c));
        return [...cur, { type: item.type, id: item.id, name: item.name, price: Number(item.price), image_url: item.image_url, unit: item.unit, qty }];
      }),
    setQty: (item, qty) =>
      setItems((cur) => (qty <= 0 ? cur.filter((c) => keyOf(c) !== keyOf(item)) : cur.map((c) => (keyOf(c) === keyOf(item) ? { ...c, qty: Math.min(99, qty) } : c)))),
    remove: (item) => setItems((cur) => cur.filter((c) => keyOf(c) !== keyOf(item))),
    clear: () => setItems([]),
  }), [items]);

  return <CartCtx.Provider value={api}>{children}</CartCtx.Provider>;
}
