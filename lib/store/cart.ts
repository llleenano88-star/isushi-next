import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartItem = { key: string; productId: string; name: string; label: string; price: number; qty: number };
type State = {
  items: CartItem[]; open: boolean;
  add: (i: Omit<CartItem, 'key' | 'qty'>) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  setOpen: (v: boolean) => void;
};
export const useCart = create<State>()(persist((set) => ({
  items: [], open: false,
  add: (i) => set((s) => {
    const key = `${i.productId}:${i.label}`;
    const ex = s.items.find((x) => x.key === key);
    return { items: ex ? s.items.map((x) => x.key === key ? { ...x, qty: x.qty + 1 } : x) : [...s.items, { ...i, key, qty: 1 }] };
  }),
  setQty: (key, qty) => set((s) => ({ items: qty <= 0 ? s.items.filter((x) => x.key !== key) : s.items.map((x) => x.key === key ? { ...x, qty } : x) })),
  remove: (key) => set((s) => ({ items: s.items.filter((x) => x.key !== key) })),
  setOpen: (open) => set({ open }),
}), { name: 'isushi-cart', partialize: (s) => ({ items: s.items }) }));

export const selectCount = (s: State) => s.items.reduce((a, i) => a + i.qty, 0);
export const selectTotal = (s: State) => s.items.reduce((a, i) => a + i.qty * i.price, 0);
