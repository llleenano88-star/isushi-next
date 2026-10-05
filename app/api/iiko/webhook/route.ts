import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { STATUS_MAP } from '@/lib/iiko';
import { notifyStatus } from '@/lib/push';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const secret = Buffer.from(process.env.IIKO_WEBHOOK_SECRET ?? '');
  const got = Buffer.from((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  if (!secret.length || got.length !== secret.length || !timingSafeEqual(got, secret)) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null); const db = supabaseAdmin();
  await db.from('iiko_webhook_logs').insert({ payload: body ?? {} });
  for (const e of Array.isArray(body) ? body : []) {
    if (e.eventType !== 'DeliveryOrderUpdate') continue;
    const status = STATUS_MAP[e.eventInfo?.order?.status]; const id = e.eventInfo?.id;
    if (status && id) {
      const { data } = await db.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('iiko_order_id', id)
        .neq('status', status).not('status', 'in', '(delivered,cancelled)').select('user_id,number,status');
      for (const o of data ?? []) await notifyStatus(o.user_id, o.number, o.status);
    }
  }
  return NextResponse.json({ ok: true });
}
