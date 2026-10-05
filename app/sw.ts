import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';
declare global { interface WorkerGlobalScope extends SerwistGlobalConfig { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined } }
declare const self: ServiceWorkerGlobalScope;

new Serwist({ precacheEntries: self.__SW_MANIFEST, skipWaiting: true, clientsClaim: true, navigationPreload: true, runtimeCaching: defaultCache }).addEventListeners();

self.addEventListener('push', (e) => {
  const d = e.data?.json() ?? {};
  e.waitUntil(self.registration.showNotification(d.title ?? 'iSushiClub', { body: d.body, icon: '/icons/192.png', badge: '/icons/192.png', data: { url: d.url ?? '/account' } }));
});
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(self.clients.openWindow(e.notification.data?.url ?? '/')); });
