import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createDelivery, confirmDelivery } from '@/lib/iiko';
import { supabaseSession } from '@/lib/supabase/ssr';
import { getSettings } from '@/lib/settings';
import { computeTotals } from '@/lib/pricing';
import { cleanOptions } from '@/lib/options';
import { findPromo, type FoundPromo } from '@/lib/promo';
import { applyPromotions, checkGifts, hhmm, nowInTz, type EngineLine } from '@/lib/promotions';
import { openState } from '@/lib/hours';

const Body = z.object({
  idempotencyKey: z.string().uuid(),
  name: z.string().trim().min(2).max(60),
  phone: z.string().transform((s) => s.replace(/\D/g, '')).pipe(z.string().regex(/^[78]\d{10}$/)),
  receiveType: z.enum(['delivery', 'pickup']),
  address: z.string().trim().max(200).optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'qr', 'card']), // card оставлен для старых корзин
  street: z.string().trim().max(120).optional(),
  house: z.string().trim().max(30).optional(),
  comment: z.string().trim().max(300).optional(),
  turnstileToken: z.string().optional(),
  promoCode: z.string().trim().max(40).optional(),
  clientTotal: z.number().min(0).max(10_000_000).optional(), // сумма, которую видел клиент; сверяем с серверным расчётом
  items: z.array(z.object({ productId: z.string().uuid(), label: z.string().max(40), qty: z.number().int().min(1).max(50), choices: z.array(z.string().max(80)).max(5).optional() })).min(1).max(40),
  extras: z.array(z.object({ id: z.string().min(1).max(64), qty: z.number().int().min(1).max(20) })).max(30).default([]),
  gifts: z.array(z.object({ promoId: z.string().uuid(), productId: z.string().uuid(), label: z.string().max(40) })).max(20).default([]),
  zoneId: z.string().uuid().optional(),
  promoId: z.string().uuid().optional(),
  desiredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
}).refine((b) => b.receiveType === 'pickup' || (!!b.address && !!b.street && !!b.house), { message: 'Укажите улицу и номер дома', path: ['address'] });

