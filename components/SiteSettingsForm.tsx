'use client';
import { useState } from 'react';
import { uploadImage } from '@/lib/uploadImage';
import type { Extra, PublicSettings } from '@/lib/types';

type Banner = { image: string; href?: string };
type About = { title: string; blocks: string[]; listTitle: string; list: string[]; outro: string };
type Init = { banners: Banner[]; categoryImages: Record<string, string>; about: About; mapEmbed: string; cart: PublicSettings };
type ExtraDraft = Omit<Extra, 'price'> & { price: string | number };
const box = 'rounded-[24px] bg-card p-5 shadow-soft space-y-3';
const inp = 'h-12 w-full rounded-xl border border-black/10 bg-transparent px-4 font-semibold outline-none focus:ring-2 focus:ring-accent';
const area = 'w-full rounded-xl border border-black/10 bg-transparent p-4 text-sm outline-none focus:ring-2 focus:ring-accent';
const btn = 'inline-flex min-h-12 cursor-pointer items-center rounded-full bg-brand px-5 text-sm font-black text-white';
const ghost = 'grid h-12 w-12 place-items-center rounded-full bg-blush font-black text-accent';
const H = ({ children, hint }: { children: React.ReactNode; hint?: string }) => <div><h2 className="text-xl font-extrabold">{children}</h2>{hint && <p className="text-xs text-mute">{hint}</p>}</div>;
const L = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => <label className="block"><span className="mb-1 block text-sm font-bold">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}</label>;

function Pick({ label, onFile, disabled }: { label: string; onFile: (f?: File) => void; disabled?: boolean }) {
  return <label className={btn}>{label}<input type="file" accept="image/*" className="hidden" disabled={disabled} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} /></label>;
}
const Thumb = ({ url, wide }: { url?: string; wide?: boolean }) => <div className={`shrink-0 rounded-xl bg-blush bg-cover bg-center ${wide ? 'h-16 w-32' : 'h-16 w-16'}`} style={url ? { backgroundImage: `url(${url})` } : undefined} />;
const toNum = (v: string | number) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };

