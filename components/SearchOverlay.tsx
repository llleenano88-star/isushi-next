'use client';
import { useEffect, useRef } from 'react';
import { useUI } from '@/lib/store/ui';

// Поиск по меню: пока в поле есть текст, в меню остаются только подходящие блюда
export default function SearchOverlay() {
  const open = useUI((s) => s.searchOpen); const q = useUI((s) => s.query); const setQ = useUI((s) => s.setQuery); const setOpen = useUI((s) => s.setSearchOpen);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { ref.current?.focus(); document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' }); } }, [open]);
  if (!open && !q) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[75] bg-bg/95 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] shadow-soft backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <input ref={ref} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти блюдо: ролл, пицца, соус…" aria-label="Поиск по меню" className="h-12 min-w-0 flex-1 rounded-full bg-blush px-5 text-base font-semibold outline-none focus:ring-2 focus:ring-accent" />
        <button onClick={() => { setQ(''); setOpen(false); }} className="h-12 shrink-0 rounded-full bg-brand px-5 text-sm font-bold text-white">Закрыть</button>
      </div>
    </div>
  );
}
