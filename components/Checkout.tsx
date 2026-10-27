'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Totals from './Totals';
import { useCart } from '@/lib/store/cart';
import type { Totals as TotalsT } from '@/lib/pricing';
import type { PublicSettings } from '@/lib/types';
import { hhmm, nowInTz } from '@/lib/promotions';

const line = 'w-full border-b border-black/25 bg-transparent px-1 py-3 text-base font-semibold outline-none placeholder:font-normal placeholder:text-mute focus:border-accent';
const Check = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex min-h-12 items-center gap-2 text-xs font-semibold text-mute"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[#d81b7a]" />{label}</label>
);

const pad = (n: number) => String(n).padStart(2, '0');
// Доступное время «ко времени»: не раньше, чем через минимальный срок (доставка / самовывоз), с шагом из настроек
function buildSlots(nowMin: number, lead: number, step: number, workFrom: string, workTo: string): string[] {
  let t = Math.ceil((nowMin + lead) / step) * step;
  const from = hhmm(workFrom); const to = hhmm(workTo) ?? 23 * 60 + 59;
  if (from != null && t < from) t = Math.ceil(from / step) * step;
  const out: string[] = [];
  for (; t <= to && t < 24 * 60 && out.length < 60; t += step) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  return out;
}

export default function Checkout({ onDone, settings, receive, subtotal, totals, promoCode, canOrder, deliveryPrice, freeFrom, zoneId, gifts, actionDiscount }: {
  onDone: (number: string) => void; settings: PublicSettings; receive: 'delivery' | 'pickup'; subtotal: number; totals: TotalsT; promoCode?: string; canOrder: boolean;
  deliveryPrice: number; freeFrom: number; zoneId?: string; gifts: { promoId: string; productId: string; label: string }[]; actionDiscount: number;
}) {
  const items = useCart((s) => s.items); const key = useRef(crypto.randomUUID());
  const [f, setF] = useState({ name: '', phone: '', street: '', apt: '', floor: '', intercom: '', time: '', comment: '' });
  const [house, setHouse] = useState(false); const [noBell, setNoBell] = useState(false); const [when, setWhen] = useState('asap'); const [pay, setPay] = useState<'cash' | 'card'>('cash');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const [token, setToken] = useState(''); const box = useRef<HTMLDivElement>(null); const wid = useRef('');
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!siteKey) return;
    const mount = () => { if (box.current && !wid.current) wid.current = (window as any).turnstile.render(box.current, { sitekey: siteKey, callback: setToken, 'expired-callback': () => setToken('') }); };
    if ((window as any).turnstile) return mount();
    const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = mount; document.head.appendChild(s);
  }, [siteKey]);
  const lead = receive === 'delivery' ? settings.deliveryLead : settings.pickupLead;
  const slots = useMemo(() => buildSlots(nowInTz(settings.tz).minutes, lead[0], settings.slotStep, settings.workFrom, settings.workTo), [settings.tz, settings.slotStep, settings.workFrom, settings.workTo, lead]); // eslint-disable-line react-hooks/exhaustive-deps
  const timeOk = when !== 'time' || slots.includes(f.time);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const can = canOrder && items.length > 0 && f.name.trim().length >= 2 && f.phone.replace(/\D/g, '').length >= 10 && (receive === 'pickup' || f.street.trim().length > 2) && (!siteKey || !!token) && timeOk;
  const send = async () => {
    setBusy(true); setMsg('');
    const address = [f.street.trim(), house ? 'частный дом' : f.apt.trim() && `кв./офис ${f.apt.trim()}`, !house && f.floor.trim() && `этаж ${f.floor.trim()}`,
      noBell ? 'домофон не работает' : f.intercom.trim() && `домофон ${f.intercom.trim()}`].filter(Boolean).join(', ');
    const comment = f.comment.trim();
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: f.name, phone: f.phone, receiveType: receive, address: receive === 'delivery' ? address : undefined, paymentMethod: pay, comment: comment || undefined,
      idempotencyKey: key.current, turnstileToken: token, promoCode: promoCode || undefined, clientTotal: totals.total,
      ...(when === 'time' && f.time ? { desiredTime: f.time } : {}), ...(receive === 'delivery' && zoneId ? { zoneId } : {}), gifts,
      items: items.filter((i) => !i.extra).map((i) => ({ productId: i.productId, label: i.label, qty: i.qty, ...(i.choices?.length ? { choices: i.choices } : {}) })),
      extras: items.filter((i) => i.extra).map((i) => ({ id: i.productId, qty: i.qty })) }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg(j.error ?? 'Ошибка'); if (wid.current) { (window as any).turnstile.reset(wid.current); setToken(''); } return; }
    onDone(j.number);
  };
  const payBtn = (v: 'cash' | 'card', label: string) => (
    <button type="button" onClick={() => setPay(v)} className={`min-h-12 flex-1 rounded-full px-4 text-sm font-extrabold uppercase ${pay === v ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>{label}</button>
  );
  return (
    <div className="mt-6 rounded-[28px] bg-card p-5 shadow-soft" onFocus={(e) => (e.target as HTMLElement).scrollIntoView?.({ block: 'center', behavior: 'smooth' })}>
      <p className="mb-2 text-sm font-bold">{receive === 'delivery' ? 'Доставка' : 'Самовывоз'}</p>
      <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
        <input className={line} placeholder="Имя" autoComplete="name" value={f.name} onChange={set('name')} />
        <input className={line} placeholder="Номер телефона" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} />
        {receive === 'delivery' && (
          <>
            <input className={`${line} md:col-span-2`} placeholder="Адрес доставки (улица, дом)" autoComplete="street-address" value={f.street} onChange={set('street')} />
            <Check label="Частный дом" checked={house} onChange={setHouse} />
            <span />
            {!house && <input className={line} placeholder="Квартира / офис" value={f.apt} onChange={set('apt')} />}
            {!house && <input className={line} placeholder="Этаж" inputMode="numeric" value={f.floor} onChange={set('floor')} />}
            <input className={line} placeholder="Домофон" value={f.intercom} onChange={set('intercom')} disabled={noBell} />
            <Check label="Не работает" checked={noBell} onChange={setNoBell} />
          </>
        )}
        <select className={line} value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Желаемое время получения">
          <option value="asap">Как можно скорее (через {lead[0]}–{lead[1]} мин)</option><option value="time">Ко времени</option>
        </select>
        {when === 'time' ? (
          slots.length ? (
            <select className={line} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} aria-label="Время">
              <option value="">Выберите время</option>{slots.map((t) => <option key={t} value={t}>{receive === 'delivery' ? 'Доставить к' : 'Забрать к'} {t}</option>)}
            </select>
          ) : <p className="py-3 text-sm text-mute">На сегодня свободного времени уже нет, выберите «Как можно скорее»</p>
        ) : <span />}
        <input className={`${line} md:col-span-2`} placeholder="Комментарий к заказу" value={f.comment} onChange={set('comment')} />
      </div>
      <p className="mb-2 mt-5 text-sm font-bold">Способ оплаты</p>
      <div className="flex flex-col gap-2 sm:flex-row">{payBtn('card', receive === 'delivery' ? 'Переводом при получении' : 'Картой')}{payBtn('cash', 'Наличными')}</div>
      {siteKey && <div ref={box} className="mt-4 flex justify-center" />}
      <Totals subtotal={subtotal} totals={totals} receive={receive} deliveryPrice={deliveryPrice} freeFrom={freeFrom} promoCode={promoCode} actionDiscount={actionDiscount} />
      {settings.deliveryTime && receive === 'delivery' && <p className="mt-3 text-center text-sm text-mute">{settings.deliveryTime}</p>}
      {msg && <p className="mt-3 text-sm text-red-500">{msg}</p>}
      <button onClick={send} disabled={busy || !can} className="mt-4 h-14 w-full rounded-full bg-brand text-lg font-bold text-white disabled:opacity-50">{busy ? 'Отправляем…' : `Подтвердить заказ · ${totals.total} ₽`}</button>
    </div>
  );
}
