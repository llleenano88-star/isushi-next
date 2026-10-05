import { supabase } from '@/lib/supabase/server';
import ProductCard, { type Product } from './ProductCard';

export function MenuSkeleton() {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-72" />)}</div>;
}

export default async function MenuSection() {
  const db = supabase();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    db.from('categories').select('id,name,slug').order('sort_order'),
    db.from('products').select('id,category_id,name,description,image_url,is_new,variants').eq('is_available', true),
  ]);
  if (!cats?.length) return <p className="py-16 text-center text-mute">Меню пока пустое. Запустите миграцию 001_init.sql.</p>;
  return (
    <>
      <nav className="sticky top-14 z-30 -mx-4 flex gap-2 overflow-x-auto bg-bg/90 px-4 py-2 backdrop-blur [scrollbar-width:none]">
        {cats.map((c) => <a key={c.id} href={`#${c.slug}`} className="flex min-h-12 shrink-0 items-center rounded-full bg-card px-5 text-sm font-bold shadow-soft">{c.name}</a>)}
      </nav>
      {(prods ?? []).some((p) => p.is_new) && (
        <section className="pt-6">
          <h2 className="mb-4 text-2xl font-black">Новинки</h2>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {(prods ?? []).filter((p) => p.is_new).map((p) => <div key={p.id} className="w-64 shrink-0"><ProductCard p={p as Product} /></div>)}
          </div>
        </section>
      )}
      {cats.map((c) => (
        <section key={c.id} id={c.slug} className="scroll-mt-32 pt-6">
          <h2 className="mb-4 text-2xl font-black">{c.name}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(prods ?? []).filter((p) => p.category_id === c.id).map((p) => <ProductCard key={p.id} p={p as Product} />)}
          </div>
        </section>
      ))}
    </>
  );
}
