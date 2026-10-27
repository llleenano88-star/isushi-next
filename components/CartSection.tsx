'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Checkout from './Checkout';
import Totals from './Totals';
import ZonePicker from './ZonePicker';
import { useCart } from '@/lib/store/cart';
import { ChoiceIcon } from './PepperIcon';
import { computeTotals, type PromoRule } from '@/lib/pricing';
import { applyPromotions, nowInTz, type EngineLine, type GiftOption } from '@/lib/promotions';
import type { PublicSettings } from '@/lib/types';

type Applied = PromoRule & { code: string };

export default function CartSection({ settings }: { settings: PublicSettings }) {
  const items = useCart((s) => s.items); const setQty = useCart((s) => s.setQty); const remove = useCart((s) => s.remove);
  const gifts = useCart((s) => s.gifts); const setGift = useCart((s) => s.setGift); const zoneId = useCart((s) => s.zoneId); const setZone = useCart((s) => s.setZone);
  const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);
  const [form, setForm] = useState(false); const [done, setDone] = useState('');
  const [receive, setReceive] = useState<'delivery' | 'pickup'>('delivery');
  const [promoInput, setPromoInput] = useState(''); const [promo, setPromo] = useState<Applied | null>(null); const [promoMsg, setPromoMsg] = useState(''); const [promoBusy, setPromoBusy] = useState(false);

  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  const activePromo = promo && subtotal >= promo.minOrder ? promo : null; // промокод с минимальной суммой действует, только пока сумма достаточна

  // Акции: скидки, подарки и подсказки считаются по корзине и текущему времени заведения
  const lines: EngineLine[] = useMemo(() => items.filter((i) => !i.extra).map((i) => ({ productId: i.productId, categoryId: i.categoryId ?? null, label: i.label, price: i.price, qty: i.qty })), [items]);
  const eng = mounted ? applyPromotions({ lines, promos: settings.promos, now: nowInTz(settings.tz), receive }) : { discount: 0, discounts: [], slots: [], hints: [] };
  const slotsKey = JSON.stringify(eng.slots.map((s) => [s.promoId, s.count, s.options.length]));
  useEffect(() => { // если в акции один вариант подарка, выбираем его сразу
    eng.slots.forEach((s) => { if (s.options.length === 1) for (let i = 0; i < s.count; i++) if (!gifts[s.promoId]?.[i]) setGift(s.promoId, i, s.options[0]); });
  }, [slotsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosenGifts = eng.slots.flatMap((s) => Array.from({ length: s.count }, (_, i) => gifts[s.promoId]?.[i]).map((g, i) => (g && s.options.some((o) => o.productId === g.productId && o.label === g.label) ? { promoId: s.promoId, idx: i, ...g } : null)).filter((g): g is NonNullable<typeof g> => !!g));

  // Зона доставки задаёт свою цену, минимальный заказ и порог бесплатной доставки (если не заданы, берутся общие)
  const needZone = receive === 'delivery' && settings.zones.length > 0;
  const zone = needZone ? settings.zones.find((z) => z.id === zoneId) ?? null : null;
  const deliveryPrice = zone?.price ?? settings.deliveryPrice; const freeFrom = zone?.freeFrom ?? settings.freeDeliveryFrom; const minOrder = zone?.minOrder ?? settings.minOrder;
  const totals = computeTotals({ subtotal, receive, deliveryPrice, freeFrom, promo: activePromo, extraDiscount: eng.discount });
  const short = receive === 'delivery' ? Math.max(0, minOrder - subtotal) : 0; // минимальная сумма только для доставки, самовывоз от любой суммы
  const zoneOk = !needZone || !!zone; const minOk = short === 0; const canOrder = minOk && zoneOk;
  const tel = settings.phone.replace(/[^\d+]/g, '');
  const finish = () => { useCart.setState({ items: [], gifts: {} }); setDone(''); setForm(false); setPromo(null); setPromoInput(''); setPromoMsg(''); };

  const applyPromo = async () => {
    setPromoBusy(true); setPromoMsg('');
    const r = await fetch('/api/promo/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: promoInput, subtotal }) });
    const j = await r.json().catch(() => ({})); setPromoBusy(false);
    if (!r.ok) { setPromo(null); setPromoMsg(j.error ?? 'Промокод не найден'); return; }
    setPromo({ ...j.promo }); setPromoMsg(j.message ?? 'Промокод применён');
  };

  const phoneBlock = settings.phone ? (
    <p className="mt-6 text-center text-sm text-mute">Есть вопросы по заказу? Звоните: <a href={`tel:${tel}`} className="font-bold text-accent">{settings.phone}</a> — мы поможем</p>
  ) : null;

  if (!mounted) return <section id="cart" className="py-10"><div className="skeleton h-32" /></section>;
  if (done) return (
    <section id="cart" className="scroll-mt-24 py-10">
      <div className="mx-auto max-w-md rounded-[28px] bg-card p-8 text-center shadow-soft">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-leaf text-4xl text-white">✓</div>
        <p className="text-2xl font-extrabold">Заказ № {done} принят</p>
        <p className="mt-2 text-sm text-mute">Статус заказа смотрите в разделе «Кабинет». Для этого войдите по email.</p>
        <Link href="/account" onClick={finish} className="mt-5 flex h-14 items-center justify-center rounded-xl bg-brand font-bold text-white">Следить за статусом</Link>
        <button onClick={finish} className="mt-2 h-12 w-full font-bold text-mute">Вернуться в меню</button>
      </div>
      {phoneBlock}
    </section>
  );

  const step = 'grid h-9 w-9 place-items-center rounded-full bg-blush text-lg font-black text-accent sm:h-11 sm:w-11';
  const tab = (v: 'delivery' | 'pickup', label: string) => (
    <button type="button" onClick={() => setReceive(v)} className={`h-12 flex-1 rounded-full text-base font-bold ${receive === v ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>{label}</button>
  );
  const giftName = (g: GiftOption) => `${g.name ?? 'Подарок'}${g.label ? ` · ${g.label}` : ''}`;
  return (
    <section id="cart" className="scroll-mt-24 py-10">
      <h2 className="text-3xl font-extrabold text-accent">Корзина</h2>
      {!items.length ? <p className="py-8 text-center text-mute">В корзине пока пусто. Выберите блюда в меню.</p> : (
        <>
          {settings.includedNote && <p className="mt-4 rounded-2xl bg-blush px-4 py-3 text-sm font-semibold">{settings.includedNote}</p>}
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-card p-3 shadow-soft">
                <div className="min-w-[5.5rem] flex-1">
                  <div title={it.name} className="line-clamp-2 break-words text-sm font-extrabold leading-tight">{it.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-mute">{it.extra ? 'Дополнительно' : it.label}{it.choices?.map((c) => <span key={c} className="flex items-center gap-0.5">· <ChoiceIcon text={c} size={14} />{c}</span>)}</div>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <div className="flex items-center">
                    <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Меньше" className={step}>−</button>
                    <b className="w-5 text-center text-sm sm:w-6">{it.qty}</b>
                    <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Больше" className={step}>+</button>
                  </div>
                  <b className="min-w-[3.5rem] whitespace-nowrap text-right text-sm">{it.price * it.qty} руб.</b>
                  <button onClick={() => remove(it.key)} aria-label="Удалить" className="grid h-9 w-9 place-items-center text-lg sm:h-11 sm:w-11">✕</button>
                </div>
              </li>
            ))}
            {chosenGifts.map((g) => (
              <li key={`${g.promoId}-${g.idx}`} className="flex items-center gap-2 rounded-2xl bg-blush p-3">
                <span className="text-xl" aria-hidden>🎁</span>
                <div className="min-w-0 flex-1"><div className="line-clamp-2 text-sm font-extrabold leading-tight">{giftName(g)}</div><div className="text-xs font-bold text-accent">Подарок по акции</div></div>
                <b className="text-sm text-accent">0 руб.</b>
              </li>
            ))}
          </ul>

          {(eng.slots.length > 0 || eng.hints.length > 0 || eng.discounts.length > 0) && (
            <div className="mt-4 space-y-3 rounded-[24px] bg-card p-4 shadow-soft">
              {eng.discounts.map((d) => <p key={d.promoId} className="text-sm font-bold text-accent">Акция «{d.title}»: −{d.amount} ₽</p>)}
              {eng.slots.map((s) => Array.from({ length: s.count }, (_, i) => (
                <div key={`${s.promoId}-${i}`}>
                  <p className="mb-1.5 text-sm font-extrabold">🎁 Выберите подарок · {s.title}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.options.map((o) => {
                      const on = gifts[s.promoId]?.[i]?.productId === o.productId && gifts[s.promoId]?.[i]?.label === o.label;
                      return <button key={`${o.productId}-${o.label}`} type="button" aria-pressed={on} onClick={() => setGift(s.promoId, i, on ? null : o)} className={`min-h-11 rounded-full px-4 text-left text-sm font-bold ${on ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>{giftName(o)}</button>;
                    })}
                  </div>
                </div>
              )))}
              {eng.hints.map((h) => <p key={h.promoId} className="text-sm text-mute">💡 {h.text}</p>)}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Промокод" aria-label="Промокод" autoCapitalize="characters"
              className="h-12 min-w-0 flex-1 rounded-full border border-black/10 bg-card px-5 font-semibold uppercase outline-none focus:ring-2 focus:ring-accent" />
            <button onClick={applyPromo} disabled={promoBusy || !promoInput.trim()} className="h-12 rounded-full bg-brand px-6 font-bold text-white disabled:opacity-50">{promoBusy ? '…' : 'Применить'}</button>
          </div>
          {promoMsg && <p className={`mt-1 text-sm ${promo ? 'text-accent' : 'text-red-500'}`}>{promoMsg}</p>}
          {promo && !activePromo && <p className="mt-1 text-sm text-red-500">Промокод {promo.code} действует от заказа {promo.minOrder} ₽</p>}
          {promo && <button onClick={() => { setPromo(null); setPromoMsg(''); setPromoInput(''); }} className="mt-1 text-xs font-bold text-mute underline">Убрать промокод</button>}

          <div className="mt-4 flex gap-2">{tab('delivery', 'Доставка')}{tab('pickup', 'Самовывоз')}</div>
          {needZone && <ZonePicker zones={settings.zones} text={settings.zoneText} selectedId={zone?.id ?? null} onSelect={setZone} />}
          {!form && <Totals subtotal={subtotal} totals={totals} receive={receive} deliveryPrice={deliveryPrice} freeFrom={freeFrom} promoCode={activePromo?.code} actionDiscount={eng.discount} />}
          {settings.deliveryTime && receive === 'delivery' && !form && <p className="mt-3 text-center text-sm text-mute">{settings.deliveryTime}</p>}
          {needZone && !zone && <p className="mt-3 text-center text-sm font-semibold text-red-500">Выберите зону доставки на карте или кнопкой</p>}
          {!minOk && <p className="mt-3 text-center text-sm font-semibold text-red-500">Минимальная сумма заказа на доставку {minOrder} ₽. Добавьте ещё на {short} ₽ или выберите самовывоз</p>}
          {!form && <button onClick={() => setForm(true)} disabled={!canOrder} className="mx-auto mt-4 flex h-14 w-full max-w-sm items-center justify-center rounded-full bg-brand px-10 text-lg font-bold text-white disabled:opacity-50">Оформить заказ</button>}
          {form && <Checkout onDone={setDone} settings={settings} receive={receive} subtotal={subtotal} totals={totals} promoCode={activePromo?.code} canOrder={canOrder} deliveryPrice={deliveryPrice} freeFrom={freeFrom} zoneId={zone?.id} gifts={chosenGifts.map((g) => ({ promoId: g.promoId, productId: g.productId, label: g.label }))} actionDiscount={eng.discount} />}
        </>
      )}
      {phoneBlock}
    </section>
  );
}
