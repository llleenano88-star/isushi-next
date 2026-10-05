import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import CartSheet from '@/components/CartSheet';
import ScrollTop from '@/components/ScrollTop';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

const font = Montserrat({ subsets: ['latin', 'cyrillic'], weight: ['400','500','600','700','800','900'], variable: '--font-montserrat' });

export const metadata: Metadata = { title: 'iSushiClub — доставка суши', manifest: '/manifest.json', appleWebApp: { capable: true, title: 'iSushi' } };
export const viewport: Viewport = { themeColor: '#ff862b', viewportFit: 'cover' };

// Применяется до рендера: тёмная тема без вспышки
const themeScript = `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark-theme')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={font.variable} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className="font-sans antialiased">
        <Header />
        <main className="mx-auto max-w-5xl px-4">{children}<PWAInstallPrompt /></main>
        <ScrollTop />
        <CartSheet />
        <BottomNav />
      </body>
    </html>
  );
}
