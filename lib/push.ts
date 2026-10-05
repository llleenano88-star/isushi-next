import 'server-only';
import webpush from 'web-push';
import { supabaseAdmin } from './supabase/admin';
const TEXT: Record<string, string> = { pending: 'Заказ принят', confirmed: 'Заказ подтверждён', preparing: 'Готовим ваш заказ', ready: 'Заказ готов и скоро будет у вас', delivered: 'Заказ доставлен. Приятного аппетита!', cancelled: 'Заказ отменён' };

export async function notifyStatus(userId: string | null, number: string, status: string) {
  if (!userId || !process.env.VAPID_PRIVATE_KEY) return;
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY);
    const db = supabaseAdmin();
    const { data } = await db.from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id', userId);
    await Promise.all((data ?? []).map(async (s) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: `Заказ № ${number}`, body: TEXT[status] ?? status, url: '/account' })); }
      catch (e: any) { if (e.statusCode === 404 || e.statusCode === 410) await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint); }
    }));
  } catch (e) { console.error('push failed', e); }
}
