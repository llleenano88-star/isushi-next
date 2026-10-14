import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { findPromo } from '@/lib/promo';

const Body = z.object({ code: z.string().max(40), subtotal: z.number().min(0).max(10_000_000).optional() });

export async function POST(req: Request) {
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Введите промокод' }, { status: 400 });
  const db = supabaseAdmin();
  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const { data: ok } = await db.rpc('hit_rate_limit', { p_key: `promo:${ip}`, p_max: 30, p_window_seconds: 3600 }); // защита от подбора кодов
  if (!ok) return NextResponse.json({ error: 'Слишком много попыток. Попробуйте позже' }, { status: 429 });
  const r = await findPromo(db, p.data.code, p.data.subtotal);
  if (!r.promo) return NextResponse.json({ error: r.error }, { status: 400 });
  const { code, type, value, minOrder } = r.promo;
  const message = type === 'percent' ? `Промокод применён: скидка ${value}%` : type === 'fixed' ? `Промокод применён: скидка ${value} ₽` : 'Промокод применён: бесплатная доставка';
  return NextResponse.json({ promo: { code, type, value, minOrder }, message });
}
