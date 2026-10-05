'use client';
import { useEffect, useState } from 'react';
const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
export default function PushToggle() {
  const [state, setState] = useState<'hidden' | 'off' | 'on' | 'denied'>('hidden');
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    if (Notification.permission === 'denied') return setState('denied');
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => setState(s ? 'on' : 'off')).catch(() => {});
  }, []);
  const enable = async () => {
    if ((await Notification.requestPermission()) !== 'granted') return setState('denied');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) });
    const r = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
    setState(r.ok ? 'on' : 'off');
  };
  if (state === 'hidden') return null;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-[24px] bg-card p-4 shadow-soft">
      <p className="flex-1 text-sm font-semibold">{state === 'on' ? 'Уведомления о статусе заказа включены' : state === 'denied' ? 'Уведомления заблокированы в настройках браузера' : 'Получайте уведомления, когда статус заказа меняется'}</p>
      {state === 'off' && <button onClick={enable} className="h-12 rounded-full bg-brand px-5 font-black text-black">Включить</button>}
    </div>
  );
}
