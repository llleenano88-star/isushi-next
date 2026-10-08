import { Suspense } from 'react';
import MenuSection, { MenuSkeleton } from '@/components/MenuSection';
import Reviews from '@/components/Reviews';
import { HERO, PROMO } from '@/lib/content';
export const revalidate = 60;

const bg = (u: string) => (u ? { backgroundImage: `url(${u})` } : undefined);
export default function Home() {
  return (
    <>
      <section className="relative my-4 grid items-center gap-6 overflow-hidden rounded-[32px] bg-card px-6 py-10 shadow-soft md:grid-cols-2 md:px-12 md:py-16">
        <div className="relative z-10">
          <h1 className="font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl">{HERO.title}<br /><span className="text-accent">{HERO.accent}</span></h1>
          <p className="mt-4 max-w-sm text-sm font-semibold text-mute sm:text-base">{HERO.text}</p>
          <a href="#menu" className="mt-6 inline-flex h-14 items-center rounded-full bg-brand px-8 font-black text-white shadow-soft">Смотреть меню →</a>
        </div>
        <div className="relative min-h-48 md:min-h-80">
          {HERO.image ? <div className="absolute inset-0 rounded-[28px] bg-cover bg-center" style={bg(HERO.image)} /> : (
            <>
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blush md:h-72 md:w-72" />
              <div className="absolute bottom-0 left-8 h-32 w-32 rounded-full bg-[#dfe8c8] dark:bg-[#2a3a1a] md:h-44 md:w-44" />
              <div className="absolute bottom-6 right-12 h-16 w-16 rounded-full bg-wine" />
            </>
          )}
        </div>
      </section>
      <div id="menu" className="scroll-mt-32" />
      <Suspense fallback={<MenuSkeleton />}><MenuSection /></Suspense>
      <section className="my-10 grid items-center gap-6 rounded-[32px] bg-card p-6 shadow-soft md:grid-cols-2 md:p-10">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-blush bg-cover bg-center" style={bg(PROMO.image)}>
          {!PROMO.image && <span className="absolute inset-0 grid place-items-center text-7xl opacity-60" aria-hidden>🍱</span>}
        </div>
        <div>
          <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{PROMO.title} <span className="text-accent">{PROMO.accent}</span></h2>
          <p className="mt-3 text-sm text-mute">{PROMO.text}</p>
          <a href="#menu" className="mt-5 inline-flex h-12 items-center rounded-full bg-ink px-7 font-black text-bg">Заказать сейчас</a>
        </div>
      </section>
      <Reviews />
    </>
  );
}
