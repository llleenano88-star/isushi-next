'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Checkout from './Checkout';
import Totals from './Totals';
import { useCart } from '@/lib/store/cart';
import { ChoiceIcon } from './PepperIcon';
import { computeTotals, type PromoRule } from '@/lib/pricing';
import type { PublicSettings } from '@/lib/types';

type Applied = PromoRule & { code: string };

export default function CartSection({ settings }: { settings: PublicSettings }) {
  const items = useCart((s) => s.items); const setQty = useCart((s) => s.setQty); const remove = useCart((s) => s.remove);
  const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);
  const [form, setForm] = useState(false); const [done, setDone] = useState('');
  const [receive, setReceive] = useState<'delivery' | 'pickup'>('delivery');
  const [promoInput, setPromoInput] = useState(''); const [promo, setPromo] = useState<Applied | null>(null); const [promoMsg, setPromoMsg] = useState(''); const [promoBusy, setPromoBusy] = useState(false);

  const subtotal = items.reduce((a, i) => a + i.qty * i.price, 0);
  const activePromo = promo && subtotal >= promo.minOrder ? promo : null; // промокод с минимальной суммой действует, только пока сумма достаточна
  const totals = computeTotals({ subtotal, receive, deliveryPrice: settings.deliveryPrice, freeFrom: settings.freeDeliveryFrom, promo: activePromo });
  const short = Math.max(0, settings.minOrder - subtotal); const minOk = short === 0;
  const tel = settings.phone.replace(/[^\d+]/g, '');
  const finish = () => { useCart.setState({ items: [] }); setDone(''); setForm(false); setPromo(null); setPromoInput(''); setPromoMsg(''); };

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
        <p className="mt-2 text-sm text-mute">Статус заказа смотрите в разделе «Заказы». Для этого войдите по email.</p>
        <Link href="/account" onClick={finish} className="mt-5 flex h-14 items-center justify-center rounded-xl bg-brand font-bold text-white">Следить за статусом</Link>
        <button onClick={finish} className="mt-2 h-12 w-full font-bold text-mute">Вернуться в меню</button>
      </div>
      {phoneBlock}
    </section>
  );

  const step = 'grid h-9 w-9 place-items-center rounded-full bg-blush text-lg font-black text-accent sm:h-11 sm:w-11';
  const tab = (v: 'delivery' | 'pickup', label: string) => (
    <button type="button" onClick={() => setReceive(v)} className={`h-11 flex-1 rounded-full text-sm font-bold ${receive === v ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>{label}</button>
  );
  return (
    <section id="cart" className="scroll-mt-24 py-10">
      <h2 className="inline-block rounded-xl bg-brand px-8 py-3 text-2xl font-medium lowercase text-white">корзина</h2>
      {!items.length ? <p className="py-8 text-center text-mute">В корзине пока пусто. Выберите блюда в меню.</p> : (
        <>
          {settings.includedNote && <p className="mt-4 rounded-xl bg-blush px-4 py-2 text-sm font-semibold">{settings.includedNote}</p>}
          <ul className="mt-4 space-y-3">
            {items.map((it) => (
              <li key={it.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-card p-2 shadow-soft">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-blush bg-cover bg-center" style={it.image ? { backgroundImage: `url(${it.image})` } : undefined}>{!it.image && <span aria-hidden>{it.extra ? '🥢' : '🍣'}</span>}</div>
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
          </ul>

          <div className="mt-4 flex gap-2">
            <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Промокод" aria-label="Промокод" autoCapitalize="characters"
              className="h-12 min-w-0 flex-1 rounded-xl border border-black/10 bg-card px-4 font-semibold uppercase outline-none focus:ring-2 focus:ring-accent" />
            <button onClick={applyPromo} disabled={promoBusy || !promoInput.trim()} className="h-12 rounded-xl bg-brand px-5 font-bold text-white disabled:opacity-50">{promoBusy ? '…' : 'Применить'}</button>
          </div>
          {promoMsg && <p className={`mt-1 text-sm ${promo ? 'text-accent' : 'text-red-500'}`}>{promoMsg}</p>}
          {promo && !activePromo && <p className="mt-1 text-sm text-red-500">Промокод {promo.code} действует от заказа {promo.minOrder} ₽</p>}
          {promo && <button onClick={() => { setPromo(null); setPromoMsg(''); setPromoInput(''); }} className="mt-1 text-xs font-bold text-mute underline">Убрать промокод</button>}

          <div className="mt-4 flex gap-2">{tab('delivery', 'доставка')}{tab('pickup', 'самовывоз')}</div>
          {!form && <Totals subtotal={subtotal} totals={totals} receive={receive} deliveryPrice={settings.deliveryPrice} freeFrom={settings.freeDeliveryFrom} promoCode={activePromo?.code} />}
          {settings.deliveryTime && receive === 'delivery' && !form && <p className="mt-3 text-center text-sm text-mute">{settings.deliveryTime}</p>}
          {!minOk && <p className="mt-3 text-center text-sm font-semibold text-red-500">Минимальная сумма заказа {settings.minOrder} ₽. Добавьте ещё на {short} ₽</p>}
          {!form && <button onClick={() => setForm(true)} disabled={!minOk} className="mx-auto mt-4 block rounded-xl bg-brand px-10 py-4 text-xl font-medium lowercase text-white disabled:opacity-50">оформить заказ</button>}
          {form && <Checkout onDone={setDone} settings={settings} receive={receive} subtotal={subtotal} totals={totals} promoCode={activePromo?.code} canOrder={minOk} />}
        </>
      )}
      {phoneBlock}
    </section>
  );
}
