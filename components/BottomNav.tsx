'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart, selectCount } from '@/lib/store/cart';
import CartBadge from './CartBadge';

const I = ({ children }: { children: React.ReactNode }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);
const MenuIcon = () => <I><path d="M3 12h18a9 9 0 0 1-18 0z" /><path d="M8 3l5 6M12 2l5 7" /></I>;
const CartIcon = () => <I><path d="M3 4h2l2.4 11h10.2L20 7H6" /><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /></I>;
const OrdersIcon = () => <I><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></I>;
const UserIcon = () => <I><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></I>;

export default function BottomNav() {
  const raw = useCart(selectCount); const [m, setM] = useState(false); useEffect(() => setM(true), []); const count = m ? raw : 0;
  const path = usePathname();
  const cls = (on: boolean) => `flex min-h-14 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold transition-colors ${on ? 'text-accent' : 'text-mute'}`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-black/5 bg-card pb-[env(safe-area-inset-bottom)]">
      <Link href="/" className={cls(path === '/')}><MenuIcon />Меню</Link>
      <Link href="/#cart" className={cls(false)}>
        <span className="relative flex"><CartIcon /><CartBadge count={count} /></span>Корзина
      </Link>
      <Link href="/account" className={cls(path.startsWith('/account'))}><OrdersIcon />Заказы</Link>
      <Link href="/login" className={cls(path.startsWith('/login'))}><UserIcon />Профиль</Link>
    </nav>
  );
}
