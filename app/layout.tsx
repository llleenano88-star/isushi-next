import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import CartSheet from '@/components/CartSheet';
import ScrollTop from '@/components/ScrollTop';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import ExtrasPrompt from '@/components/ExtrasPrompt';
import SearchOverlay from '@/components/SearchOverlay';
import { getSettings } from '@/lib/settings';
import { SITE_URL } from '@/lib/site';

const font = Montserrat({ subsets: ['latin', 'cyrillic'], weight: ['400', '500', '600', '700', '800', '900'], variable: '--font-montserrat' });

const DESC = 'Заказывайте роллы, суши, пиццу и горячие блюда с доставкой и самовывозом в Самаре. Смотрите меню и акции, оформляйте заказ онлайн.';
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'iSushiClub — доставка роллов, суши и пиццы',
  description: DESC,
  openGraph: { title: 'iSushiClub — доставка роллов, суши и пиццы', description: DESC, url: SITE_URL, siteName: 'iSushiClub', locale: 'ru_RU', type: 'website' },
  manifest: '/manifest.json', appleWebApp: { capable: true, title: 'iSushi' },
};
export const viewport: Viewport = { themeColor: '#d81b7a', viewportFit: 'cover' };

// Тёмной темы нет: сайт всегда светлый
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { cart } = await getSettings();
  return (
    <html lang="ru" className={font.variable}>
      <body className="font-sans antialiased">
        <Header phone={cart.phone} />
        <main className="mx-auto max-w-7xl px-4">{children}<PWAInstallPrompt /></main>
        <ScrollTop />
        <CartSheet />
        <BottomNav />
        <SearchOverlay />
        <ExtrasPrompt extras={cart.extras.filter((e) => e.active)} />
      </body>
    </html>
  );
}
