import { Suspense } from 'react';
import Banners from '@/components/Banners';
import MenuSection, { MenuSkeleton } from '@/components/MenuSection';
import CartSection from '@/components/CartSection';
import { getSettings } from '@/lib/settings';
export const revalidate = 60;

export default async function Home() {
  const { banners, categoryImages, about, mapEmbed } = await getSettings();
  return (
    <div className="py-3">
      <Banners banners={banners} />
      <div id="menu" className="mt-4 scroll-mt-24" />
      <Suspense fallback={<MenuSkeleton />}><MenuSection categoryImages={categoryImages} /></Suspense>
      <CartSection />
      <section className="rounded-[28px] bg-card p-6 shadow-soft sm:p-10">
        <h2 className="mb-4 text-center text-3xl font-extrabold">{about.title}</h2>
        <div className="mx-auto max-w-3xl space-y-3 text-sm leading-relaxed">
          {about.blocks.map((t, i) => <p key={i} className={i === 0 ? 'font-bold' : ''}>{t}</p>)}
          {about.list.length > 0 && <><p className="font-bold">{about.listTitle}</p><ul className="list-disc space-y-1 pl-6">{about.list.map((t) => <li key={t}>{t}</li>)}</ul></>}
          {about.outro && <p>{about.outro}</p>}
        </div>
      </section>
      {mapEmbed && <iframe src={mapEmbed} title="Карта" loading="lazy" className="mt-6 h-72 w-full rounded-[28px] border-0" />}
    </div>
  );
}
