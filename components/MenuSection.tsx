import { supabase } from '@/lib/supabase/server';
import { CATEGORY_IMAGES } from '@/lib/content';
import CategoryBlock from './CategoryBlock';
import type { Product } from './ProductCard';

export function MenuSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="skeleton h-36" />
      ))}
    </div>
  );
}

export default async function MenuSection() {
  const db = supabase();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    db.from('categories').select('id,name,slug').order('sort_order'),
    db
      .from('products')
      .select('id,category_id,name,description,image_url,is_new,variants')
      .eq('is_available', true),
  ]);

  if (!cats?.length) return <p className="py-16 text-center text-mute">Меню пока пустое.</p>;

  return (
    <>
      <nav className="sticky top-[calc(72px+env(safe-area-inset-top))] z-30 -mx-4 flex gap-2 overflow-x-auto bg-bg/90 px-4 py-2 backdrop-blur [scrollbar-width:none]">
        {cats.map((c) => (
          <a
            key={c.id}
            href={`#${c.slug}`}
            className="flex h-11 shrink-0 items-center rounded-lg bg-brand px-6 text-sm font-bold lowercase text-white"
          >
            {c.name}
          </a>
        ))}
      </nav>
      {cats.map((c) => {
        const list = (prods ?? []).filter((p) => p.category_id === c.id) as Product[];
        return list.length ? (
          <CategoryBlock
            key={c.id}
            slug={c.slug}
            name={c.name}
            image={CATEGORY_IMAGES[c.name.toLowerCase()]}
            products={list}
          />
        ) : null;
      })}
    </>
  );
}