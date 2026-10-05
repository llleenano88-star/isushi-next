import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { supabaseSession } from '@/lib/supabase/ssr';
const Body = z.object({ endpoint: z.string().url(), keys: z.object({ p256dh: z.string(), auth: z.string() }) });
export async function POST(req: Request) {
  const user = (await (await supabaseSession()).auth.getUser()).data.user;
  if (!user) return NextResponse.json({ error: 'Войдите в аккаунт' }, { status: 401 });
  const b = Body.safeParse(await req.json().catch(() => null));
  if (!b.success) return NextResponse.json({ error: 'Некорректная подписка' }, { status: 400 });
  const { error } = await supabaseAdmin().from('push_subscriptions').upsert({ user_id: user.id, endpoint: b.data.endpoint, p256dh: b.data.keys.p256dh, auth: b.data.keys.auth }, { onConflict: 'endpoint' });
  return error ? NextResponse.json({ error: 'Не удалось сохранить' }, { status: 500 }) : NextResponse.json({ ok: true });
}
