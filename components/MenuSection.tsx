import { supabase } from '@/lib/supabase/server';
import CategoryBlock from './CategoryBlock';
import CategoryNav from './CategoryNav';
import MenuModal from './MenuModal';
import type { Product } from './ProductCard';

export function MenuSkeleton() {
  return <div className="grid gap-4 pt-8 md:grid-cols-4">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-40 md:aspect-[3/4] md:h-auto" />)}</div>;
}

export default async function MenuSection({ categoryImages, categoryImagesMobile = {} }: { categoryImages: Record<string, string>; categoryImagesMobile?: Record<string, string> }) {
  const db = supabase();
  // показываем только видимые категории; если колонки is_visible ещё нет (не выполнена миграция 007), показываем все
  const catsQ = async () => {
    const r = await db.from('categories').select('id,name,slug').eq('is_visible', true).order('sort_order');
    return r.error ? (await db.from('categories').select('id,name,slug').order('sort_order')).data : r.data;
  };
  // options, is_spicy и is_hit появляются после миграций 009–011; если их ещё нет, грузим без них, чтобы меню не пропало
  const prodsQ = async () => {
    const base = 'id,category_id,name,description,image_url,is_new,variants';
    for (const cols of [`${base},options,is_spicy,is_hit,is_promo`, `${base},options,is_spicy,is_hit`, `${base},options,is_spicy`, `${base},options`, base]) {
      const r = await db.from('products').select(cols).eq('is_available', true);
      if (!r.error) return r.data as unknown as any[];
    }
    return [] as any[];
  };
  const [cats, prods] = await Promise.all([catsQ(), prodsQ()]);
  if (!cats?.length) return <p className="py-16 text-center text-mute">Меню пока пустое.</p>;
  const all = (prods ?? []) as (Product & { category_id: string })[];
  const news = all.filter((p) => p.is_new);
  const hits = all.filter((p) => p.is_hit);
  const pick = (m: Record<string, string>, slug: string, name: string) => m[slug.toLowerCase()] ?? m[name.trim().toLowerCase()];
  const sections = [
    ...(news.length ? [{ id: 'new', name: 'Новинки', image: categoryImages['new'] ?? categoryImages['новинки'], mobile: categoryImagesMobile['new'] ?? categoryImagesMobile['новинки'], list: news }] : []),
    ...(hits.length ? [{ id: 'hits', name: 'Хиты', image: categoryImages['hits'] ?? categoryImages['хиты'], mobile: categoryImagesMobile['hits'] ?? categoryImagesMobile['хиты'], list: hits }] : []),
    ...cats.map((c) => ({ id: c.slug, name: c.name, image: pick(categoryImages, String(c.slug), c.name), mobile: pick(categoryImagesMobile, String(c.slug), c.name), list: all.filter((p) => p.category_id === c.id) })).filter((s) => s.list.length),
  ];
  return (
    <>
      <CategoryNav items={sections.map((s) => ({ id: s.id, name: s.name }))} />
      <MenuModal items={sections.map((s) => ({ id: s.id, name: s.name, thumb: s.mobile || s.image || s.list.find((p) => p.image_url)?.image_url || '' }))} />
      {sections.map((s) => <CategoryBlock key={s.id} slug={s.id} name={s.name} image={s.image} imageMobile={s.mobile} products={s.list} />)}
    </>
  );
}
