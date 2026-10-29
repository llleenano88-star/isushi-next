'use client';
import { useEffect, useRef, useState } from 'react';

const GAP = 12;
type B = { image: string; mobile?: string; href?: string };
export default function Banners({ banners }: { banners: B[] }) {
  const ref = useRef<HTMLDivElement>(null); const [i, setI] = useState(0); const n = banners.length;
  const step = () => { const s = ref.current?.children[0] as HTMLElement | undefined; return s ? s.offsetWidth + GAP : 0; };
  const go = (k: number) => ref.current?.scrollTo({ left: k * step(), behavior: 'smooth' });
  useEffect(() => { if (n < 2) return; const t = setInterval(() => go((i + 1) % n), 5000); return () => clearInterval(t); }, [i, n]);
  if (!n) return (
    <a href="#menu" className="grid aspect-[4/3] place-items-center rounded-[28px] bg-brand text-center text-white md:aspect-[5/2]">
      <div><div className="text-4xl font-extrabold tracking-wide sm:text-6xl">ISUSHICLUB</div><div className="mt-2 text-sm font-semibold opacity-90 sm:text-lg">Роллы, суши и пицца с доставкой</div></div>
    </a>
  );
  return (
    <div className="relative">
      <div ref={ref} onScroll={(e) => { const st = step(); if (st) setI(Math.round(e.currentTarget.scrollLeft / st)); }}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] before:w-[calc(4%_-_12px)] before:shrink-0 before:content-[''] after:w-[calc(4%_-_12px)] after:shrink-0 after:content-[''] md:before:w-[calc(6%_-_12px)] md:after:w-[calc(6%_-_12px)]">
        {banners.map((b, k) => (
          <a key={k} href={b.href || '#menu'} aria-label={`Баннер ${k + 1}`} className="block aspect-[4/3] w-[92%] shrink-0 snap-center overflow-hidden rounded-[28px] bg-blush sm:aspect-[16/9] md:aspect-[5/2] md:w-[84%]">
            {/* на телефоне своя картинка (если загружена), на компьютере основная */}
            <picture>
              <source media="(min-width: 768px)" srcSet={b.image} />
              <img src={b.mobile || b.image} alt="" draggable={false} className="h-full w-full object-cover" />
            </picture>
          </a>
        ))}
      </div>
      {n > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {banners.map((_, k) => <button key={k} aria-label={`Показать баннер ${k + 1}`} onClick={() => go(k)} className={`h-2.5 rounded-full transition-all ${k === i ? 'w-6 bg-accent' : 'w-2.5 bg-black/20 dark:bg-white/30'}`} />)}
        </div>
      )}
    </div>
  );
}
