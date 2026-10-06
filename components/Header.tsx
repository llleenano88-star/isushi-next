'use client';
import { useEffect, useState } from 'react';
import { useCart, selectCount } from '@/lib/store/cart';

export default function Header() {
  const [dark, setDark] = useState(false); const count = useCart(selectCount); const setOpen = useCart((s) => s.setOpen);
  useEffect(() => setDark(document.documentElement.classList.contains('dark-theme')), []);
  const toggle = () => {
    const v = document.documentElement.classList.toggle('dark-theme');
    setDark(v); try { localStorage.setItem('theme', v ? 'dark' : 'light'); } catch {}
  };
  const round = 'relative grid h-12 w-12 place-items-center rounded-full text-lg';
  return (
    <header className="sticky top-0 z-40 bg-bg/90 pb-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto w-fit rounded-b-2xl bg-wine px-5 py-1 text-[11px] font-bold text-white">Заказ за минуту, без регистрации</div>
      <div className="mx-auto mt-2 max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between rounded-full bg-card px-1 shadow-soft">
          <button onClick={() => setOpen(true)} aria-label="Корзина" className={round}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>
            {count > 0 && <b className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-wine px-1 text-[11px] text-white">{count}</b>}
          </button>
          <span className="text-center font-display text-xl font-bold uppercase leading-[0.9] text-accent">iSushi<br /><span className="text-ink">Club</span></span>
          <button onClick={toggle} aria-label="Сменить тему" className={round}>{dark ? '☀️' : '🌙'}</button>
        </div>
      </div>
    </header>
  );
}
