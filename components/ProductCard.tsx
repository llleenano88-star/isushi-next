'use client';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/store/cart';
import { cleanOptions } from '@/lib/options';
import { ChoiceIcon } from './PepperIcon';
import Badges from './Badges';

export type Product = { id: string; category_id?: string; name: string; description: string | null; image_url: string | null; is_new: boolean; variants: { label: string; price: number }[]; options?: unknown; is_spicy?: boolean; is_hit?: boolean; is_promo?: boolean };

// Фото показываем только в самом меню (в окне выбора количества и в корзине фото нет)
function Photo({ url, className }: { url: string | null; className: string }) {
  return (
    <div className={`bg-cover bg-center ${url ? 'bg-white' : 'grid place-items-center bg-blush'} ${className}`} style={url ? { backgroundImage: `url(${url})` } : undefined}>
      {!url && <span className="text-5xl opacity-70" aria-hidden>🍣</span>}
    </div>
  );
}

export default function ProductCard({ p }: { p: Product }) {
  const add = useCart((s) => s.add); const setQty = useCart((s) => s.setQty); const items = useCart((s) => s.items);
  const [m, setM] = useState(false); useEffect(() => setM(true), []);
  const [open, setOpen] = useState(false); const [flash, setFlash] = useState('');
  const groups = cleanOptions(p.options); const hasOpts = groups.length > 0;
  const [sel, setSel] = useState<string[]>([]); // выбранные значения по группам (по порядку)
  const picked = hasOpts && groups.every((_, gi) => !!sel[gi]);
  const single = p.variants.length === 1 && !hasOpts; const v0 = p.variants[0]; const min = Math.min(...p.variants.map((v) => v.price));
  const line = single && m ? items.find((i) => i.key === `${p.id}:${v0.label}`) : undefined;
  const put = (v: { label: string; price: number }) => add({ productId: p.id, name: p.name, label: v.label, price: v.price, image: p.image_url, categoryId: p.category_id ?? null, isPromo: !!p.is_promo, ...(hasOpts ? { choices: groups.map((_, gi) => sel[gi]) } : {}) });

  const pill = 'flex h-12 w-full items-center justify-center rounded-full bg-blush text-base font-extrabold text-accent transition ease-spring active:scale-95';
  const control = single && line ? (
    <div className="flex h-12 items-center justify-between rounded-full bg-brand text-white">
      <button onClick={() => setQty(line.key, line.qty - 1)} aria-label="Меньше" className="h-12 w-12 text-2xl font-black">−</button>
      <b>{line.qty}</b>
      <button onClick={() => setQty(line.key, line.qty + 1)} aria-label="Больше" className="h-12 w-12 text-2xl font-black">+</button>
    </div>
  ) : single ? (
    <button onClick={() => put(v0)} className={pill}>{v0.price} ₽</button>
  ) : (
    <button onClick={() => setOpen(true)} className={pill}>от {min} ₽</button>
  );

  const badges = <Badges hit={p.is_hit} spicy={p.is_spicy} isNew={p.is_new} promo={p.is_promo} />;
  return (
    <>
      <article id={`p-${p.id}`} className="flex gap-4 md:flex-col md:gap-0">
        <div className="hidden min-h-7 md:mb-3 md:block">{badges}</div>
        <div role="button" tabIndex={0} aria-label={p.name} onClick={() => setOpen(true)} onKeyDown={(e) => e.key === 'Enter' && setOpen(true)} className="w-[42%] shrink-0 cursor-pointer self-start md:w-full">
          <Photo url={p.image_url} className="aspect-square w-full rounded-[22px] rounded-br-[44px] md:rounded-[24px] md:rounded-br-[48px]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col md:mt-3">
          <div className="mb-2 md:hidden">{badges}</div>
          <div role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(e) => e.key === 'Enter' && setOpen(true)} className="cursor-pointer">
            <h3 className="text-[19px] font-extrabold leading-tight md:line-clamp-2 md:text-lg">{p.name}</h3>
            <p className="mt-1.5 line-clamp-4 text-sm leading-snug text-mute md:line-clamp-2">{p.description}</p>
          </div>
          <div className="mt-auto pt-3">{control}</div>
        </div>
      </article>
      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label={p.name} className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-t-[32px] bg-bg pb-[calc(16px+env(safe-area-inset-bottom))] shadow-soft">
            <div className="flex items-start justify-between gap-3 p-5 pb-0">
              <div className="min-w-0 space-y-2">{badges}<h2 className="text-2xl font-extrabold leading-tight">{p.name}</h2></div>
              <button onClick={() => setOpen(false)} aria-label="Закрыть" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blush text-lg">✕</button>
            </div>
            <div className="space-y-3 p-5">
              {p.description && <p className="text-sm leading-relaxed text-mute">{p.description}</p>}
              {groups.map((g, gi) => (
                <div key={gi}>
                  {g.title && <p className="mb-1.5 text-sm font-extrabold">{g.title}</p>}
                  <div className="flex flex-wrap gap-2">
                    {g.choices.map((c) => (
                      <button key={c} type="button" aria-pressed={sel[gi] === c} onClick={() => setSel((o) => { const n = [...o]; n[gi] = c; return n; })}
                        className={`flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ease-spring active:scale-95 ${sel[gi] === c ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>
                        <ChoiceIcon text={c} />{c}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {hasOpts && !picked && <p className="text-xs text-mute">Выберите вариант, чтобы добавить в корзину</p>}
              <div className={`grid gap-2 ${p.variants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {p.variants.map((v) => (
                  <button key={v.label} disabled={hasOpts && !picked} onClick={() => { put(v); setFlash(v.label); setTimeout(() => setFlash(''), 900); }} className="min-h-12 rounded-full bg-brand px-3 py-1.5 text-sm font-extrabold leading-tight text-white transition ease-spring active:scale-95 disabled:opacity-40">
                    {flash === v.label ? '✓ Добавлено' : <><span className="block uppercase">{v.label}</span><span className="block">{v.price} ₽</span></>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
