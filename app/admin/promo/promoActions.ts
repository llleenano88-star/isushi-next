'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { supabaseSession } from '@/lib/supabase/ssr';

const S = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  code: z.string().transform((s) => s.trim().toUpperCase()).pipe(z.string().regex(/^[A-Z0-9_-]{2,32}$/)),
  discount_type: z.enum(['percent', 'fixed', 'free_delivery']),
  discount_value: z.coerce.number().min(0).max(1_000_000),
  min_order: z.coerce.number().min(0).max(1_000_000),
  expires_at: z.string().optional(),
  max_uses: z.string().optional(),
}).refine((d) => d.discount_type !== 'percent' || d.discount_value <= 100);

export async function savePromo(fd: FormData) {
  const p = S.safeParse(Object.fromEntries(fd));
  if (!p.success) redirect('/admin/promo?err=1');
  const d = p.data; const sb = await supabaseSession(); // RLS: только admin
  const exp = d.expires_at ? new Date(`${d.expires_at}T23:59:59+03:00`) : null;
  const uses = Number(d.max_uses);
  const row = {
    code: d.code, discount_type: d.discount_type, discount_value: d.discount_type === 'free_delivery' ? 0 : d.discount_value, min_order: d.min_order,
    expires_at: exp && !Number.isNaN(exp.getTime()) ? exp.toISOString() : null,
    max_uses: d.max_uses && Number.isFinite(uses) && uses >= 1 ? Math.floor(uses) : null,
    active: fd.get('active') === 'on',
  };
  const res = d.id ? await sb.from('promo_codes').update(row).eq('id', d.id) : await sb.from('promo_codes').insert(row);
  revalidatePath('/admin/promo');
  redirect(res.error ? '/admin/promo?err=1' : '/admin/promo?saved=1');
}

export async function deletePromo(fd: FormData) {
  const id = String(fd.get('id') ?? '');
  if (id) await (await supabaseSession()).from('promo_codes').delete().eq('id', id);
  revalidatePath('/admin/promo'); redirect('/admin/promo');
}
