'use client';
import { useEffect } from 'react';
import { useUI } from '@/lib/store/ui';

// Окно «Меню:» с категориями (открывается по кнопке «Меню» внизу и в шапке)
export default function MenuModal({ items }: { items: { id: string; name: string; thumb: string }[] }) {
  const open = useUI((s) => s.menuOpen); const setOpen = useUI((s) => s.setMenuOpen);
  useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); addEventListener('keydown', h); return () => removeEventListener('keydown', h); }, [open, setOpen]);
  if (!open) return null;
  const go = (id: string) => { setOpen(false); setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); };
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/45" onClick={() => setOpen(false)} />
      <div role="dialog" aria-label="Меню" className="fixed inset-x-3 top-1/2 z-[90] mx-auto max-h-[86vh] max-w-4xl -translate-y-1/2 overflow-y-auto rounded-[28px] bg-bg px-4 pb-5 pt-4 shadow-soft sm:px-6">
        <div className="relative mb-3 border-b border-black/5 pb-3 text-center">
          <h2 className="text-xl font-semibold">Меню:</h2>
          <button onClick={() => setOpen(false)} aria-label="Закрыть" className="absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-2xl text-accent">✕</button>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {items.map((it) => (
            <button key={it.id} onClick={() => go(it.id)} className="flex flex-col items-center gap-1.5 rounded-2xl border border-black/20 bg-card px-2 pb-3 pt-2.5 text-center transition-colors active:bg-blush">
              <span className="grid aspect-square w-full max-w-[104px] place-items-center overflow-hidden rounded-xl bg-blush bg-cover bg-center" style={it.thumb ? { backgroundImage: `url(${it.thumb})` } : undefined}>{!it.thumb && <span className="text-3xl" aria-hidden>🍣</span>}</span>
              <span className="text-[13px] font-semibold leading-tight">{it.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
