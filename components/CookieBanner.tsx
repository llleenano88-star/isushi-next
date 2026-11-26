'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'cookie_consent';

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem(KEY) !== 'true') setShow(true); } catch { setShow(true); }
  }, []);

  const accept = () => {
    try { localStorage.setItem(KEY, 'true'); } catch {}
    setShow(false);
  };

  if (!show) return null;
  return (
    <div role="dialog" aria-label="Файлы cookie" className="fixed inset-x-3 bottom-[calc(88px+env(safe-area-inset-bottom))] z-40 max-h-[65vh] overflow-y-auto rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/10 md:inset-x-auto md:bottom-4 md:left-4 md:max-w-md">
      <p className="text-[13px] leading-5 text-ink">
        Мы используем файлы cookie, чтобы сайт работал быстро, а корзина сохраняла ваш заказ. Продолжая пользоваться сайтом, вы соглашаетесь с{' '}
        <Link href="/privacy" className="font-semibold underline underline-offset-2">Политикой обработки персональных данных</Link>.
      </p>
      {more && (
        <div className="mt-3 space-y-2 border-t border-black/10 pt-3 text-xs leading-5 text-mute">
          <p><b className="text-ink">Технические cookie</b> нужны для работы сайта: запоминают корзину, вход в личный кабинет и ваш выбор в этом баннере.</p>
          <p><b className="text-ink">Аналитические метрики</b> (например, Яндекс.Метрика) собирают обезличенную статистику посещений, чтобы сделать сайт удобнее.</p>
          <p>Cookie можно удалить или запретить в настройках браузера, но корзина и часть функций тогда могут не работать. Подробнее — в <Link href="/privacy" className="underline">Политике</Link>.</p>
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="h-11 flex-1 rounded-full bg-blush text-sm font-bold text-ink">{more ? 'Скрыть' : 'Подробнее'}</button>
        <button type="button" onClick={accept} className="h-11 flex-1 rounded-full bg-brand text-sm font-bold text-white">Принять</button>
      </div>
    </div>
  );
}
