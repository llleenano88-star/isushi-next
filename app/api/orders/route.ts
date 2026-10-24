import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createDelivery } from '@/lib/iiko';
import { supabaseSession } from '@/lib/supabase/ssr';
import { getSettings } from '@/lib/settings';
import { computeTotals } from '@/lib/pricing';
import { cleanOptions } from '@/lib/options';
import { findPromo, type FoundPromo } from '@/lib/promo';

const Body = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(2).max(60),
  phone: z.string().transform((s) => s.replace(/\D/g, '')).pipe(z.string().regex(/^[78]\d{10}$/)),
  receiveType: z.enum(['delivery', 'pickup']),
  address: z.string().trim().max(200).optional(),
  paymentMethod: z.enum(['cash', 'card']),
  comment: z.string().trim().max(300).optional(),
  turnstileToken: z.string().optional(),
  promoCode: z.string().trim().max(40).optional(),
  clientTotal: z.number().min(0).max(10_000_000).optional(), // сумма, которую видел клиент; сверяем с серверным расчётом
  items: z.array(z.object({ productId: z.string().uuid(), label: z.string().max(40), qty: z.number().int().min(1).max(50), choices: z.array(z.string().max(80)).max(5).optional() })).min(1).max(40),
  extras: z.array(z.object({ id: z.string().min(1).max(64), qty: z.number().int().min(1).max(20) })).max(30).default([]),
}).refine((b) => b.receiveType === 'pickup' || !!b.address, { message: 'Укажите адрес', path: ['address'] });

