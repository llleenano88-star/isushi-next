'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseSession } from '@/lib/supabase/ssr';

const S = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  name: z.string().trim().min(1).max(60),
  slug: z.string().transform((s) => s.trim().toLowerCase()).pipe(z.string().regex(/^[a-z0-9-]{0,40}$/)),
  sort_order: z.coerce.number().int().min(-1000).max(100000),
});
const done = (err: boolean) => { revalidatePath('/'); revalidatePath('/admin/categories'); redirect(err ? '/admin/categories?err=1' : '/admin/categories?saved=1'); };

export async function saveCategory(fd: FormData) {
  const p = S.safeParse(Object.fromEntries(fd));
  if (!p.success) return done(true);
  const d = p.data; const sb = await supabaseSession(); // RLS: только admin
  const row = { name: d.name, sort_order: d.sort_order, is_visible: fd.get('is_visible') === 'on' };
  const res = d.id
    ? await sb.from('categories').update({ ...row, ...(d.slug ? { slug: d.slug } : {}) }).eq('id', d.id)
    : await sb.from('categories').insert({ ...row, slug: d.slug || `c-${Date.now().toString(36)}` });
  return done(!!res.error);
}

export async function toggleCategory(fd: FormData) {
  const id = String(fd.get('id') ?? ''); const to = fd.get('to') === '1';
  const res = id ? await (await supabaseSession()).from('categories').update({ is_visible: to }).eq('id', id) : null;
  return done(!!res?.error);
}

export async function deleteCategory(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  const res = id ? await (await supabaseSession()).from('categories').delete().eq('id', id) : null; // товары остаются, у них категория обнуляется
  return done(!!res?.error);
}
