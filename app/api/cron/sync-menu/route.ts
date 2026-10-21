import { NextResponse } from 'next/server';
import { fetchExternalMenu } from '@/lib/iiko';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 60;
export const preferredRegion = 'fra1';

type Variant = { label: string; price: number; sizeId: string | null; iiko_id: string; count: number | null };

// Разбор названия: «Австрия 6» → { base: "Австрия", count: 6 },
// «Абу-Даби - 6 - Запеченный» → { base: "Абу-Даби - Запеченный", count: 6 }.
// Размером считается только отдельное число (1–2 цифры, можно с «шт») либо число в самом конце названия.
// Цифры внутри названия («Ролл 3 сыра») не трогаем.
function parseName(raw: string): { base: string; count: number | null } {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim();
  const parts = name.split(/\s+[-–—]\s+/);
  const pure = /^(\d{1,2})(?:\s*шт\.?)?$/i;
  const idx = parts.findIndex((p, i) => i > 0 && pure.test(p));
  if (idx > 0) {
    const count = Number(parts[idx].match(pure)![1]);
    parts.splice(idx, 1);
    return { base: parts.join(' - '), count };
  }
  const last = parts[parts.length - 1];
  const m = last.match(/^(.*\S)\s+(\d{1,2})(?:\s*шт\.?)?$/i);
  if (m) {
    parts[parts.length - 1] = m[1];
    return { base: parts.join(' - '), count: Number(m[2]) };
  }
  return { base: name, count: null };
}

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Unauthorized', { status: 401 });
  const dry = new URL(req.url).searchParams.get('dry') === '1'; // ?dry=1 — только показать группировку, в базу не писать

  let menu: any;
  try {
    menu = await fetchExternalMenu();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }

  // Внешнее меню: itemCategories -> items -> itemSizes -> prices
  const categories: any[] = (menu.itemCategories ?? []).filter((c: any) => c.items?.length);

  // Группировка внутри категории по базовому названию
  type Group = { catId: string; name: string; description: string | null; image_url: string | null; variants: Variant[] };
  const groups = new Map<string, Group>();
  for (const c of categories) {
    for (const p of c.items.filter((i: any) => !i.isHidden)) {
      const { base, count } = parseName(p.name);
      const sizes: any[] = p.itemSizes ?? [];
      const key = `${c.id}::${base.toLowerCase()}`;
      let g = groups.get(key);
      if (!g) {
        g = { catId: c.id, name: base, description: null, image_url: null, variants: [] };
        groups.set(key, g);
      }
      if (!g.description && p.description) g.description = p.description;
      for (const s of sizes) {
        const price = s.prices?.[0]?.price;
        if (price == null) continue;
        if (!g.image_url && s.buttonImageUrl) g.image_url = s.buttonImageUrl;
        // подпись: размер из iiko, если он есть; иначе количество из названия; иначе вес; иначе «шт»
        const label =
          s.sizeName ||
          (count != null ? `${count} шт` : s.portionWeightGrams ? `${Math.round(s.portionWeightGrams)} г` : 'шт');
        g.variants.push({ label, price, sizeId: s.sizeId ?? null, iiko_id: p.itemId, count });
      }
    }
  }
  for (const g of groups.values()) {
    g.variants.sort((a, b) => (a.count ?? 0) - (b.count ?? 0) || a.price - b.price);
  }
  const list = [...groups.values()].filter((g) => g.variants.length > 0);

  if (dry) {
    return NextResponse.json({
      products: list.length,
      items: list.map((g) => ({ name: g.name, variants: g.variants.map((v) => `${v.label} — ${v.price}`) })),
    });
  }

  const { data: cats, error: ce } = await supabaseAdmin().from('categories')
    .upsert(
      categories.map((c: any, idx: number) => ({ slug: `iiko-${String(c.id).slice(0, 8)}`, name: c.name, sort_order: idx })),
      { onConflict: 'slug' },
    )
    .select('id,slug');
  if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });
  const catId = (gid: string) => cats?.find((c) => c.slug === `iiko-${String(gid).slice(0, 8)}`)?.id;
  const db = supabaseAdmin();

  // Ключ товара (products.iiko_id) — id первого (меньшего) размера, он же используется как ключ upsert
  const rows = list.map((g) => ({
    iiko_id: g.variants[0].iiko_id,
    category_id: catId(g.catId),
    name: g.name,
    description: g.description,
    image_url: g.image_url,
    variants: g.variants.map(({ count, ...v }) => v),
    updated_at: new Date().toISOString(),
  }));

  // Фото, уже заполненное в базе сайта, не перезаписываем (загруженное вручную не пропадёт).
  // Обновляются название, цена (variants), описание и категория; скрытие товара (is_available) не трогаем.
  // Если у товара фото пустое — берём его из iiko. Флаг image_manual тоже сохраняет текущее значение.
  const existing: { iiko_id: string | null; image_url: string | null; image_manual: boolean | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error: se } = await db.from('products').select('iiko_id, image_url, image_manual').not('iiko_id', 'is', null).range(from, from + 999);
    if (se) return NextResponse.json({ error: se.message }, { status: 500 }); // лучше остановиться, чем затереть фото
    existing.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }

  const keep = new Set(existing.filter((e) => e.image_manual === true || (e.image_url ?? '').trim() !== '').map((e) => e.iiko_id));
  const withImg = rows.filter((r) => !keep.has(r.iiko_id));
  const noImg = rows.filter((r) => keep.has(r.iiko_id)).map(({ image_url, ...r }) => r);

  const res = await Promise.all([
    withImg.length ? db.from('products').upsert(withImg, { onConflict: 'iiko_id' }) : null,
    noImg.length ? db.from('products').upsert(noImg, { onConflict: 'iiko_id' }) : null,
  ]);
  const error = res.map((r) => r?.error).find(Boolean);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Старые отдельные карточки («Австрия 8» и т. п.), влитые в группу, скрываем, чтобы не дублировались на сайте.
  const fresh = new Set(rows.map((r) => r.iiko_id));
  const stale = existing.map((e) => e.iiko_id).filter((id): id is string => !!id && !fresh.has(id));
  if (stale.length) {
    const { error: he } = await db.from('products').update({ is_available: false }).in('iiko_id', stale);
    if (he) return NextResponse.json({ error: he.message }, { status: 500 });
  }

  return NextResponse.json({ categories: cats?.length, products: rows.length, hidden_old: stale.length });
}