export default function SiteSettingsForm({ initial, categories, action, saved }: { initial: Init; categories: string[]; action: (fd: FormData) => void; saved: boolean }) {
  const c = initial.cart;
  const [banners, setBanners] = useState<Banner[]>(initial.banners); const [ci, setCi] = useState(initial.categoryImages);
  const [a, setA] = useState({ title: initial.about.title, blocks: initial.about.blocks.join('\n\n'), listTitle: initial.about.listTitle, list: initial.about.list.join('\n'), outro: initial.about.outro });
  const [map, setMap] = useState(initial.mapEmbed); const [dt, setDt] = useState(c.deliveryTime);
  const [dPrice, setDPrice] = useState(String(c.deliveryPrice)); const [dFree, setDFree] = useState(String(c.freeDeliveryFrom)); const [minOrder, setMinOrder] = useState(String(c.minOrder));
  const [phone, setPhone] = useState(c.phone); const [note, setNote] = useState(c.includedNote);
  const [extras, setExtras] = useState<ExtraDraft[]>(c.extras.map((e) => ({ ...e, image: e.image ?? '', iikoId: e.iikoId ?? '' })));
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const up = async (f: File | undefined, apply: (url: string) => void, max = 1800) => {
    if (!f) return; setBusy(true); setErr('');
    try { apply(await uploadImage(f, max)); } catch { setErr('Не удалось загрузить картинку. Попробуйте другой файл.'); }
    setBusy(false);
  };
  const move = (i: number, d: number) => { const b = [...banners]; const j = i + d; if (j < 0 || j >= b.length) return; [b[i], b[j]] = [b[j], b[i]]; setBanners(b); };
  const setEx = (i: number, patch: Partial<ExtraDraft>) => setExtras(extras.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const payload = JSON.stringify({
    banners: banners.filter((b) => b.image).map((b) => ({ image: b.image, href: (b.href ?? '').trim() })),
    categoryImages: Object.fromEntries(Object.entries(ci).filter(([, v]) => v)),
    about: { title: a.title.trim(), blocks: a.blocks.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean), listTitle: a.listTitle.trim(), list: a.list.split('\n').map((s) => s.trim()).filter(Boolean), outro: a.outro.trim() },
    mapEmbed: map.trim(), deliveryTime: dt.trim(), deliveryPrice: toNum(dPrice), freeDeliveryFrom: toNum(dFree), minOrder: toNum(minOrder),
    phone: phone.trim(), includedNote: note.trim(),
    extras: extras.filter((e) => e.name.trim()).map((e) => ({ id: e.id, name: e.name.trim(), price: toNum(e.price), image: e.image ?? '', iikoId: (e.iikoId ?? '').trim(), default: e.default, active: e.active })),
  });
  return (
    <form action={action} className="space-y-5 py-4">
      <input type="hidden" name="payload" value={payload} />
      <h1 className="font-display text-4xl font-bold text-accent">Оформление сайта</h1>
      {saved && <p className="rounded-2xl bg-blush p-3 text-sm font-bold text-accent">Сохранено. Изменения на сайте появятся в течение минуты.</p>}
      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className={box}>
        <H hint="Эти значения учитываются и в корзине, и при приёме заказа на сервере.">Доставка и заказ</H>
        <div className="grid gap-3 sm:grid-cols-3">
          <L label="Стоимость доставки, ₽" hint="0 = доставка бесплатная"><input className={inp} inputMode="decimal" value={dPrice} onChange={(e) => setDPrice(e.target.value)} /></L>
          <L label="Бесплатная доставка от суммы, ₽" hint="0 = такого условия нет"><input className={inp} inputMode="decimal" value={dFree} onChange={(e) => setDFree(e.target.value)} /></L>
          <L label="Минимальная сумма заказа, ₽" hint="0 = без ограничения"><input className={inp} inputMode="decimal" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} /></L>
        </div>
        <L label="Время доставки" hint="Показывается в корзине и на странице оформления. Например: Доставка по городу ~90 минут"><input className={inp} placeholder="Доставка по городу ~90 минут" value={dt} onChange={(e) => setDt(e.target.value)} /></L>
        <L label="Телефон для связи" hint="Показывается под корзиной. Например: +7 999 123-45-67"><input className={inp} inputMode="tel" placeholder="+7 999 123-45-67" value={phone} onChange={(e) => setPhone(e.target.value)} /></L>
        <L label="Текст над списком в корзине" hint="Например: В комплекте — только соевый соус бесплатно. Пусто = не показывать"><input className={inp} value={note} onChange={(e) => setNote(e.target.value)} /></L>
      </div>

      <div className={box}>
        <H hint="Например: Имбирь, Васаби, Палочки, Соевый соус (доп.), Спайси соус. При добавлении первого блюда в корзину клиенту предлагают выбрать эти позиции. Код iiko указывайте, если позиция заведена в iiko: тогда она уйдёт на кухню отдельной строкой.">Дополнительно к заказу</H>
        {extras.map((e, i) => (
          <div key={e.id} className="space-y-2 rounded-2xl border border-black/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Thumb url={e.image} />
              <Pick label={e.image ? 'Заменить фото' : 'Фото'} disabled={busy} onFile={(f) => up(f, (u) => setEx(i, { image: u }), 600)} />
              {e.image && <button type="button" aria-label="Убрать фото" onClick={() => setEx(i, { image: '' })} className={ghost}>✕</button>}
              <input className={`${inp} min-w-40 flex-1`} placeholder="Название" value={e.name} onChange={(ev) => setEx(i, { name: ev.target.value })} />
              <input className={`${inp} w-28`} placeholder="Цена, ₽" inputMode="decimal" value={e.price} onChange={(ev) => setEx(i, { price: ev.target.value })} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <input className={`${inp} min-w-40 flex-1`} placeholder="Код позиции в iiko (необязательно)" value={e.iikoId ?? ''} onChange={(ev) => setEx(i, { iikoId: ev.target.value })} />
              <label className="flex min-h-12 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-[#d81b7a]" checked={e.default} onChange={(ev) => setEx(i, { default: ev.target.checked })} />Выбран по умолчанию</label>
              <label className="flex min-h-12 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5 accent-[#d81b7a]" checked={e.active} onChange={(ev) => setEx(i, { active: ev.target.checked })} />Активен</label>
              <button type="button" aria-label="Удалить позицию" onClick={() => setExtras(extras.filter((_, k) => k !== i))} className={ghost}>🗑</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setExtras([...extras, { id: crypto.randomUUID(), name: '', price: '', image: '', iikoId: '', default: false, active: true }])} className="h-12 px-2 font-bold text-accent">+ Добавить позицию</button>
        {!extras.length && <p className="text-xs text-mute">Позиций нет: плашка «Хотите добавить к заказу?» не показывается.</p>}
      </div>

      <div className={box}>
        <H hint="Широкие картинки, лучше всего 1800×600 (3 к 1). Листаются по порядку, у каждого можно задать ссылку (например, #menu или https://…).">Баннеры сверху</H>
        {banners.map((b, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 p-3">
            <Thumb url={b.image} wide />
            <Pick label={b.image ? 'Заменить' : 'Загрузить'} disabled={busy} onFile={(f) => up(f, (u) => setBanners(banners.map((x, k) => (k === i ? { ...x, image: u } : x))))} />
            <input className={`${inp} min-w-40 flex-1`} placeholder="Ссылка (необязательно)" value={b.href ?? ''} onChange={(e) => setBanners(banners.map((x, k) => (k === i ? { ...x, href: e.target.value } : x)))} />
            <button type="button" aria-label="Выше" onClick={() => move(i, -1)} className={ghost}>↑</button>
            <button type="button" aria-label="Ниже" onClick={() => move(i, 1)} className={ghost}>↓</button>
            <button type="button" aria-label="Удалить" onClick={() => setBanners(banners.filter((_, k) => k !== i))} className={ghost}>✕</button>
          </div>
        ))}
        {banners.length < 10 && <button type="button" onClick={() => setBanners([...banners, { image: '', href: '' }])} className="h-12 px-2 font-bold text-accent">+ Добавить баннер</button>}
        {!banners.length && <p className="text-xs text-mute">Баннеров нет: на сайте показывается зелёная заглушка с названием.</p>}
      </div>

      <div className={box}>
        <H hint="Необязательно. Широкая картинка под заголовком секции (например, «Роллы до 399 ₽»).">Баннеры секций меню</H>
        {['Новинки', ...categories].map((name) => { const k = name.toLowerCase(); return (
          <div key={k} className="flex items-center gap-3">
            <Thumb url={ci[k]} wide /><b className="min-w-0 flex-1 truncate">{name}</b>
            <Pick label={ci[k] ? 'Заменить' : 'Загрузить'} disabled={busy} onFile={(f) => up(f, (u) => setCi({ ...ci, [k]: u }))} />
            {ci[k] && <button type="button" aria-label="Убрать" onClick={() => { const n = { ...ci }; delete n[k]; setCi(n); }} className={ghost}>✕</button>}
          </div>
        ); })}
      </div>

      <div className={box}>
        <H hint="Абзацы разделяйте пустой строкой.">Блок «о нас»</H>
        <input className={inp} placeholder="Заголовок" value={a.title} onChange={(e) => setA({ ...a, title: e.target.value })} />
        <textarea className={area} rows={10} placeholder="Текст" value={a.blocks} onChange={(e) => setA({ ...a, blocks: e.target.value })} />
        <input className={inp} placeholder="Заголовок списка" value={a.listTitle} onChange={(e) => setA({ ...a, listTitle: e.target.value })} />
        <textarea className={area} rows={6} placeholder="Пункты списка, каждый с новой строки" value={a.list} onChange={(e) => setA({ ...a, list: e.target.value })} />
        <textarea className={area} rows={3} placeholder="Заключительный абзац" value={a.outro} onChange={(e) => setA({ ...a, outro: e.target.value })} />
      </div>

      <div className={box}>
        <H hint="Ссылка из Яндекс.Карт или Google Maps: «Поделиться» → «Вставить карту», скопируйте адрес из атрибута src. Пусто = карты нет.">Карта внизу страницы</H>
        <input className={inp} placeholder="https://..." value={map} onChange={(e) => setMap(e.target.value)} />
      </div>
      <button disabled={busy} className="h-14 w-full rounded-full bg-brand text-lg font-black text-white shadow-soft disabled:opacity-50">{busy ? 'Загружаем…' : 'Сохранить'}</button>
    </form>
  );
}
