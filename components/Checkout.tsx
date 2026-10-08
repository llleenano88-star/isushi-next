'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart, selectTotal } from '@/lib/store/cart';

const field = 'mb-3 h-14 w-full rounded-xl border border-black/10 bg-card px-5 font-semibold outline-none focus:ring-2 focus:ring-accent dark:border-white/15';
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-3 mt-6 font-display text-2xl font-bold first:mt-0">{children}</h2>;
const Seg = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) => (
  <div className="mb-3 flex gap-2">
    {options.map(([v, l]) => (
      <button key={v} type="button" onClick={() => onChange(v)} className={`h-12 flex-1 rounded-xl border px-3 text-sm font-extrabold transition ${value === v ? 'border-wine bg-brand text-white' : 'border-black/10 bg-card dark:border-white/15'}`}>{l}</button>
    ))}
  </div>
);

export default function Checkout() {
  const items = useCart((s) => s.items); const setQty = useCart((s) => s.setQty); const total = useCart(selectTotal);
  const key = useRef(crypto.randomUUID());
  const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);
  const [f, setF] = useState({ name: '', phone: '', street: '', flat: '', comment: '' });
  const [receive, setReceive] = useState('delivery'); const [when, setWhen] = useState('asap'); const [time, setTime] = useState(''); const [pay, setPay] = useState('cash');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [done, setDone] = useState('');
  const [token, setToken] = useState(''); const box = useRef<HTMLDivElement>(null); const wid = useRef<string>('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!siteKey || !mounted) return;
    const mount = () => { if (box.current && !wid.current) wid.current = (window as any).turnstile.render(box.current, { sitekey: siteKey, callback: setToken, 'expired-callback': () => setToken('') }); };
    if ((window as any).turnstile) return mount();
    const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = mount; document.head.appendChild(s);
  }, [siteKey, mounted, items.length]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const can = items.length > 0 && f.name.trim().length >= 2 && f.phone.replace(/\D/g, '').length >= 10 && (receive === 'pickup' || f.street.trim().length > 2) && (!siteKey || !!token);
  const send = async () => {
    setBusy(true); setMsg('');
    const address = [f.street.trim(), f.flat.trim() && `кв./офис ${f.flat.trim()}`].filter(Boolean).join(', ');
    const comment = [when === 'time' && time ? `${receive === 'delivery' ? 'Доставить' : 'Забрать'} к ${time}` : '', f.comment.trim()].filter(Boolean).join('. ');
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: f.name, phone: f.phone, receiveType: receive, address: receive === 'delivery' ? address : undefined, paymentMethod: pay, comment: comment || undefined,
      idempotencyKey: key.current, turnstileToken: token, items: items.map((i) => ({ productId: i.productId, label: i.label, qty: i.qty })) }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg(j.error ?? 'Ошибка'); if (wid.current) { (window as any).turnstile.reset(wid.current); setToken(''); } return; }
    setDone(j.number);
  };
  const finish = () => useCart.setState({ items: [] });

  if (!mounted) return <div className="skeleton mx-auto h-96 max-w-3xl" />;
  if (done) return (
    <div className="mx-auto max-w-md rounded-[32px] bg-card p-8 text-center shadow-soft">
      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-leaf text-4xl text-white">✓</div>
      <p className="font-display text-3xl font-bold">Заказ № {done} принят</p>
      <p className="mt-2 text-sm text-mute">Статус заказа смотрите в разделе «Заказы». Для этого войдите по email.</p>
      <Link href="/account" onClick={finish} className="mt-5 flex h-14 items-center justify-center rounded-full bg-brand font-black text-white shadow-soft">Следить за статусом</Link>
      <Link href="/" onClick={finish} className="mt-2 flex h-12 items-center justify-center font-bold text-mute">Вернуться в меню</Link>
    </div>
  );
  if (!items.length) return <div className="py-16 text-center"><p className="text-mute">В корзине пока пусто.</p><Link href="/" className="mt-4 inline-flex h-12 items-center rounded-full bg-brand px-8 font-black text-white">В меню</Link></div>;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]" onFocus={(e) => (e.target as HTMLElement).scrollIntoView?.({ block: 'center', behavior: 'smooth' })}>
      <section className="rounded-[28px] bg-card p-6 shadow-soft">
        <H>Контакты и получение</H>
        <input className={field} placeholder="Имя" autoComplete="name" value={f.name} onChange={set('name')} />
        <input className={field} placeholder="Телефон" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} />
        <Seg value={receive} onChange={setReceive} options={[['delivery', 'Доставка'], ['pickup', 'Самовывоз']]} />
        {receive === 'delivery' && (
          <div className="grid gap-x-3 sm:grid-cols-[2fr_1fr]">
            <input className={field} placeholder="Улица и дом" autoComplete="street-address" value={f.street} onChange={set('street')} />
            <input className={field} placeholder="Кв./офис" value={f.flat} onChange={set('flat')} />
          </div>
        )}
        <H>{receive === 'delivery' ? 'Время доставки' : 'Время самовывоза'}</H>
        <Seg value={when} onChange={setWhen} options={[['asap', 'Как можно скорее'], ['time', 'Ко времени']]} />
        {when === 'time' && <input className={field} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
        <H>Способ оплаты</H>
        <Seg value={pay} onChange={setPay} options={[['cash', 'Наличными'], ['card', 'Картой курьеру']]} />
        <input className={field} placeholder="Комментарий к заказу" value={f.comment} onChange={set('comment')} />
      </section>
      <aside className="rounded-[28px] bg-card p-6 shadow-soft lg:sticky lg:top-32">
        <H>Ваш заказ</H>
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {items.map((it) => (
            <li key={it.key} className="flex items-center gap-3 py-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-blush bg-cover bg-center" style={it.image ? { backgroundImage: `url(${it.image})` } : undefined}>{!it.image && <span aria-hidden>🍣</span>}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-extrabold">{it.name}</div>
                <div className="text-xs text-mute">{it.label}</div>
                <div className="mt-1 flex items-center gap-1">
                  <button onClick={() => setQty(it.key, it.qty - 1)} aria-label="Меньше" className="grid h-11 w-11 place-items-center rounded-full bg-blush font-black text-accent">−</button>
                  <b className="w-6 text-center text-sm">{it.qty}</b>
                  <button onClick={() => setQty(it.key, it.qty + 1)} aria-label="Больше" className="grid h-11 w-11 place-items-center rounded-full bg-blush font-black text-accent">+</button>
                </div>
              </div>
              <b className="font-display text-lg text-accent">{it.price * it.qty} ₽</b>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/15"><span className="font-bold">Итого</span><span className="font-display text-3xl font-bold text-accent">{total} ₽</span></div>
        {siteKey && <div ref={box} className="mt-4 flex justify-center" />}
        {msg && <p className="mt-3 text-sm text-red-500">{msg}</p>}
        <button onClick={send} disabled={busy || !can} className="mt-4 h-14 w-full rounded-full bg-brand font-black text-white shadow-soft disabled:opacity-50">{busy ? 'Отправляем…' : 'Оформить заказ'}</button>
      </aside>
    </div>
  );
}
