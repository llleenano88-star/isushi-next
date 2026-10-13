'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart, selectCount, selectTotal } from '@/lib/store/cart';
import CartBadge from './CartBadge';

export default function Header() {
  const [m, setM] = useState(false); useEffect(() => setM(true), []);
  const rawCount = useCart(selectCount); const rawTotal = useCart(selectTotal);
  const count = m ? rawCount : 0; const total = m ? rawTotal : 0;
  return (
    <header className="sticky top-0 z-40 bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="text-xl font-extrabold tracking-wide">ISUSHI<span className="text-accent">CLUB</span></Link>
        <nav className="hidden items-center gap-6 text-sm font-bold md:flex">
          <Link href="/#menu">Меню</Link><Link href="/account">Заказы</Link><Link href="/login">Профиль</Link>
        </nav>
        <div className="ml-auto">
          <Link href="/#cart" aria-label="Корзина" className="flex h-11 items-center gap-3 rounded-full bg-brand px-4 text-sm font-extrabold text-white">
            <span className="relative flex">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>
              <CartBadge count={count} />
            </span>
            <span className="hidden sm:inline">Корзина</span>{count > 0 && <span>{total} ₽</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
