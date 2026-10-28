// Акции. Одна и та же логика работает и в браузере (корзина), и на сервере (приём заказа), поэтому без server-only.
export type PromoKind = 'gift_from_amount' | 'cheapest_free' | 'combo_gift' | 'percent' | 'fixed' | 'bundle_price';
export type PromoFilter = { categoryIds?: string[]; productIds?: string[]; labelContains?: string };
export type GiftOption = { productId: string; label: string; name?: string };
export type Promotion = {
  id: string; title: string; description: string; image?: string; kind: PromoKind; config: Record<string, any>;
  timeFrom: string; timeTo: string; weekdays: number[]; startsAt: string; endsAt: string; receive: 'any' | 'delivery' | 'pickup';
};
export type EngineLine = { productId: string; categoryId?: string | null; label: string; price: number; qty: number; isPromo?: boolean };
export type GiftSlot = { promoId: string; title: string; count: number; options: GiftOption[] };
export type Offer = { promoId: string; title: string; discount: number; slots: GiftSlot[] };
export type EngineResult = {
  discount: number; discounts: { promoId: string; title: string; amount: number }[]; slots: GiftSlot[]; hints: { promoId: string; text: string }[];
  offers: Offer[]; selected: Offer | null; blocked: boolean; // blocked: в корзине акционная позиция, другие акции не действуют
};
export type NowInfo = { minutes: number; weekday: number; date: string };

// Акции не суммируются: за раз действует только одна
export const ONE_PROMO_MSG = 'Вы можете использовать только одну акцию за раз. Пожалуйста, выберите самое выгодное предложение';

const WD: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// Текущее время в часовом поясе заведения (по умолчанию Самара)
export function nowInTz(tz = 'Europe/Samara', d = new Date()): NowInfo {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(d);
    const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return { minutes: (Number(g('hour')) % 24) * 60 + Number(g('minute')), weekday: WD[g('weekday')] ?? 1, date: `${g('year')}-${g('month')}-${g('day')}` };
  } catch {
    const x = new Date(d.getTime() + 4 * 3600_000); // запасной вариант: UTC+4
    return { minutes: x.getUTCHours() * 60 + x.getUTCMinutes(), weekday: x.getUTCDay() === 0 ? 7 : x.getUTCDay(), date: x.toISOString().slice(0, 10) };
  }
}

export const hhmm = (s: string) => { const m = /^(\d{1,2}):(\d{2})$/.exec((s ?? '').trim()); return m ? Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2])) : null; };

export function isActiveNow(p: Promotion, now: NowInfo, receive: 'delivery' | 'pickup'): boolean {
  if (p.receive !== 'any' && p.receive !== receive) return false;
  if (p.weekdays.length && !p.weekdays.includes(now.weekday)) return false;
  if (p.startsAt && now.date < p.startsAt) return false;
  if (p.endsAt && now.date > p.endsAt) return false;
  const a = hhmm(p.timeFrom); const b = hhmm(p.timeTo);
  if (a != null && b != null) return a <= b ? now.minutes >= a && now.minutes < b : now.minutes >= a || now.minutes < b; // b < a: акция через полночь
  if (a != null) return now.minutes >= a;
  if (b != null) return now.minutes < b;
  return true;
}

const DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
// Подпись «когда действует» для карточки акции
export function scheduleText(p: Promotion): string {
  const parts: string[] = [];
  if (p.timeFrom && p.timeTo) parts.push(`с ${p.timeFrom} до ${p.timeTo}`); else if (p.timeFrom) parts.push(`с ${p.timeFrom}`); else if (p.timeTo) parts.push(`до ${p.timeTo}`);
  if (p.weekdays.length && p.weekdays.length < 7) parts.push([...p.weekdays].sort().map((d) => DAYS[d - 1]).join(', '));
  if (p.endsAt) parts.push(`до ${p.endsAt.split('-').reverse().join('.')}`);
  if (p.receive === 'delivery') parts.push('только доставка'); else if (p.receive === 'pickup') parts.push('только самовывоз');
  return parts.join(' · ');
}

