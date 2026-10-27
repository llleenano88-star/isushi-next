import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GiftOption } from '@/lib/promotions';

export type CartItem = { key: string; productId: string; name: string; label: string; price: number; qty: number; image?: string | null; extra?: boolean; choices?: string[]; categoryId?: string | null };
type State = {
  items: CartItem[]; open: boolean; askExtras: boolean;
  gifts: Record<string, (GiftOption | null)[]>; zoneId: string | null;
  setGift: (promoId: string, idx: number, g: GiftOption | null) => void;
  setZone: (id: string | null) => void;
  add: (i: Omit<CartItem, 'key' | 'qty'>) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  setOpen: (v: boolean) => void;
  setAsk: (v: boolean) => void;
};
export const useCart = create<State>()(persist((set) => ({
  items: [], open: false, askExtras: false, gifts: {}, zoneId: null,
  setGift: (promoId, idx, g) => set((s) => { const a = [...(s.gifts[promoId] ?? [])]; a[idx] = g; return { gifts: { ...s.gifts, [promoId]: a } }; }),
  setZone: (zoneId) => set({ zoneId }),
  add: (i) => set((s) => {
    const key = i.extra ? `x:${i.productId}` : `${i.productId}:${i.label}${i.choices?.length ? ':' + i.choices.join('|') : ''}`;
    const ex = s.items.find((x) => x.key === key);
    const first = !i.extra && !s.items.some((x) => !x.extra); // первое блюдо в пустой корзине: предложим допы
    return { items: ex ? s.items.map((x) => x.key === key ? { ...x, qty: x.qty + 1 } : x) : [...s.items, { ...i, key, qty: 1 }], ...(first ? { askExtras: true } : {}) };
  }),
  setQty: (key, qty) => set((s) => ({ items: qty <= 0 ? s.items.filter((x) => x.key !== key) : s.items.map((x) => x.key === key ? { ...x, qty } : x) })),
  remove: (key) => set((s) => ({ items: s.items.filter((x) => x.key !== key) })),
  setOpen: (open) => set({ open }),
  setAsk: (askExtras) => set({ askExtras }),
}), { name: 'isushi-cart', partialize: (s) => ({ items: s.items, gifts: s.gifts, zoneId: s.zoneId }) }));

export const selectCount = (s: State) => s.items.reduce((a, i) => a + i.qty, 0);
export const selectTotal = (s: State) => s.items.reduce((a, i) => a + i.qty * i.price, 0);
