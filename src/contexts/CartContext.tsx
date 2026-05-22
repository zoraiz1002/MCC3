import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface CartItem {
  product_id: string;
  variant_id?: string;
  qty: number;
  price: number;
  name: string;
  image?: string;
}

interface CartCtx {
  items: CartItem[];
  add: (i: CartItem) => void;
  remove: (product_id: string, variant_id?: string) => void;
  setQty: (product_id: string, qty: number, variant_id?: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "mcc_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
  }, [items]);

  const value = useMemo<CartCtx>(() => ({
    items,
    add: (i) => setItems((curr) => {
      const idx = curr.findIndex((c) => c.product_id === i.product_id && c.variant_id === i.variant_id);
      if (idx >= 0) { const next = [...curr]; next[idx] = { ...next[idx], qty: next[idx].qty + i.qty }; return next; }
      return [...curr, i];
    }),
    remove: (pid, vid) => setItems((c) => c.filter((x) => !(x.product_id === pid && x.variant_id === vid))),
    setQty: (pid, qty, vid) => setItems((c) => c.map((x) => x.product_id === pid && x.variant_id === vid ? { ...x, qty: Math.max(1, qty) } : x)),
    clear: () => setItems([]),
    total: items.reduce((s, i) => s + i.price * i.qty, 0),
    count: items.reduce((s, i) => s + i.qty, 0),
  }), [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart outside provider");
  return v;
};
