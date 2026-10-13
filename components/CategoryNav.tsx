'use client';
import { useEffect, useRef, useState } from 'react';

export default function CategoryNav({ items }: { items: { id: string; name: string }[] }) {
  const [active, setActive] = useState(items[0]?.id); const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const on = () => {
      let cur = items[0]?.id;
      for (const it of items) { const el = document.getElementById(it.id); if (el && el.getBoundingClientRect().top <= 150) cur = it.id; }
      setActive(cur);
    };
    on(); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on);
  }, [items]);
  useEffect(() => { // подвинуть активную кнопку в центр ряда
    const n = nav.current; const b = n?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (n && b) n.scrollTo({ left: b.offsetLeft - n.clientWidth / 2 + b.clientWidth / 2, behavior: 'smooth' });
  }, [active]);
  return (
    <nav ref={nav} className="sticky top-[calc(64px+env(safe-area-inset-top))] z-30 -mx-4 flex gap-2 overflow-x-auto bg-bg/90 px-4 py-2 backdrop-blur [scrollbar-width:none]">
      {items.map((it) => (
        <a key={it.id} href={`#${it.id}`} data-id={it.id} className={`flex h-10 shrink-0 items-center rounded-full px-5 text-sm font-bold transition-colors ${active === it.id ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>{it.name}</a>
      ))}
    </nav>
  );
}
