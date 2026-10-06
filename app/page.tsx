import { Suspense } from 'react';
import MenuSection, { MenuSkeleton } from '@/components/MenuSection';
export const revalidate = 60;
export default function Home() {
  return (
    <>
      <section className="relative my-4 overflow-hidden rounded-[32px] bg-card px-6 py-10 shadow-soft sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blush" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-[#dfe8bf] dark:bg-[#2f3a1c]" />
        <div className="pointer-events-none absolute bottom-10 right-4 h-20 w-20 rounded-full bg-wine" />
        <h1 className="relative font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-accent sm:text-7xl">
          Свежие суши<br /><span className="text-ink">с доставкой<br />к вам</span>
        </h1>
        <p className="relative mt-4 max-w-xs text-sm font-bold uppercase tracking-wide">Роллы, сеты и нигири. Заказ за минуту</p>
        <a href="#menu" className="relative mt-6 inline-flex h-14 items-center rounded-full bg-brand px-8 font-black text-white shadow-soft">Смотреть меню →</a>
      </section>
      <div id="menu" className="scroll-mt-32" />
      <Suspense fallback={<MenuSkeleton />}><MenuSection /></Suspense>
    </>
  );
}
