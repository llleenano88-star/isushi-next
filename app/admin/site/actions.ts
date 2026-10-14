'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseSession } from '@/lib/supabase/ssr';

const link = z.string().max(300).refine((v) => v === '' || /^(https?:\/\/|#|\/)/.test(v));
const money = z.number().min(0).max(1_000_000);
const S = z.object({
  banners: z.array(z.object({ image: z.string().url(), href: link.optional() })).max(10),
  categoryImages: z.record(z.string().url()),
  about: z.object({ title: z.string().max(100), blocks: z.array(z.string().max(2000)).max(20), listTitle: z.string().max(200), list: z.array(z.string().max(200)).max(30), outro: z.string().max(2000) }),
  mapEmbed: z.string().max(1000).refine((v) => v === '' || v.startsWith('https://')),
  deliveryTime: z.string().max(200),
  deliveryPrice: money, freeDeliveryFrom: money, minOrder: money,
  phone: z.string().max(40),
  includedNote: z.string().max(200),
  extras: z.array(z.object({
    id: z.string().min(1).max(64), name: z.string().min(1).max(80), price: money,
    image: z.string().max(500).refine((v) => v === '' || /^https?:\/\//.test(v)), iikoId: z.string().max(64),
    default: z.boolean(), active: z.boolean(),
  })).max(30),
});

export async function saveSettings(fd: FormData) {
  let raw: unknown; try { raw = JSON.parse(String(fd.get('payload'))); } catch { return; }
  const p = S.safeParse(raw); if (!p.success) return;
  const d = p.data; const sb = await supabaseSession(); // RLS: писать может только admin
  const now = new Date().toISOString();
  await sb.from('site_settings').upsert([
    { key: 'banners', value: d.banners }, { key: 'category_images', value: d.categoryImages },
    { key: 'about', value: d.about }, { key: 'map_embed', value: d.mapEmbed },
    { key: 'delivery_time', value: d.deliveryTime }, { key: 'delivery_price', value: d.deliveryPrice },
    { key: 'free_delivery_from', value: d.freeDeliveryFrom }, { key: 'min_order', value: d.minOrder },
    { key: 'phone', value: d.phone }, { key: 'included_note', value: d.includedNote }, { key: 'extras', value: d.extras },
  ].map((r) => ({ ...r, updated_at: now })));
  revalidatePath('/'); revalidatePath('/checkout'); redirect('/admin/site?saved=1');
}
