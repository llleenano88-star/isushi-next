import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createDelivery } from '@/lib/iiko';
import { supabaseSession } from '@/lib/supabase/ssr';

const Body = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(2).max(60),
  phone: z.string().transform((s) => s.replace(/\D/g, '')).pipe(z.string().regex(/^[78]\d{10}$/)),
  receiveType: z.enum(['delivery', 'pickup']),
  address: z.string().trim().max(200).optional(),
  paymentMethod: z.enum(['cash', 'card']),
  comment: z.string().trim().max(300).optional(),
  turnstileToken: z.string().optional(),
  items: z.array(z.object({ productId: z.string().uuid(), label: z.string().max(40), qty: z.number().int().min(1).max(50) })).min(1).max(40),
}).refine((b) => b.receiveType === 'pickup' || !!b.address, { message: 'Укажите адрес', path: ['address'] });

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail('Проверьте данные заказа', 400);
  const b = parsed.data; const db = supabaseAdmin();

  const dup = await db.from('orders').select('id,number').eq('idempotency_key', b.idempotencyKey).maybeSingle();
  if (dup.data) return NextResponse.json({ id: dup.data.id, number: dup.data.number });

  const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  if (process.env.TURNSTILE_SECRET) {
    const t = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: b.turnstileToken ?? '', remoteip: ip }) }).then((r) => r.json()).catch(() => null);
    if (!t?.success) return fail('Подтвердите, что вы не робот', 400);
  }
  const { data: ok } = await db.rpc('hit_rate_limit', { p_key: `order:${ip}`, p_max: 5, p_window_seconds: 3600 });
  if (!ok) return fail('Слишком много заказов. Попробуйте позже', 429);

  // Цены и доступность — только из БД
  const { data: prods } = await db.from('products').select('id,iiko_id,name,is_available,variants').in('id', [...new Set(b.items.map((i) => i.productId))]);
  const lines: { product_id: string; name: string; variant_label: string; price: number; qty: number; iikoId: string | null; sizeId?: string | null }[] = [];
  for (const it of b.items) {
    const p = prods?.find((x) => x.id === it.productId);
    const v = (p?.variants as { label: string; price: number; sizeId?: string | null }[] | undefined)?.find((x) => x.label === it.label);
    if (!p || !p.is_available || !v) return fail('Некоторые позиции недоступны. Обновите корзину', 409);
    lines.push({ product_id: p.id, name: p.name, variant_label: v.label, price: v.price, qty: it.qty, iikoId: p.iiko_id, sizeId: v.sizeId });
  }
  const productsTotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const delivery = b.receiveType === 'delivery' ? Number(process.env.DELIVERY_PRICE ?? 0) : 0;
  const user = (await (await supabaseSession()).auth.getUser()).data.user;
  const number = `S${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;

  const { data: order, error } = await db.from('orders').insert({
    user_id: user?.id ?? null, idempotency_key: b.idempotencyKey, number, phone: b.phone, customer_name: b.name,
    receive_type: b.receiveType, address: b.address ? { text: b.address } : null, payment_method: b.paymentMethod,
    products_total: productsTotal, delivery_price: delivery, total: productsTotal + delivery, comment: b.comment ?? null,
  }).select('id,number').single();
  if (error?.code === '23505') { // гонка двойного тапа
    const again = await db.from('orders').select('id,number').eq('idempotency_key', b.idempotencyKey).single();
    if (again.data) return NextResponse.json(again.data);
  }
  if (error || !order) return fail('Не удалось создать заказ', 500);
  await db.from('order_items').insert(lines.map(({ iikoId, sizeId, ...l }) => ({ ...l, order_id: order.id })));
  if (lines.every((l) => l.iikoId)) {
    try {
      const iikoId = await createDelivery({ number: order.number, phone: b.phone, name: b.name, receiveType: b.receiveType, address: b.address, comment: b.comment,
        paymentMethod: b.paymentMethod, items: lines.map((l) => ({ iikoId: l.iikoId!, sizeId: l.sizeId, price: l.price, qty: l.qty })) });
      if (iikoId) await db.from('orders').update({ iiko_order_id: iikoId }).eq('id', order.id);
    } catch (e) { console.error('iiko createDelivery failed', e); } // заказ сохранён, виден в админке
  }
  return NextResponse.json({ id: order.id, number: order.number });
}
