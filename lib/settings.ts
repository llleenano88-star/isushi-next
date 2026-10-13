import { supabase } from '@/lib/supabase/server';
import { ABOUT, BANNERS, CATEGORY_IMAGES, MAP_EMBED, DELIVERY_TIME } from '@/lib/content';

export type Banner = { image: string; href?: string };
export type About = typeof ABOUT;

// Берёт настройки из админки; если их там нет (или миграция 006 ещё не выполнена), использует значения из lib/content.ts
export async function getSettings() {
  const { data } = await supabase().from('site_settings').select('key,value');
  const m: Record<string, any> = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    banners: (m.banners as Banner[] | undefined) ?? BANNERS,
    categoryImages: (m.category_images as Record<string, string> | undefined) ?? CATEGORY_IMAGES,
    about: (m.about as About | undefined) ?? ABOUT,
    mapEmbed: (m.map_embed as string | undefined) ?? MAP_EMBED,
    deliveryTime: (m.delivery_time as string | undefined) ?? DELIVERY_TIME,
  };
}
