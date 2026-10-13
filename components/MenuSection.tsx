import { supabase } from '@/lib/supabase/server';
import CategoryBlock from './CategoryBlock';
import CategoryNav from './CategoryNav';
import type { Product } from './ProductCard';

export function MenuSkeleton() {
  return <div className="grid grid-cols-2 gap-4 pt-8 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton aspect-[3/4]" />)}</div>;
}

export default async function MenuSection({ categoryImages }: { categoryImages: Record<string, string> }) {
  const db = supabase();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    db.from('categories').select('id,name,slug').order('sort_order'),
    db.from('products').select('id,category_id,name,description,image_url,is_new,variants').eq('is_available', true),
  ]);
  if (!cats?.length) return <p className="py-16 text-center text-mute">Меню пока пустое.</p>;
  const all = (prods ?? []) as (Product & { category_id: string })[];
  const news = all.filter((p) => p.is_new);
  const sections = [
    ...(news.length ? [{ id: 'new', name: 'Новинки', image: categoryImages['новинки'], list: news }] : []),
    ...cats.map((c) => ({ id: c.slug, name: c.name, image: categoryImages[c.name.toLowerCase()], list: all.filter((p) => p.category_id === c.id) })).filter((s) => s.list.length),
  ];
  return (
    <>
      <CategoryNav items={sections.map((s) => ({ id: s.id, name: s.name }))} />
      {sections.map((s) => <CategoryBlock key={s.id} slug={s.id} name={s.name} image={s.image} products={s.list} />)}
    </>
  );
}
