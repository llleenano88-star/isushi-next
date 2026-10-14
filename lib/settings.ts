import { supabase } from '@/lib/supabase/server';
import { ABOUT, BANNERS, CATEGORY_IMAGES, MAP_EMBED, DELIVERY_TIME, INCLUDED_NOTE } from '@/lib/content';
import type { Extra, PublicSettings } from '@/lib/types';

export type Banner = { image: string; href?: string };
export type About = typeof ABOUT;
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

// Берёт настройки из админки; если их нет (или таблица не создана), использует значения из lib/content.ts
export async function getSettings() {
  let m: Record<string, any> = {};
  try {
    const { data } = await supabase().from('site_settings').select('key,value');
    m = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  } catch { /* остаются значения по умолчанию */ }
  const extras: Extra[] = (Array.isArray(m.extras) ? m.extras : [])
    .map((e: any) => ({ id: String(e.id ?? ''), name: String(e.name ?? ''), price: num(e.price), image: e.image || undefined, iikoId: e.iikoId || undefined, default: !!e.default, active: e.active !== false }))
    .filter((e: Extra) => e.id && e.name);
  const cart: PublicSettings = {
    deliveryTime: (m.delivery_time as string | undefined) ?? DELIVERY_TIME,
    deliveryPrice: num(m.delivery_price), freeDeliveryFrom: num(m.free_delivery_from), minOrder: num(m.min_order),
    phone: typeof m.phone === 'string' ? m.phone : '',
    includedNote: (m.included_note as string | undefined) ?? INCLUDED_NOTE,
    extras,
  };
  return {
    banners: (m.banners as Banner[] | undefined) ?? BANNERS,
    categoryImages: (m.category_images as Record<string, string> | undefined) ?? CATEGORY_IMAGES,
    about: (m.about as About | undefined) ?? ABOUT,
    mapEmbed: (m.map_embed as string | undefined) ?? MAP_EMBED,
    cart,
  };
}
