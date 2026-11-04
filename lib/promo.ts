import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PromoRule } from './pricing';
import type { GiftOption } from './promotions';

export type FoundPromo = PromoRule & { id: string; code: string; gifts: GiftOption[] };

// Проверяет промокод по базе. subtotal передают, чтобы проверить минимальную сумму заказа
export async function findPromo(db: SupabaseClient, rawCode: string, subtotal?: number, email?: string): Promise<{ promo?: FoundPromo; error?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: 'Введите промокод' };
  const cols = 'id,code,discount_type,discount_value,min_order,expires_at,active,max_uses,uses_count';
  // gifts появляется после миграции 015, one_per_email после 016: пробуем от полного набора колонок к базовому
  let r = await db.from('promo_codes').select(`${cols},gifts,one_per_email`).eq('code', code).maybeSingle();
  if (r.error) r = await db.from('promo_codes').select(`${cols},gifts`).eq('code', code).maybeSingle();
  if (r.error) r = await db.from('promo_codes').select(cols).eq('code', code).maybeSingle();
  const { data, error } = r as { data: any; error: any };
  if (error) return { error: 'Промокоды сейчас недоступны' };
  if (!data || !data.active) return { error: 'Промокод не найден' };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { error: 'Срок действия промокода истёк' };
  // «Один раз на одну почту»: если с этой почты уже был заказ с этим промокодом, отказываем
  if (data.one_per_email && email) {
    const used = await db.from('orders').select('id', { count: 'exact', head: true }).eq('promo_code', code).eq('customer_email', email.trim().toLowerCase());
    if (!used.error && (used.count ?? 0) > 0) return { error: 'Этот промокод уже использован на вашей почте' };
  }
  if (data.max_uses != null && data.uses_count >= data.max_uses) return { error: 'Промокод уже использован максимальное число раз' };
  const minOrder = Number(data.min_order) || 0;
  if (subtotal != null && subtotal < minOrder) return { error: `Промокод действует от заказа ${minOrder} ₽` };
  const gifts: GiftOption[] = (Array.isArray(data.gifts) ? data.gifts : []).map((g: any) => ({ productId: String(g?.productId ?? ''), label: String(g?.label ?? ''), name: String(g?.name ?? '') })).filter((g: GiftOption) => g.productId && g.label);
  if (data.discount_type === 'gift' && !gifts.length) return { error: 'Подарок по этому промокоду пока недоступен' };
  return { promo: { id: data.id, code: data.code, type: data.discount_type, value: Number(data.discount_value) || 0, minOrder, gifts } };
}
