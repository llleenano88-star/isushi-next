import { hhmm, type NowInfo } from './promotions';

export type OpenState = { open: boolean; message: string };

// Часы приёма заказов: до открытия и за N минут до закрытия кнопка «Оформить заказ» не работает.
// Если часы работы в админке не заданы, заказы принимаются всегда.
export function openState(now: NowInfo, workFrom: string, workTo: string, cutoff: number): OpenState {
  const from = hhmm(workFrom); const to = hhmm(workTo);
  if (from == null && to == null) return { open: true, message: '' };
  const closed = to != null ? to - Math.max(0, cutoff) : null; // с этой минуты заказы уже не принимаем
  const tomorrow = from != null ? `Ждём вас завтра с ${workFrom}` : 'Ждём вас завтра';
  const t = now.minutes;
  if (from != null && to != null && to <= from) { // работаем через полночь (например, 18:00–02:00)
    const c = ((closed as number) + 1440) % 1440;
    const openNow = t >= from || t < c;
    if (openNow) return { open: true, message: '' };
    return t >= c && t < to ? { open: false, message: `Приём заказов на сегодня завершён. ${tomorrow}` } : { open: false, message: `Ресторан ещё закрыт. Приём заказов начнётся в ${workFrom}` };
  }
  if (from != null && t < from) return { open: false, message: `Ресторан ещё закрыт. Приём заказов начнётся в ${workFrom}` };
  if (closed != null && t >= closed) return { open: false, message: `Приём заказов на сегодня завершён. ${tomorrow}` };
  return { open: true, message: '' };
}
