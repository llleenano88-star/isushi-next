import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PromoRule } from './pricing';
import type { GiftOption } from './promotions';

export type FoundPromo = PromoRule & { id: string; code: string; gifts: GiftOption[] };

// Проверяет промокод по базе. subtotal передают, чтобы проверить минимальную сумму заказа
export async function findPromo(db: SupabaseClient, rawCode: string, subtotal?: number): Promise<{ promo?: FoundPromo; error?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: 'Введите промокод' };
  const cols = 'id,code,discount_type,discount_value,min_order,expires_at,active,max_uses,uses_count';
  let r = await db.from('promo_codes').select(`${cols},gifts`).eq('code', code).maybeSingle(); // gifts появляется после миграции 015
  if (r.error) r = await db.from('promo_codes').select(cols).eq('code', code).maybeSingle();
  const { data, error } = r as { data: any; error: any };
  if (error) return { error: 'Промокоды сейчас недоступны' };
  if (!data || !data.active) return { error: 'Промокод не найден' };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { error: 'Срок действия промокода истёк' };
  if (data.max_uses != null && data.uses_count >= data.max_uses) return { error: 'Промокод уже использован максимальное число раз' };
  const minOrder = Number(data.min_order) || 0;
  if (subtotal != null && subtotal < minOrder) return { error: `Промокод действует от заказа ${minOrder} ₽` };
  const gifts: GiftOption[] = (Array.isArray(data.gifts) ? data.gifts : []).map((g: any) => ({ productId: String(g?.productId ?? ''), label: String(g?.label ?? ''), name: String(g?.name ?? '') })).filter((g: GiftOption) => g.productId && g.label);
  if (data.discount_type === 'gift' && !gifts.length) return { error: 'Подарок по этому промокоду пока недоступен' };
  return { promo: { id: data.id, code: data.code, type: data.discount_type, value: Number(data.discount_value) || 0, minOrder, gifts } };
}
