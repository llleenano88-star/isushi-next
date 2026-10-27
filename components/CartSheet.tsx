'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart, selectCount, selectTotal } from '@/lib/store/cart';
// Плавающая кнопка на телефоне: ведёт к корзине на главной странице
export default function CartSheet() {
  const [m, setM] = useState(false); useEffect(() => setM(true), []);
  const count = useCart(selectCount); const total = useCart(selectTotal);
  if (!m || !count) return null;
  return (
    <Link href="/#cart" className="fixed inset-x-4 bottom-[calc(108px+env(safe-area-inset-bottom))] z-40 mx-auto flex h-14 max-w-md items-center justify-between rounded-full bg-brand px-6 font-black text-white shadow-soft md:hidden">
      <span>Корзина · {count}</span><span>{total} ₽</span>
    </Link>
  );
}
