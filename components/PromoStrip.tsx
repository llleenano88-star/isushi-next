'use client';
import { useState } from 'react';
import type { Promotion } from '@/lib/promotions';
import { scheduleText } from '@/lib/promotions';

// Полоса «Акции» под баннерами: карточки с условиями и временем действия
export default function PromoStrip({ promos }: { promos: Promotion[] }) {
  const [open, setOpen] = useState<Promotion | null>(null);
  if (!promos.length) return null;
  return (
    <section id="promos" className="scroll-mt-24 pt-6">
      <h2 className="text-3xl font-extrabold text-accent">Акции</h2>
      <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {promos.map((p) => {
          const when = scheduleText(p);
          return (
            <button key={p.id} onClick={() => setOpen(p)} className="relative flex min-h-[148px] w-[78%] shrink-0 flex-col justify-end overflow-hidden rounded-[24px] bg-blush bg-cover bg-center p-4 text-left sm:w-[320px]" style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}>
              {p.image && <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden />}
              <span className={`relative text-lg font-extrabold leading-tight ${p.image ? 'text-white' : 'text-accent'}`}>{p.title}</span>
              {when && <span className={`relative mt-1 text-xs font-bold ${p.image ? 'text-white/90' : 'text-ink'}`}>{when}</span>}
            </button>
          );
        })}
      </div>
      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(null)} />
          <div role="dialog" aria-label={open.title} className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[85vh] max-w-lg overflow-y-auto rounded-t-[32px] bg-bg p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-2xl font-extrabold leading-tight">{open.title}</h3>
              <button onClick={() => setOpen(null)} aria-label="Закрыть" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blush text-lg">✕</button>
            </div>
            {scheduleText(open) && <p className="mt-2 inline-block rounded-full bg-blush px-3 py-1 text-sm font-bold text-accent">{scheduleText(open)}</p>}
            {open.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{open.description}</p>}
            <a href="#menu" onClick={() => setOpen(null)} className="mt-5 flex h-12 items-center justify-center rounded-full bg-brand font-bold text-white">Выбрать блюда</a>
          </div>
        </>
      )}
    </section>
  );
}
