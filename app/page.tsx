import { Suspense } from 'react';
import Banners from '@/components/Banners';
import MenuSection, { MenuSkeleton } from '@/components/MenuSection';
import CartSection from '@/components/CartSection';
import DeliveryMap from '@/components/DeliveryMap';
import PromoStrip from '@/components/PromoStrip';
import QuestionsBlock from '@/components/QuestionsBlock';
import { getSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/site';
export const revalidate = 60;

export default async function Home() {
  const { banners, categoryImages, categoryImagesMobile, categoryIcons, bannerIntervalMs, about, mapEmbed, cart, questions } = await getSettings();
  // Разметка для поисковиков: ресторан, ссылка на меню и на заказ
  const ld = {
    '@context': 'https://schema.org', '@type': 'Restaurant', name: 'iSushiClub', url: SITE_URL, image: `${SITE_URL}/icons/512.png`,
    telephone: `+7${cart.phone.replace(/\D/g, '').slice(1)}`, servesCuisine: ['Суши', 'Роллы', 'Пицца'], hasMenu: `${SITE_URL}/menu`,
    address: { '@type': 'PostalAddress', addressLocality: 'Самара', addressCountry: 'RU' },
    potentialAction: { '@type': 'OrderAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/menu` } },
  };
  return (
    <div className="py-2 md:py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, '\\u003c') }} />
      <Banners banners={banners} intervalMs={bannerIntervalMs} />
      <PromoStrip promos={cart.promos} />
      <div id="menu" className="mt-4 scroll-mt-24" />
      <Suspense fallback={<MenuSkeleton />}><MenuSection categoryImages={categoryImages} categoryImagesMobile={categoryImagesMobile} categoryIcons={categoryIcons} /></Suspense>
      <CartSection settings={cart} />
      <section className="rounded-[28px] bg-blush/60 p-6 sm:p-10">
        <h2 className="mb-4 text-center text-3xl font-extrabold">{about.title}</h2>
        <div className="mx-auto max-w-3xl space-y-3 text-sm leading-relaxed">
          {about.blocks?.map((t, i) => <p key={i} className={i === 0 ? 'font-bold' : ''}>{t}</p>)}
          {about.list?.length > 0 && <><p className="font-bold">{about.listTitle}</p><ul className="list-disc space-y-1 pl-6">{about.list.map((t) => <li key={t}>{t}</li>)}</ul></>}
          {about.outro && <p>{about.outro}</p>}
        </div>
      </section>
      <DeliveryMap settings={cart} />
      <QuestionsBlock q={questions} />
      {mapEmbed && <iframe src={mapEmbed} title="Карта" loading="lazy" className="mt-6 h-72 w-full rounded-[28px] border-0" />}
    </div>
  );
}
