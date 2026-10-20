import { NextResponse } from 'next/server';
import { fetchNomenclature } from '@/lib/iiko';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 60;
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Unauthorized', { status: 401 });
  const n = await fetchNomenclature(); const db = supabaseAdmin();
  const groups: Record<string, any> = Object.fromEntries((n.groups ?? []).map((g: any) => [g.id, g]));
  const top = (id?: string): any => { let g = groups[id ?? '']; while (g?.parentGroup && groups[g.parentGroup]) g = groups[g.parentGroup]; return g; };
  const sizes: Record<string, string> = Object.fromEntries((n.sizes ?? []).map((s: any) => [s.id, s.name]));

  const items = (n.products ?? []).filter((p: any) => !p.isDeleted && ['Dish', 'Good'].includes(p.type) && top(p.parentGroup) && p.sizePrices?.length);
  const tops = [...new Map(items.map((p: any) => [top(p.parentGroup).id, top(p.parentGroup)])).values()] as any[];
  const { data: cats, error: ce } = await db.from('categories')
    .upsert(tops.map((g) => ({ slug: `iiko-${g.id.slice(0, 8)}`, name: g.name, sort_order: g.order ?? 0 })), { onConflict: 'slug' }).select('id,slug');
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });
  const catId = (gid: string) => cats?.find((c) => c.slug === `iiko-${gid.slice(0, 8)}`)?.id;

  const rows = items.map((p: any) => {
    const variants = p.sizePrices.filter((s: any) => s.price?.isIncludedInMenu !== false && s.price?.currentPrice != null).map((s: any) => ({
      label: (s.sizeId && sizes[s.sizeId]) || (p.weight ? `${Math.round(p.weight * 1000)} г` : 'шт'), price: s.price.currentPrice, sizeId: s.sizeId ?? null }));
    return { iiko_id: p.id, category_id: catId(top(p.parentGroup).id), name: p.name, description: p.description ?? null,
      image_url: p.imageLinks?.[0] ?? null, variants, updated_at: new Date().toISOString() };
  }).filter((r: any) => r.variants.length > 0);

  // Фото, уже заполненное в базе сайта, не перезаписываем (загруженное вручную не пропадёт).
  // Обновляются название, цена (variants), описание и категория; скрытие товара (is_available) не трогаем.
  // Если у товара фото пустое — берём его из iiko. Флаг image_manual тоже сохраняет текущее значение (в т.ч. удалённое вручную фото).
  const existing: { iiko_id: string | null; image_url: string | null; image_manual: boolean | null; variants: any }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error: se } = await db.from('products').select('iiko_id, image_url, image_manual, variants').not('iiko_id', 'is', null).range(from, from + 999);
    if (se) return NextResponse.json({ error: se.message }, { status: 500 }); // лучше остановиться, чем затереть фото
    existing.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  // iiko_id вариантов, заданные вручную в админке, не теряем: сопоставляем по sizeId или названию варианта
  const oldVariants = new Map<string | null, any[]>(existing.map((e) => [e.iiko_id, Array.isArray(e.variants) ? e.variants : []] as [string | null, any[]]));
  for (const r of rows) {
    const old = oldVariants.get(r.iiko_id) ?? [];
    r.variants = r.variants.map((v: any) => {
      const prev = old.find((o: any) => (v.sizeId && o?.sizeId === v.sizeId) || o?.label === v.label);
      return prev?.iiko_id ? { ...v, iiko_id: prev.iiko_id, sizeId: null } : v;
    });
  }
  const keep = new Set(existing.filter((e) => e.image_manual === true || (e.image_url ?? '').trim() !== '').map((e) => e.iiko_id));
  const withImg = rows.filter((r: any) => !keep.has(r.iiko_id));
  const noImg = rows.filter((r: any) => keep.has(r.iiko_id)).map(({ image_url, ...r }: any) => r);
  const res = await Promise.all([withImg.length ? db.from('products').upsert(withImg, { onConflict: 'iiko_id' }) : null, noImg.length ? db.from('products').upsert(noImg, { onConflict: 'iiko_id' }) : null]);
  const error = res.map((r) => r?.error).find(Boolean);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ categories: cats?.length, products: rows.length });
}
