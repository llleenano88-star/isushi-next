// Единая формула стоимости: её используют и корзина в браузере, и сервер при приёме заказа
export type PromoRule = { type: 'percent' | 'fixed' | 'free_delivery'; value: number; minOrder: number };
export type Totals = { delivery: number; discount: number; total: number; deliveryFree: boolean };
const r2 = (n: number) => Math.round(n * 100) / 100;

export function computeTotals(o: { subtotal: number; receive: 'delivery' | 'pickup'; deliveryPrice: number; freeFrom: number; promo?: PromoRule | null }): Totals {
  const paid = o.receive === 'delivery' && o.deliveryPrice > 0;
  let delivery = paid && !(o.freeFrom > 0 && o.subtotal >= o.freeFrom) ? o.deliveryPrice : 0;
  let discount = 0;
  if (o.promo && o.subtotal >= o.promo.minOrder) {
    if (o.promo.type === 'percent') discount = Math.min(o.subtotal, Math.floor((o.subtotal * o.promo.value) / 100));
    else if (o.promo.type === 'fixed') discount = Math.min(o.subtotal, o.promo.value);
    else delivery = 0;
  }
  return { delivery: r2(delivery), discount: r2(discount), total: r2(o.subtotal - discount + delivery), deliveryFree: paid && delivery === 0 };
}
