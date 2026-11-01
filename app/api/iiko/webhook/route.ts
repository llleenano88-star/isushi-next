import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const secret = Buffer.from(process.env.IIKO_WEBHOOK_SECRET ?? '');
  const got = Buffer.from((req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''));
  if (!secret.length || got.length !== secret.length || !timingSafeEqual(got, secret)) return new NextResponse('Unauthorized', { status: 401 });

  const body = await req.json().catch(() => null); const db = supabaseAdmin();
  await db.from('iiko_webhook_logs').insert({ payload: body ?? {} });
  // Статусы заказов на сайте отключены: сообщения iiko только записываем в журнал, статус заказа не меняем и уведомления не отправляем.
  return NextResponse.json({ ok: true });
}
