'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart, selectCount } from '@/lib/store/cart';
import { useUI } from '@/lib/store/ui';
import CartBadge from './CartBadge';

const I = ({ children }: { children: React.ReactNode }) => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);
const MenuIcon = () => <I>{[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.7" />))}</I>;
const SearchIcon = () => <I><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></I>;
const CartIcon = () => <I><path d="M5 8h14l-1 12H6z" /><path d="M9 8a3 3 0 0 1 6 0" /></I>;
const UserIcon = () => <I><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></I>;

// Нижняя панель на телефоне: тёмная плавающая, по центру круглый значок «наверх / на главную»
export default function BottomNav() {
  const raw = useCart(selectCount); const [m, setM] = useState(false); useEffect(() => setM(true), []); const count = m ? raw : 0;
  const path = usePathname(); const setSearchOpen = useUI((s) => s.setSearchOpen);
  const item = 'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[12px] font-bold uppercase tracking-wide text-[#a7acb4] transition-colors';
  return (
    <nav aria-label="Основное меню" className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-50 flex items-center rounded-[28px] bg-[#16191d] px-2 text-white shadow-soft md:hidden">
      <Link href="/#menu" className={`${item} ${path === '/' ? 'text-white' : ''}`}><MenuIcon />Меню</Link>
      <button type="button" onClick={() => setSearchOpen(true)} className={item}><SearchIcon />Поиск</button>
      <Link href="/" aria-label="На главную" onClick={() => typeof window !== 'undefined' && window.scrollTo({ top: 0, behavior: 'smooth' })} className="mx-1 grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full bg-[#16191d] ring-[3px] ring-[#ee3f9a]">
        <span className="grid h-[54px] w-[54px] place-items-center rounded-full bg-brand text-xl font-black">iS</span>
      </Link>
      <Link href="/#cart" className={item}><span className="relative flex"><CartIcon /><CartBadge count={count} /></span>Корзина</Link>
      <Link href="/account" className={`${item} ${path.startsWith('/account') || path.startsWith('/login') ? 'text-white' : ''}`}><UserIcon />Кабинет</Link>
    </nav>
  );
}
