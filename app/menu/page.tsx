import { Suspense } from 'react';
import type { Metadata } from 'next';
import MenuSection, { MenuSkeleton } from '@/components/MenuSection';
import CartSection from '@/components/CartSection';
import { getSettings } from '@/lib/settings';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Меню — iSushiClub: роллы, суши, пицца с доставкой',
  description: 'Смотреть меню iSushiClub: роллы, суши, пицца, вок, бургеры, горячее и напитки. Доставка и самовывоз, оформление заказа онлайн.',
  alternates: { canonical: '/menu' },
};

// Отдельная страница меню: на неё удобно ссылаться (в поиске, соцсетях, Яндекс Бизнесе)
export default async function MenuPage() {
  const { categoryImages, categoryImagesMobile, categoryIcons, cart } = await getSettings();
  return (
    <div className="py-2 md:py-4">
      <h1 className="sr-only">Меню iSushiClub</h1>
      <div id="menu" className="scroll-mt-24" />
      <Suspense fallback={<MenuSkeleton />}><MenuSection categoryImages={categoryImages} categoryImagesMobile={categoryImagesMobile} categoryIcons={categoryIcons} /></Suspense>
      <CartSection settings={cart} />
    </div>
  );
}
