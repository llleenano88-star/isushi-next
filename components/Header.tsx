'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart, selectCount, selectTotal } from '@/lib/store/cart';
import { useUI } from '@/lib/store/ui';
import CartBadge from './CartBadge';

const Ico = ({ children }: { children: React.ReactNode }) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>;
const Logo = () => <Link href="/" className="text-2xl font-black tracking-wide">ISUSHI<span className="text-accent">CLUB</span></Link>;

export default function Header({ phone }: { phone?: string }) {
  const [m, setM] = useState(false); useEffect(() => setM(true), []);
  const rawCount = useCart(selectCount); const rawTotal = useCart(selectTotal); const setSearchOpen = useUI((s) => s.setSearchOpen);
  const count = m ? rawCount : 0; const total = m ? rawTotal : 0; const tel = (phone ?? '').replace(/[^\d+]/g, '');
  const link = 'flex items-center gap-2 font-semibold text-ink transition-colors hover:text-accent';
  return (
    <header className="z-40 bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur md:sticky md:top-0">
      {/* телефон: логотип по центру, справа трубка */}
      <div className="relative flex h-20 items-center justify-center md:hidden">
        <Logo />
        {tel && <a href={`tel:${tel}`} aria-label="Позвонить" className="absolute right-5 text-ink"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg></a>}
      </div>
      {/* компьютер */}
      <div className="mx-auto hidden h-[72px] max-w-7xl items-center gap-8 px-4 md:flex">
        <Logo />
        <nav className="flex items-center gap-7 text-[15px]">
          <Link href="/#menu" className={link}><Ico><circle cx="5" cy="5" r="1.6" /><circle cx="12" cy="5" r="1.6" /><circle cx="19" cy="5" r="1.6" /><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /><circle cx="5" cy="19" r="1.6" /><circle cx="12" cy="19" r="1.6" /><circle cx="19" cy="19" r="1.6" /></Ico>Меню</Link>
          {tel && <a href={`tel:${tel}`} className={link}><Ico><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></Ico>Контакты</a>}
          <button onClick={() => setSearchOpen(true)} className={link}><Ico><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Ico>Поиск</button>
          <Link href="/#promos" className={link}>Акции</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/account" className="flex h-12 items-center gap-2 rounded-full bg-black/5 px-6 text-[15px] font-bold text-mute">Кабинет<Ico><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Ico></Link>
          <Link href="/#cart" aria-label="Корзина" className="flex h-12 items-center gap-2 rounded-full bg-brand px-6 text-[15px] font-extrabold text-white">
            Корзина{count > 0 && <span>· {total} ₽</span>}
            <span className="relative flex"><Ico><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></Ico><CartBadge count={count} /></span>
          </Link>
        </div>
      </div>
    </header>
  );
}