// Если отмечены конкретные товары, акция действует только на них; иначе на выбранные категории; иначе на всё
const matches = (l: EngineLine, f?: PromoFilter): boolean => {
  if (!f) return true;
  const cats = f.categoryIds ?? []; const prods = f.productIds ?? [];
  if (prods.length) { if (!prods.includes(l.productId)) return false; }
  else if (cats.length && !(!!l.categoryId && cats.includes(l.categoryId))) return false;
  const t = (f.labelContains ?? '').trim().toLowerCase();
  return !t || l.label.toLowerCase().includes(t);
};
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// Все акции, которые сейчас подходят корзине. Выбрать из них можно только одну (selectOffer).
export function evaluateOffers(o: { lines: EngineLine[]; promos: Promotion[]; now: NowInfo; receive: 'delivery' | 'pickup' }): { offers: Offer[]; hints: { promoId: string; text: string }[]; blocked: boolean } {
  if (o.lines.some((l) => l.isPromo)) return { offers: [], hints: [], blocked: true }; // акционная позиция: другие скидки не действуют
  const offers: Offer[] = []; const hints: { promoId: string; text: string }[] = [];
  for (const p of o.promos) {
    if (!isActiveNow(p, o.now, o.receive)) continue;
    const c = p.config ?? {}; const f = c.filter as PromoFilter | undefined;
    const mine = o.lines.filter((l) => matches(l, f));
    const base = sum(mine.map((l) => l.price * l.qty));
    const asc = mine.flatMap((l) => Array<number>(Math.max(0, l.qty)).fill(l.price)).sort((a, b) => a - b);
    const gifts: GiftOption[] = Array.isArray(c.gifts) ? c.gifts : [];
    const offer = (discount: number, slots: GiftSlot[] = []) => offers.push({ promoId: p.id, title: p.title, discount, slots });
    if (p.kind === 'gift_from_amount') {
      const min = Number(c.minSubtotal) || 0;
      if (gifts.length && base >= min && base > 0) offer(0, [{ promoId: p.id, title: p.title, count: 1, options: gifts }]);
      else if (gifts.length && base > 0) hints.push({ promoId: p.id, text: `Добавьте ещё на ${Math.ceil(min - base)} ₽ и получите подарок: ${p.title}` });
    } else if (p.kind === 'cheapest_free') {
      const n = Math.max(1, Number(c.buy) || 2); const m = Math.max(1, Number(c.free) || 1);
      const d = sum(asc.slice(0, Math.floor(asc.length / (n + m)) * m));
      if (d > 0) offer(d);
      if (asc.length % (n + m) === n) hints.push({ promoId: p.id, text: `Добавьте ещё ${m} шт. — самый дешёвый в подарок: ${p.title}` });
    } else if (p.kind === 'combo_gift') {
      const q = Math.max(1, Number(c.qty) || 2); const min = Number(c.minSubtotal) || 0;
      const count = base >= min ? (c.repeat ? Math.floor(asc.length / q) : asc.length >= q ? 1 : 0) : 0;
      if (gifts.length && count > 0) offer(0, [{ promoId: p.id, title: p.title, count, options: gifts }]);
      else if (gifts.length && asc.length > 0 && asc.length < q) hints.push({ promoId: p.id, text: `Добавьте ещё ${q - asc.length} шт. и получите подарок: ${p.title}` });
      else if (gifts.length && asc.length >= q && base < min) hints.push({ promoId: p.id, text: `Добавьте ещё на ${Math.ceil(min - base)} ₽ и получите подарок: ${p.title}` });
    } else if (p.kind === 'bundle_price') {
      // N товаров из списка за фиксированную цену: скидка = сумма товаров набора минус цена набора
      const n = Math.max(2, Number(c.qty) || 3); const price = Number(c.price) || 0; const desc = [...asc].reverse();
      let d = 0;
      for (let g = 0; g + n <= desc.length; g += n) d += Math.max(0, sum(desc.slice(g, g + n)) - price);
      if (d > 0) offer(d);
      else if (asc.length > 0 && asc.length % n !== 0) hints.push({ promoId: p.id, text: `Добавьте ещё ${n - (asc.length % n)} шт. — ${p.title}` });
    } else if (p.kind === 'percent') {
      if (base > 0 && base >= (Number(c.minSubtotal) || 0)) { const d = Math.floor((base * (Number(c.value) || 0)) / 100); if (d > 0) offer(d); }
    } else if (p.kind === 'fixed') {
      if (base > 0 && base >= (Number(c.minSubtotal) || 0)) { const d = Math.min(base, Number(c.value) || 0); if (d > 0) offer(d); }
    }
  }
  return { offers, hints, blocked: false };
}

// Какая акция действует: единственная подходящая применяется сама, из нескольких нужно выбрать одну
export function selectOffer(offers: Offer[], chosenId?: string | null): Offer | null {
  if (offers.length === 1) return offers[0];
  return offers.find((x) => x.promoId === chosenId) ?? null;
}

export function applyPromotions(o: { lines: EngineLine[]; promos: Promotion[]; now: NowInfo; receive: 'delivery' | 'pickup'; chosenId?: string | null; disabled?: boolean }): EngineResult {
  const ev = o.disabled ? { offers: [] as Offer[], hints: [] as { promoId: string; text: string }[], blocked: false } : evaluateOffers(o);
  const selected = selectOffer(ev.offers, o.chosenId);
  return {
    discount: selected?.discount ?? 0,
    discounts: selected && selected.discount > 0 ? [{ promoId: selected.promoId, title: selected.title, amount: selected.discount }] : [],
    slots: selected?.slots ?? [], hints: ev.hints, offers: ev.offers, selected, blocked: ev.blocked,
  };
}

// Проверка выбранных подарков (на сервере): подарок должен быть из списка акции, и не больше положенного
export function checkGifts(slots: GiftSlot[], chosen: { promoId: string; productId: string; label: string }[]): { ok: true; gifts: { promoId: string; title: string; productId: string; label: string }[] } | { ok: false } {
  const used: Record<string, number> = {}; const out: { promoId: string; title: string; productId: string; label: string }[] = [];
  for (const g of chosen) {
    const s = slots.find((x) => x.promoId === g.promoId);
    if (!s || !s.options.some((o) => o.productId === g.productId && o.label === g.label)) return { ok: false };
    used[g.promoId] = (used[g.promoId] ?? 0) + 1;
    if (used[g.promoId] > s.count) return { ok: false };
    out.push({ ...g, title: s.title });
  }
  return { ok: true, gifts: out };
}
