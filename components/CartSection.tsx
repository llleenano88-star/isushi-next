'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Checkout from './Checkout';
import { useCart, selectTotal } from '@/lib/store/cart';
import { DELIVERY_TIME } from '@/lib/content';

export default function CartSection({ deliveryTime }: { deliveryTime?: string }) {
  const items = useCart((s) => s.items); const setQty = useCart((s) => s.setQty); const remove = useCart((s) => s.remove); const total = useCart(selectTotal);
  const dt = deliveryTime ?? DELIVERY_TIME;
  const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);
  const [form, setForm] = useState(false); const [done, setDone] = useState('');
  const finish = () => { useCart.setState({ items: [] }); setDone(''); setForm(false); };
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
    </section>
  );
  const step = 'grid h-9 w-9 place-items-center rounded-full bg-blush text-lg font-black text-accent sm:h-11 sm:w-11';
  return (
    <section id="cart" className="scroll-mt-24 py-10">
      <h2 className="inline-block rounded-xl bg-brand px-8 py-3 text-2xl font-medium lowercase text-white">корзина</h2>
      {!items.length ? <p className="py-8 text-center text-mute">В корзине пока пусто. Выберите блюда в меню.</p> : (
        <>
          <ul className="mt-5 space-y-3">
            {items.map((it) => (
              <li key={it.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-card p-2 shadow-soft">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-blush bg-cover bg-center" style={it.image ? { backgroundImage: `url(${it.image})` } : undefined}>{!it.image && <span aria-hidden>🍣</span>}</div>
                <div className="min-w-[5.5rem] flex-1">
                  <div title={it.name} className="line-clamp-2 break-words text-sm font-extrabold leading-tight">{it.name}</div>
                  <div className="mt-0.5 text-xs text-mute">{it.label}</div>
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
          <p className="mt-4 text-right text-xl font-extrabold">Итого: {total} руб.</p>
          {dt && <p className="mt-3 text-center text-sm text-mute">{dt}</p>}
          {!form && <button onClick={() => setForm(true)} className="mx-auto mt-4 block rounded-xl bg-brand px-10 py-4 text-xl font-medium lowercase text-white">оформить заказ</button>}
          {form && <Checkout onDone={setDone} deliveryTime={dt} />}
        </>
      )}
    </section>
  );
}
