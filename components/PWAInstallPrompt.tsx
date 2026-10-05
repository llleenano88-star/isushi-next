'use client';
import { useEffect, useState } from 'react';
export default function PWAInstallPrompt() {
  const [ev, setEv] = useState<any>(null); const [ios, setIos] = useState(false); const [hide, setHide] = useState(true);
  useEffect(() => {
    if (matchMedia('(display-mode: standalone)').matches || localStorage.getItem('pwa-dismissed')) return;
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent)); setHide(false);
    const h = (e: Event) => { e.preventDefault(); setEv(e); };
    addEventListener('beforeinstallprompt', h); return () => removeEventListener('beforeinstallprompt', h);
  }, []);
  if (hide || (!ev && !ios)) return null;
  const close = () => { localStorage.setItem('pwa-dismissed', '1'); setHide(true); };
  return (
    <div className="mt-6 flex items-center gap-3 rounded-[24px] bg-card p-4 shadow-soft">
      <p className="flex-1 text-sm font-semibold">{ios ? 'Установите приложение: «Поделиться» → «На экран Домой»' : 'Установите iSushiClub на телефон'}</p>
      {ev && <button onClick={() => ev.prompt()} className="h-12 rounded-full bg-brand px-5 font-black text-black">Установить</button>}
      <button onClick={close} aria-label="Закрыть" className="h-12 w-12">✕</button>
    </div>
  );
}