type Line = { product_id: string | null; name: string; variant_label: string | null; price: number; qty: number; iikoId: string | null; sizeId?: string | null; choice?: string | null; rawLabel?: string };
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
  const loadProducts = async (list: string[]) => {
    let r: { data: any[] | null; error: any } = { data: null, error: true };
    for (const cols of ['id,category_id,iiko_id,name,is_available,variants,options,is_promo', 'id,category_id,iiko_id,name,is_available,variants,options', 'id,category_id,iiko_id,name,is_available,variants']) {
      r = await db.from('products').select(cols).in('id', list); // новые колонки появляются после миграций 009 и 012
      if (!r.error) break;
    }
    return r.data;
  };
  const prods = await loadProducts(ids);
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
    lines.push({ product_id: p.id, name: p.name, variant_label: choice ? `${v.label} (${choice})` : v.label, price: v.price, qty: it.qty, iikoId: own || p.iiko_id || null, sizeId: own ? null : v.sizeId, choice, rawLabel: v.label });
  }
  // Дополнительные позиции (соусы, имбирь и т.д.) — тоже по настройкам из БД, цену клиента не берём
  const { cart: cs, deliveryIikoId } = await getSettings();
  const nowI = nowInTz(cs.tz);
  const hoursState = openState(nowI, cs.workFrom, cs.workTo, cs.closeCutoff); // заказ вне часов работы не принимаем
  if (!hoursState.open) return fail(hoursState.message, 403);
  const extraLines: Line[] = [];
  for (const x of b.extras) {
    const e = cs.extras.find((z) => z.id === x.id && z.active);
    if (!e) return fail('Дополнительные позиции изменились. Обновите корзину', 409);
    extraLines.push({ product_id: null, name: e.name, variant_label: null, price: e.price, qty: x.qty, iikoId: e.iikoId ?? null, sizeId: null });
  }
  const subtotal = [...lines, ...extraLines].reduce((a, l) => a + l.price * l.qty, 0);

  // Зона доставки: если зоны заведены, доставка возможна только в выбранную зону, со своими ценой и минимумом
  let zone = null as (typeof cs.zones)[number] | null;
  if (b.receiveType === 'delivery' && cs.zones.length) {
    zone = cs.zones.find((z) => z.id === b.zoneId) ?? null;
    if (!zone) return fail('Выберите зону доставки', 400);
  }
  const deliveryPrice = zone?.price ?? cs.deliveryPrice; const freeFrom = zone?.freeFrom ?? cs.freeDeliveryFrom; const minOrder = zone?.minOrder ?? cs.minOrder;
  if (b.receiveType === 'delivery' && minOrder > 0 && subtotal < minOrder) return fail(`Минимальная сумма заказа на доставку ${minOrder} ₽`, 400); // самовывоз — от любой суммы

  // Время «ко времени»: не раньше минимального срока (самовывоз и доставка отдельно), в часы работы
  let desiredMin: number | null = null;
  if (b.desiredTime) {
    const dm = hhmm(b.desiredTime); const lead = b.receiveType === 'delivery' ? cs.deliveryLead[0] : cs.pickupLead[0];
    if (dm == null) return fail('Некорректное время', 400);
    if (dm < nowI.minutes + lead) return fail(`Выберите время не раньше чем через ${lead} мин`, 400);
    const wf = hhmm(cs.workFrom); const wt = hhmm(cs.workTo);
    if ((wf != null && dm < wf) || (wt != null && dm > wt)) return fail('Это время вне часов работы', 400);
    desiredMin = dm;
  }

  // Акции: скидки и подарки считаются здесь по данным из БД, значения из браузера не берём
  const engineLines: EngineLine[] = lines.map((l) => ({ productId: l.product_id ?? '', categoryId: (prods?.find((x) => x.id === l.product_id) as any)?.category_id ?? null, label: l.rawLabel ?? '', price: l.price, qty: l.qty, isPromo: !!(prods?.find((x) => x.id === l.product_id) as any)?.is_promo }));
  if (b.promoCode && engineLines.some((l) => l.isPromo)) return fail('Промокод нельзя использовать вместе с акционной позицией', 400);
  // Акции не суммируются: с промокодом акции отключены, из нескольких подходящих действует одна выбранная
  const eng = applyPromotions({ lines: engineLines, promos: cs.promos, now: nowI, receive: b.receiveType, chosenId: b.promoId ?? null, disabled: !!b.promoCode });
  const gc = checkGifts(eng.slots, b.gifts);
  if (!gc.ok) return fail('Подарки по акции изменились. Обновите корзину', 409);
  const giftLines: Line[] = [];
  if (gc.gifts.length) {
    const gp = await loadProducts([...new Set(gc.gifts.map((g) => g.productId))]);
    for (const g of gc.gifts) {
      const p = gp?.find((x) => x.id === g.productId);
      const v = (p?.variants as { label: string; price: number; sizeId?: string | null; iiko_id?: string | null }[] | undefined)?.find((x) => x.label === g.label);
      if (!p || !p.is_available || !v) return fail('Подарок по акции сейчас недоступен. Выберите другой', 409);
      const own = typeof v.iiko_id === 'string' ? v.iiko_id.trim() : '';
      giftLines.push({ product_id: p.id, name: p.name, variant_label: `${v.label} (подарок)`, price: 0, qty: 1, iikoId: own || p.iiko_id || null, sizeId: own ? null : v.sizeId, choice: null });
    }
  }

  let promo: FoundPromo | null = null;
  if (b.promoCode) {
    const r = await findPromo(db, b.promoCode, subtotal);
    if (!r.promo) return fail(r.error ?? 'Промокод недоступен', 400);
    promo = r.promo;
  }
  const totals = computeTotals({ subtotal, receive: b.receiveType, deliveryPrice, freeFrom, promo, extraDiscount: eng.discount });
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
    products_total: subtotal, delivery_price: totals.delivery, total: totals.total,
    comment: [b.comment, b.desiredTime ? `${b.receiveType === 'delivery' ? 'Доставить' : 'Забрать'} к ${b.desiredTime}` : '', zone ? `Зона: ${zone.name}` : ''].filter(Boolean).join('. ') || null,
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

  await db.from('order_items').insert([...lines, ...extraLines, ...giftLines].map(({ iikoId, sizeId, choice, rawLabel, ...l }) => ({ ...l, order_id: order.id })));

  // Время, зона и акции для админки (колонки из миграции 011; если их нет, заказ всё равно сохранён)
  await db.from('orders').update({
    desired_time: desiredMin != null ? new Date(Date.now() + (desiredMin - nowI.minutes) * 60_000).toISOString() : null,
    delivery_zone: zone?.name ?? null,
    promo_info: { discounts: eng.discounts, gifts: giftLines.map((g) => `${g.name} (${g.variant_label})`) },
  }).eq('id', order.id);

  if ([...lines, ...giftLines].every((l) => l.iikoId)) {
    try {
      const noIiko = extraLines.filter((l) => !l.iikoId);
      const note = [
        noIiko.length ? `Доп. (добавить вручную): ${noIiko.map((l) => `${l.name} ×${l.qty}`).join(', ')}` : '',
        lines.some((l) => l.choice) ? `Выбор: ${lines.filter((l) => l.choice).map((l) => `${l.name} — ${l.choice}`).join('; ')}` : '',
        b.desiredTime ? `${b.receiveType === 'delivery' ? 'Доставить' : 'Забрать'} к ${b.desiredTime}` : '',
        zone ? `Зона: ${zone.name}` : '',
        eng.discounts.length ? `Акции: ${eng.discounts.map((d) => `${d.title} −${d.amount} ₽`).join('; ')}` : '',
        giftLines.length ? `Подарок: ${giftLines.map((g) => g.name).join(', ')}` : '',
        totals.delivery > 0 && !deliveryIikoId ? `Доставка ${totals.delivery} ₽` : '', // с кодом доставки она уходит отдельной позицией
        promo ? `Промокод ${promo.code}${totals.discount > 0 ? ` −${totals.discount} ₽` : ' (бесплатная доставка)'}` : '',
        `К оплате: ${totals.total} ₽`,
      ].filter(Boolean).join('. ');
      const iikoId = await createDelivery({ number: order.number, phone: b.phone, name: b.name, receiveType: b.receiveType, address: b.address, comment: b.comment, note,
        paymentMethod: b.paymentMethod,
        ...(b.desiredTime ? { completeBefore: `${nowI.date} ${b.desiredTime}:00.000` } : {}),
        items: [
          ...[...lines, ...giftLines, ...extraLines.filter((l) => l.iikoId)].map((l) => ({ iikoId: l.iikoId!, sizeId: l.sizeId, price: l.price, qty: l.qty, ...(l.choice ? { comment: l.choice } : {}) })),
          // Доставка отдельной позицией по коду из iiko (код задаётся в админке, раздел «Доставка»); бесплатная доставка не добавляется
          ...(totals.delivery > 0 && deliveryIikoId ? [{ iikoId: deliveryIikoId, sizeId: null, price: totals.delivery, qty: 1 }] : []),
        ] });
      if (iikoId) await db.from('orders').update({ iiko_order_id: iikoId }).eq('id', order.id);
      if (iikoId) await confirmDelivery(iikoId); // сразу подтверждаем, чтобы заказ шёл на кухню без оператора
    } catch (e) { console.error('iiko createDelivery failed', e); } // заказ сохранён, виден в админке
  }
  return NextResponse.json({ id: order.id, number: order.number });
}
