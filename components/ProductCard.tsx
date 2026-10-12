'use client';
import { useState } from 'react';
import { useCart } from '@/lib/store/cart';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_new: boolean;
  variants: { label: string; price: number }[];
};

function Photo({ url, className }: { url: string | null; className: string }) {
  return (
    <div
      className={`bg-cover bg-center ${url ? 'bg-white' : 'grid place-items-center bg-blush'} ${className}`}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    >
      {!url && <span className="text-4xl opacity-70" aria-hidden>🍣</span>}
    </div>
  );
}

export default function ProductCard({ p }: { p: Product }) {
  const add = useCart((s) => s.add);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState('');

  const buy = (e: React.MouseEvent, v: { label: string; price: number }) => {
    e.stopPropagation();
    add({ productId: p.id, name: p.name, label: v.label, price: v.price, image: p.image_url });
    setFlash(v.label);
    setTimeout(() => setFlash(''), 900);
  };

  const buttons = (
    <div className={`grid gap-2 ${p.variants.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {p.variants.map((v) => (
        <button
          key={v.label}
          onClick={(e) => buy(e, v)}
          className="min-h-12 rounded-full bg-brand px-3 py-1.5 text-sm font-extrabold leading-tight text-white transition ease-spring active:scale-95"
        >
          {flash === v.label ? (
            '✓ Добавлено'
          ) : (
            <>
              <span className="block uppercase">{v.label}</span>
              <span className="block">{v.price}₽</span>
            </>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
        className="relative flex cursor-pointer gap-4"
      >
        {p.is_new && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-wine px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
            Новинка
          </span>
        )}
        <Photo url={p.image_url} className="aspect-square w-28 shrink-0 rounded-2xl shadow-soft sm:w-36" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
          <h3 className="text-[15px] font-extrabold leading-tight">{p.name}</h3>
          <p className="line-clamp-2 text-xs leading-snug text-mute">{p.description}</p>
          <div className="mt-auto pt-2">{buttons}</div>
        </div>
      </article>

      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label={p.name}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-t-[32px] bg-bg pb-[calc(16px+env(safe-area-inset-bottom))] shadow-soft"
          >
            <div className="relative">
              <Photo url={p.image_url} className="h-64 w-full" />
              <button
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
                className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full bg-card text-xl shadow-soft"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3 p-5">
              <h2 className="text-2xl font-extrabold leading-tight">{p.name}</h2>
              {p.description && <p className="text-sm leading-relaxed text-mute">{p.description}</p>}
              {buttons}
            </div>
          </div>
        </>
      )}
    </>
  );
}