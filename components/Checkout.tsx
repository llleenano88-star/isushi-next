'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useCart, selectTotal } from '@/lib/store/cart';
const inp = 'mb-2 h-14 w-full rounded-full bg-card px-6 font-semibold shadow-soft outline-none focus:ring-2 focus:ring-orange-400';
export default function Checkout() {
  const { items, setOpen } = useCart(); const total = useCart(selectTotal); const key = useRef(crypto.randomUUID());
  const [f, setF] = useState({ name: '', phone: '', address: '', comment: '', receiveType: 'delivery', paymentMethod: 'cash' });
  const [token, setToken] = useState(''); const box = useRef<HTMLDivElement>(null); const wid = useRef<string>('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!siteKey) return;
    const mount = () => { if (box.current && !wid.current) wid.current = (window as any).turnstile.render(box.current, { sitekey: siteKey, callback: setToken, 'expired-callback': () => setToken('') }); };
    if ((window as any).turnstile) return mount();
    const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = mount; document.head.appendChild(s);
  }, [siteKey]);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [done, setDone] = useState('');
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const send = async () => {
    setBusy(true); setMsg('');
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, idempotencyKey: key.current, turnstileToken: token, items: items.map((i) => ({ productId: i.productId, label: i.label, qty: i.qty })) }) });
    const j = await r.json(); setBusy(false);
    if (!r.ok) { setMsg(j.error ?? 'Ошибка'); if (wid.current) { (window as any).turnstile.reset(wid.current); setToken(''); } return; }
    setDone(j.number); // корзину очищаем при закрытии экрана, чтобы он не пропал
  };
  const finish = () => { useCart.setState({ items: [] }); setDone(''); setOpen(false); };
  if (done) return (
    <div className="py-8 text-center">
      <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-brand text-4xl text-black">✓</div>
      <p className="text-2xl font-black">Заказ № {done} принят</p>
      <p className="mt-1 text-sm text-mute">Статус заказа можно смотреть в разделе «Заказы». Для этого войдите по email.</p>
      <Link href="/account" onClick={finish} className="mt-5 flex h-14 items-center justify-center rounded-full bg-brand font-black text-black shadow-soft">Следить за статусом</Link>
      <button onClick={finish} className="mt-2 h-12 w-full font-bold text-mute">Вернуться в меню</button>
    </div>
  );
  return (
    <div className="mt-2" onFocus={(e) => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
      <p className="mb-3 flex items-center justify-between rounded-[20px] bg-card px-5 py-3 font-bold shadow-soft"><span>Ваш заказ</span><span className="text-lg font-black">{total} ₽</span></p>
      <input className={inp} placeholder="Имя" autoComplete="name" value={f.name} onChange={set('name')} />
      <input className={inp} placeholder="Телефон" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} />
      <select className={inp} value={f.receiveType} onChange={set('receiveType')}><option value="delivery">Доставка</option><option value="pickup">Самовывоз</option></select>
      {f.receiveType === 'delivery' && <input className={inp} placeholder="Адрес доставки" autoComplete="street-address" value={f.address} onChange={set('address')} />}
      <select className={inp} value={f.paymentMethod} onChange={set('paymentMethod')}><option value="cash">Наличными</option><option value="card">Картой курьеру</option></select>
      <input className={inp} placeholder="Комментарий" value={f.comment} onChange={set('comment')} />
      {siteKey && <div ref={box} className="mb-2 flex justify-center" />}
      {msg && <p className="mb-2 text-sm text-red-500">{msg}</p>}
      <button onClick={send} disabled={busy || (!!siteKey && !token)} className="h-14 w-full rounded-full bg-brand font-black text-black shadow-soft disabled:opacity-50">{busy ? 'Отправляем…' : 'Оформить заказ'}</button>
    </div>
  );
}
