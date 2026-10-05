import { Suspense } from 'react';
import MenuSection, { MenuSkeleton } from '@/components/MenuSection';
export const revalidate = 60;
export default function Home() {
  return (
    <>
      <section className="my-4 rounded-[32px] bg-brand p-6 text-black shadow-soft sm:p-10">
        <h1 className="text-3xl font-black leading-tight sm:text-5xl">Свежие суши<br />с доставкой к вам</h1>
        <p className="mt-2 max-w-md text-sm font-semibold sm:text-base">Выберите роллы и сеты и оформите заказ за минуту, без регистрации.</p>
        <a href="#menu" className="mt-5 inline-flex h-12 items-center rounded-full bg-black px-8 font-black text-white">Смотреть меню</a>
      </section>
      <div id="menu" className="scroll-mt-16" />
      <Suspense fallback={<MenuSkeleton />}><MenuSection /></Suspense>
    </>
  );
}
