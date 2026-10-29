'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Totals from './Totals';
import { useCart } from '@/lib/store/cart';
import type { Totals as TotalsT } from '@/lib/pricing';
import type { PublicSettings } from '@/lib/types';
import { hhmm, nowInTz } from '@/lib/promotions';
import { geocodeAddress, zoneAt } from '@/lib/geo';

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

export default function Checkout({ onDone, settings, receive, subtotal, totals, promoCode, canOrder, deliveryPrice, freeFrom, zoneId, gifts, actionDiscount, promoId }: {
  onDone: (number: string) => void; settings: PublicSettings; receive: 'delivery' | 'pickup'; subtotal: number; totals: TotalsT; promoCode?: string; canOrder: boolean;
  deliveryPrice: number; freeFrom: number; promoId?: string; zoneId?: string; gifts: { promoId: string; productId: string; label: string }[]; actionDiscount: number;
}) {
  const items = useCart((s) => s.items); const setZone = useCart((s) => s.setZone); const key = useRef(crypto.randomUUID());
  const [f, setF] = useState({ name: '', phone: '', street: '', houseNo: '', apt: '', floor: '', intercom: '', time: '', comment: '' });
  const [house, setHouse] = useState(false); const [noBell, setNoBell] = useState(false); const [when, setWhen] = useState('asap'); const [pay, setPay] = useState<'cash' | 'transfer' | 'qr'>('cash');
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [tried, setTried] = useState(false);
  const [zst, setZst] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'out' | 'nf'; text: string }>({ kind: 'idle', text: '' });
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

  // Зона доставки определяется по адресу (улица + дом), клиент её не выбирает. От зоны зависит стоимость доставки.
  const needZone = receive === 'delivery' && settings.zones.length > 0; const firstRun = useRef(true);
  useEffect(() => {
    if (!needZone) return;
    if (!firstRun.current) setZone(null); // адрес поменялся: зону определяем заново
    firstRun.current = false;
    if (f.street.trim().length < 3 || !f.houseNo.trim()) { setZst({ kind: 'idle', text: '' }); return; }
    let dead = false;
    const t = setTimeout(async () => {
      setZst({ kind: 'busy', text: 'Определяем зону доставки…' });
      const p = await geocodeAddress(`${f.street.trim()} ${f.houseNo.trim()}`, settings.city);
      if (dead) return;
      if (!p) { setZst({ kind: 'nf', text: 'Не удалось найти адрес на карте. Проверьте улицу и номер дома или выберите зону вручную.' }); return; }
      const z = zoneAt(settings.zones, p.lat, p.lng);
      if (z) { setZone(z.id); setZst({ kind: 'ok', text: `Зона доставки: «${z.name}»` }); }
      else setZst({ kind: 'out', text: 'Этот адрес вне зон доставки. Позвоните нам, и мы подскажем.' });
    }, 900);
    return () => { dead = true; clearTimeout(t); };
  }, [f.street, f.houseNo, needZone]); // eslint-disable-line react-hooks/exhaustive-deps

  // Обязательные поля
  const errs: Record<string, string> = {};
  if (f.name.trim().length < 2) errs.name = 'Укажите имя';
  if (f.phone.replace(/\D/g, '').length < 10) errs.phone = 'Укажите телефон полностью';
  if (receive === 'delivery') {
    if (f.street.trim().length < 3) errs.street = 'Укажите улицу';
    if (!f.houseNo.trim()) errs.house = 'Укажите номер дома';
    if (needZone && !zoneId) errs.zone = 'Не определена зона доставки: проверьте адрес';
  }
  if (!timeOk) errs.time = 'Выберите время';
  if (siteKey && !token) errs.captcha = 'Подтвердите, что вы не робот';
  const bad = (k: string) => (tried && errs[k] ? ' border-red-500' : '');
  const hint = (k: string) => (tried && errs[k] ? <p className="-mt-1 pb-1 text-xs font-semibold text-red-500">{errs[k]}</p> : null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const send = async () => {
    if (!canOrder || items.length === 0) return;
    if (Object.keys(errs).length) { setTried(true); setMsg(`Заполните обязательные поля: ${Object.values(errs).join('; ')}`); return; }
    setBusy(true); setMsg('');
    const address = [`${f.street.trim()}, д. ${f.houseNo.trim()}`, house ? 'частный дом' : f.apt.trim() && `кв./офис ${f.apt.trim()}`, !house && f.floor.trim() && `этаж ${f.floor.trim()}`,
      noBell ? 'домофон не работает' : f.intercom.trim() && `домофон ${f.intercom.trim()}`].filter(Boolean).join(', ');
    const comment = f.comment.trim();
    const r = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      name: f.name.trim(), phone: f.phone, receiveType: receive, address: receive === 'delivery' ? address : undefined, ...(receive === 'delivery' ? { street: f.street.trim(), house: f.houseNo.trim() } : {}), paymentMethod: pay, comment: comment || undefined,
      idempotencyKey: key.current, turnstileToken: token, promoCode: promoCode || undefined, clientTotal: totals.total,
      ...(when === 'time' && f.time ? { desiredTime: f.time } : {}), ...(receive === 'delivery' && zoneId ? { zoneId } : {}), ...(promoId ? { promoId } : {}), gifts,
      items: items.filter((i) => !i.extra).map((i) => ({ productId: i.productId, label: i.label, qty: i.qty, ...(i.choices?.length ? { choices: i.choices } : {}) })),
      extras: items.filter((i) => i.extra).map((i) => ({ id: i.productId, qty: i.qty })) }) });
    const j = await r.json().catch(() => ({})); setBusy(false);
    if (!r.ok) { setMsg(j.error ?? 'Ошибка'); if (wid.current) { (window as any).turnstile.reset(wid.current); setToken(''); } return; }
    onDone(j.number);
  };
  const payBtn = (v: 'cash' | 'transfer' | 'qr', label: string) => (
    <button type="button" onClick={() => setPay(v)} className={`min-h-12 flex-1 rounded-full px-4 text-sm font-extrabold ${pay === v ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>{label}</button>
  );
  return (
    <div className="mt-6 rounded-[28px] bg-card p-5 shadow-soft" onFocus={(e) => (e.target as HTMLElement).scrollIntoView?.({ block: 'center', behavior: 'smooth' })}>
      <p className="mb-2 text-sm font-bold">{receive === 'delivery' ? 'Доставка' : 'Самовывоз'}</p>
      <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
        <div><input className={`${line}${bad('name')}`} placeholder="Имя *" autoComplete="name" value={f.name} onChange={set('name')} />{hint('name')}</div>
        <div><input className={`${line}${bad('phone')}`} placeholder="Номер телефона *" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} />{hint('phone')}</div>
        {receive === 'delivery' && (
          <>
            <div><input className={`${line}${bad('street')}`} placeholder="Улица *" autoComplete="address-line1" value={f.street} onChange={set('street')} />{hint('street')}</div>
            <div><input className={`${line}${bad('house')}`} placeholder="Дом *" autoComplete="address-line2" value={f.houseNo} onChange={set('houseNo')} />{hint('house')}</div>
            {needZone && zst.text && <p className={`md:col-span-2 rounded-2xl px-4 py-2 text-sm font-semibold ${zst.kind === 'ok' ? 'bg-[#e6f6e3] text-[#1f6b16]' : zst.kind === 'busy' ? 'text-mute' : 'bg-[#ffe9ec] text-[#b3261e]'}`}>{zst.text}</p>}
            {needZone && zst.kind === 'nf' && (
              <select className={`${line} md:col-span-2`} value={zoneId ?? ''} onChange={(e) => setZone(e.target.value || null)} aria-label="Зона доставки (если адрес не нашёлся)">
                <option value="">Выберите зону вручную</option>{settings.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            )}
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
      <div className="flex flex-col gap-2 sm:flex-row">{payBtn('transfer', 'Переводом')}{payBtn('qr', 'QR-кодом')}{payBtn('cash', 'Наличными')}</div>
      <p className="mt-2 text-xs text-mute">Оплата только при получении заказа</p>
      {siteKey && <div ref={box} className="mt-4 flex justify-center" />}
      {tried && errs.captcha && <p className="mt-1 text-center text-xs font-semibold text-red-500">{errs.captcha}</p>}
      <Totals subtotal={subtotal} totals={totals} receive={receive} deliveryPrice={deliveryPrice} freeFrom={freeFrom} promoCode={promoCode} actionDiscount={actionDiscount} />
      {settings.deliveryTime && receive === 'delivery' && <p className="mt-3 text-center text-sm text-mute">{settings.deliveryTime}</p>}
      {msg && <p className="mt-3 text-sm text-red-500">{msg}</p>}
      <button onClick={send} disabled={busy || !canOrder} className="mt-4 h-14 w-full rounded-full bg-brand text-lg font-bold text-white disabled:opacity-50">{busy ? 'Отправляем…' : `Подтвердить заказ · ${totals.total} ₽`}</button>
    </div>
  );
}