type Line = { product_id: string | null; name: string; variant_label: string | null; price: number; qty: number; iikoId: string | null; sizeId?: string | null; choice?: string | null };
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
  const ids = [...new Set(b.items.map((i) => i.productId))];
  let pq: { data: any[] | null; error: any } = await db.from('products').select('id,iiko_id,name,is_available,variants,options').in('id', ids);
  if (pq.error) pq = await db.from('products').select('id,iiko_id,name,is_available,variants').in('id', ids); // миграция 009 ещё не выполнена
  const prods = pq.data;
  const lines: Line[] = [];
  for (const it of b.items) {
    const p = prods?.find((x) => x.id === it.productId);
    const v = (p?.variants as { label: string; price: number; sizeId?: string | null; iiko_id?: string | null }[] | undefined)?.find((x) => x.label === it.label);
    if (!p || !p.is_available || !v) return fail('Некоторые позиции недоступны. Обновите корзину', 409);
    // iiko_id выбранного варианта; если не задан — старое поле iiko_id товара
    // Свой iiko_id у варианта = отдельный товар в iiko, поэтому sizeId не передаём
    const own = typeof v.iiko_id === 'string' ? v.iiko_id.trim() : '';
    // Выбор (острый / не острый, какой ролл): проверяем по настройкам товара в БД. Своих iiko-кодов у выбора нет, он уходит в комментарии.
    const groups = cleanOptions((p as any).options);
    const picked = it.choices ?? [];
    if (groups.length && (picked.length !== groups.length || groups.some((g, gi) => !g.choices.includes(picked[gi])))) return fail(`Выберите вариант для «${p.name}». Обновите корзину`, 409);
    const choice = groups.length ? picked.join(', ') : null;
    lines.push({ product_id: p.id, name: p.name, variant_label: choice ? `${v.label} (${choice})` : v.label, price: v.price, qty: it.qty, iikoId: own || p.iiko_id || null, sizeId: own ? null : v.sizeId, choice });
  }
  // Дополнительные позиции (соусы, имбирь и т.д.) — тоже по настройкам из БД, цену клиента не берём
  const { cart: cs, deliveryIikoId } = await getSettings();
  const extraLines: Line[] = [];
  for (const x of b.extras) {
    const e = cs.extras.find((z) => z.id === x.id && z.active);
    if (!e) return fail('Дополнительные позиции изменились. Обновите корзину', 409);
    extraLines.push({ product_id: null, name: e.name, variant_label: null, price: e.price, qty: x.qty, iikoId: e.iikoId ?? null, sizeId: null });
  }
  const subtotal = [...lines, ...extraLines].reduce((a, l) => a + l.price * l.qty, 0);
  if (b.receiveType === 'delivery' && cs.minOrder > 0 && subtotal < cs.minOrder) return fail(`Минимальная сумма заказа на доставку ${cs.minOrder} ₽`, 400); // самовывоз — от любой суммы

  let promo: FoundPromo | null = null;
  if (b.promoCode) {
    const r = await findPromo(db, b.promoCode, subtotal);
    if (!r.promo) return fail(r.error ?? 'Промокод недоступен', 400);
    promo = r.promo;
  }
  const totals = computeTotals({ subtotal, receive: b.receiveType, deliveryPrice: cs.deliveryPrice, freeFrom: cs.freeDeliveryFrom, promo });
  if (b.clientTotal != null && Math.abs(b.clientTotal - totals.total) > 0.01)
    return NextResponse.json({ error: 'Стоимость заказа изменилась. Обновите страницу и проверьте сумму', total: totals.total }, { status: 409 });

  if (promo) {
    const { data: redeemed } = await db.rpc('redeem_promo', { p_code: promo.code });
    if (!redeemed) return fail('Промокод больше недоступен', 409);
  }
  let released = false; // вернуть использование промокода можно только один раз
  const release = async () => { if (promo && !released) { released = true; await db.rpc('release_promo', { p_code: promo.code }); } };

  const user = (await (await supabaseSession()).auth.getUser()).data.user;
  const number = `S${Date.now().toString(36).toUpperCase().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
  const row: Record<string, unknown> = {
    user_id: user?.id ?? null, idempotency_key: b.idempotencyKey, number, phone: b.phone, customer_name: b.name,
    receive_type: b.receiveType, address: b.address ? { text: b.address } : null, payment_method: b.paymentMethod,
    products_total: subtotal, delivery_price: totals.delivery, total: totals.total, comment: b.comment ?? null,
    promo_code: promo?.code ?? null, discount: totals.discount,
  };
  let ins = await db.from('orders').insert(row).select('id,number').single();
  if (ins.error?.code === '42703') { // колонки промокода ещё не созданы (не выполнена миграция 007): сохраняем без них
    delete row.promo_code; delete row.discount;
    ins = await db.from('orders').insert(row).select('id,number').single();
  }
  const { data: order, error } = ins;
  if (error?.code === '23505') { // гонка двойного тапа
    await release();
    const again = await db.from('orders').select('id,number').eq('idempotency_key', b.idempotencyKey).single();
    if (again.data) return NextResponse.json(again.data);
  }
  if (error || !order) { await release(); return fail('Не удалось создать заказ', 500); }

  await db.from('order_items').insert([...lines, ...extraLines].map(({ iikoId, sizeId, choice, ...l }) => ({ ...l, order_id: order.id })));

  if (lines.every((l) => l.iikoId)) {
    try {
      const noIiko = extraLines.filter((l) => !l.iikoId);
      const note = [
        noIiko.length ? `Доп. (добавить вручную): ${noIiko.map((l) => `${l.name} ×${l.qty}`).join(', ')}` : '',
        lines.some((l) => l.choice) ? `Выбор: ${lines.filter((l) => l.choice).map((l) => `${l.name} — ${l.choice}`).join('; ')}` : '',
        totals.delivery > 0 && !deliveryIikoId ? `Доставка ${totals.delivery} ₽` : '', // с кодом доставки она уходит отдельной позицией
        promo ? `Промокод ${promo.code}${totals.discount > 0 ? ` −${totals.discount} ₽` : ' (бесплатная доставка)'}` : '',
        `К оплате: ${totals.total} ₽`,
      ].filter(Boolean).join('. ');
      const iikoId = await createDelivery({ number: order.number, phone: b.phone, name: b.name, receiveType: b.receiveType, address: b.address, comment: b.comment, note,
        paymentMethod: b.paymentMethod,
        items: [
          ...[...lines, ...extraLines.filter((l) => l.iikoId)].map((l) => ({ iikoId: l.iikoId!, sizeId: l.sizeId, price: l.price, qty: l.qty, ...(l.choice ? { comment: l.choice } : {}) })),
          // Доставка отдельной позицией по коду из iiko (код задаётся в админке, раздел «Доставка»); бесплатная доставка не добавляется
          ...(totals.delivery > 0 && deliveryIikoId ? [{ iikoId: deliveryIikoId, sizeId: null, price: totals.delivery, qty: 1 }] : []),
        ] });
      if (iikoId) await db.from('orders').update({ iiko_order_id: iikoId }).eq('id', order.id);
    } catch (e) { console.error('iiko createDelivery failed', e); } // заказ сохранён, виден в админке
  }
  return NextResponse.json({ id: order.id, number: order.number });
}
