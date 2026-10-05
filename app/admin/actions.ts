'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseSession } from '@/lib/supabase/ssr';

const Variant = z.object({ label: z.string().trim().min(1).max(40), price: z.coerce.number().positive().max(1_000_000), sizeId: z.string().nullable().optional() });
const Form = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  category_id: z.string().uuid().optional().or(z.literal('')),
  image_url: z.string().url().optional().or(z.literal('')),
  variants: z.string().transform((s, ctx) => { try { return JSON.parse(s); } catch { ctx.addIssue({ code: 'custom', message: 'bad json' }); return z.NEVER; } }).pipe(z.array(Variant).min(1).max(10)),
});

export async function saveProduct(fd: FormData) {
  const p = Form.safeParse(Object.fromEntries(fd.entries()));
  if (!p.success) return;
  const d = p.data; const sb = await supabaseSession(); // RLS: писать может только admin
  const row = {
    name: d.name, description: d.description || null, category_id: d.category_id || null,
    image_url: d.image_url || null, image_manual: !!d.image_url && d.image_url.includes('/product-images/'),
    is_new: fd.get('is_new') === 'on', variants: d.variants, updated_at: new Date().toISOString(),
  };
  if (d.id) await sb.from('products').update(row).eq('id', d.id);
  else await sb.from('products').insert(row);
  revalidatePath('/'); revalidatePath('/admin');
  redirect('/admin');
}
