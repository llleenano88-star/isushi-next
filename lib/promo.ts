import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PromoRule } from './pricing';

export type FoundPromo = PromoRule & { id: string; code: string };

// Проверяет промокод по базе. subtotal передают, чтобы проверить минимальную сумму заказа
export async function findPromo(db: SupabaseClient, rawCode: string, subtotal?: number): Promise<{ promo?: FoundPromo; error?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: 'Введите промокод' };
  const { data, error } = await db.from('promo_codes').select('id,code,discount_type,discount_value,min_order,expires_at,active,max_uses,uses_count').eq('code', code).maybeSingle();
  if (error) return { error: 'Промокоды сейчас недоступны' };
  if (!data || !data.active) return { error: 'Промокод не найден' };
  if (data.expires_at && new Date(data.expires_at) < new Date()) return { error: 'Срок действия промокода истёк' };
  if (data.max_uses != null && data.uses_count >= data.max_uses) return { error: 'Промокод уже использован максимальное число раз' };
  const minOrder = Number(data.min_order) || 0;
  if (subtotal != null && subtotal < minOrder) return { error: `Промокод действует от заказа ${minOrder} ₽` };
  return { promo: { id: data.id, code: data.code, type: data.discount_type, value: Number(data.discount_value) || 0, minOrder } };
}
