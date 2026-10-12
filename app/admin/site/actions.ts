'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseSession } from '@/lib/supabase/ssr';

const link = z.string().max(300).refine((v) => v === '' || /^(https?:\/\/|#|\/)/.test(v));
const S = z.object({
  banners: z.array(z.object({ image: z.string().url(), href: link.optional() })).max(10),
  categoryImages: z.record(z.string().url()),
  about: z.object({ title: z.string().max(100), blocks: z.array(z.string().max(2000)).max(20), listTitle: z.string().max(200), list: z.array(z.string().max(200)).max(30), outro: z.string().max(2000) }),
  mapEmbed: z.string().max(1000).refine((v) => v === '' || v.startsWith('https://')),
});

export async function saveSettings(fd: FormData) {
  let raw: unknown; try { raw = JSON.parse(String(fd.get('payload'))); } catch { return; }
  const p = S.safeParse(raw); if (!p.success) return;
  const d = p.data; const sb = await supabaseSession(); // RLS: писать может только admin
  const now = new Date().toISOString();
  await sb.from('site_settings').upsert([
    { key: 'banners', value: d.banners, updated_at: now }, { key: 'category_images', value: d.categoryImages, updated_at: now },
    { key: 'about', value: d.about, updated_at: now }, { key: 'map_embed', value: d.mapEmbed, updated_at: now },
  ]);
  revalidatePath('/'); redirect('/admin/site?saved=1');
}
