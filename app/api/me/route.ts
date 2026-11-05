import { NextResponse } from 'next/server';
import { supabaseSession } from '@/lib/supabase/ssr';

// Данные вошедшего клиента для подстановки в оформление заказа. Без входа возвращает пустой объект.
export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const sb = await supabaseSession();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({}, { headers });
    const { data } = await sb.from('profiles').select('name,phone').eq('id', user.id).maybeSingle();
    return NextResponse.json({ email: user.email ?? '', name: data?.name ?? '', phone: data?.phone ?? '' }, { headers });
  } catch { return NextResponse.json({}, { headers }); }
}
