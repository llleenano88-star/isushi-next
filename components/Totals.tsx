import type { Totals as T } from '@/lib/pricing';

export default function Totals({ subtotal, totals, receive, deliveryPrice, freeFrom, promoCode }: {
  subtotal: number; totals: T; receive: 'delivery' | 'pickup'; deliveryPrice: number; freeFrom: number; promoCode?: string;
}) {
  const showDelivery = receive === 'delivery' && deliveryPrice > 0;
  const toFree = showDelivery && freeFrom > 0 && totals.delivery > 0 && subtotal < freeFrom ? freeFrom - subtotal : 0;
  return (
    <div className="mt-4 space-y-1 text-right text-sm">
      {(showDelivery || totals.discount > 0) && <p className="text-mute">Сумма: {subtotal} руб.</p>}
      {totals.discount > 0 && <p className="text-mute">Скидка{promoCode ? ` (${promoCode})` : ''}: −{totals.discount} руб.</p>}
      {showDelivery && <p className="text-mute">Доставка: {totals.delivery > 0 ? `${totals.delivery} ₽` : 'Бесплатно'}</p>}
      {toFree > 0 && <p className="text-xs text-accent">До бесплатной доставки осталось {toFree} ₽</p>}
      <p className="text-xl font-extrabold">Итого: {totals.total} руб.</p>
    </div>
  );
}
