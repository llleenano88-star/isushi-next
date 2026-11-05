import { NextResponse } from 'next/server';
import { supabaseSession } from '@/lib/supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const sb = await supabaseSession();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: 'Подтвердите почту' }, { status: 403 });
  const db = supabaseAdmin();
  const { data: profile } = await db.from('profiles').select('name,phone').eq('id', user.id).maybeSingle();
  return NextResponse.json({ email: user.email ?? '', name: profile?.name ?? '', phone: profile?.phone ?? '' });
}

export async function POST(req: Request) {
  const sb = await supabaseSession();
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Нужно войти в аккаунт' }, { status: 401 });
  if (!user.email_confirmed_at) return NextResponse.json({ error: 'Сначала подтвердите почту' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
  if (name.length < 2 || name.length > 60 || !/^[78]\d{10}$/.test(phone)) {
    return NextResponse.json({ error: 'Проверьте имя и номер телефона' }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { error: saveError } = await db.from('profiles').update({ name, phone }).eq('id', user.id);
  if (saveError) {
    const message = saveError.code === '23505' ? 'Этот номер уже привязан к другому аккаунту' : 'Не удалось сохранить профиль';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, name, phone, email: user.email ?? '' });
}
