'use client';
import { useState } from 'react';
import { useCart } from '@/lib/store/cart';

export type Product = { id: string; name: string; description: string | null; image_url: string | null; is_new: boolean; variants: { label: string; price: number }[] };

function Photo({ url, className }: { url: string | null; className: string }) {
  return (
    <div className={`bg-cover bg-center ${url ? '' : 'grid place-items-center bg-orange-100 dark:bg-white/10'} ${className}`} style={url ? { backgroundImage: `url(${url})` } : undefined}>
      {!url && <span className="text-5xl opacity-70" aria-hidden>🍣</span>}
    </div>
  );
}

export default function ProductCard({ p }: { p: Product }) {
  const add = useCart((s) => s.add); const [open, setOpen] = useState(false); const [flash, setFlash] = useState('');
  const buy = (e: React.MouseEvent, v: { label: string; price: number }) => {
    e.stopPropagation(); add({ productId: p.id, name: p.name, label: v.label, price: v.price });
    setFlash(v.label); setTimeout(() => setFlash(''), 900);
  };
  const buttons = (
    <div className="flex flex-wrap gap-2">
      {p.variants.map((v) => (
        <button key={v.label} onClick={(e) => buy(e, v)} className="min-h-12 flex-1 rounded-full bg-brand px-4 text-sm font-extrabold text-black shadow-soft transition ease-spring active:scale-95">
          {flash === v.label ? '✓ Добавлено' : `${v.label} · ${v.price} ₽`}
        </button>
      ))}
    </div>
  );
  return (
    <>
      <article role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(e) => e.key === 'Enter' && setOpen(true)} className="relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[24px] bg-card shadow-soft">
        {p.is_new && <span className="absolute left-4 top-4 z-10 rounded-full bg-brand px-3 py-1 text-[10px] font-black text-black">НОВИНКА</span>}
        <Photo url={p.image_url} className="m-2 h-40 rounded-[16px]" />
        <div className="flex flex-1 flex-col gap-1 px-4 pb-4">
          <h3 className="text-[17px] font-black leading-tight">{p.name}</h3>
          <p className="line-clamp-2 text-xs leading-snug text-mute">{p.description}</p>
          <div className="mt-auto pt-3">{buttons}</div>
        </div>
      </article>
      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label={p.name} className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-t-[32px] bg-bg pb-[calc(16px+env(safe-area-inset-bottom))] shadow-soft">
            <div className="relative">
              <Photo url={p.image_url} className="h-64 w-full" />
              <button onClick={() => setOpen(false)} aria-label="Закрыть" className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full bg-card text-xl shadow-soft">✕</button>
            </div>
            <div className="space-y-3 p-5">
              <h2 className="text-2xl font-black leading-tight">{p.name}</h2>
              {p.description && <p className="text-sm leading-relaxed text-mute">{p.description}</p>}
              {buttons}
            </div>
          </div>
        </>
      )}
    </>
  );
}
