'use client';
import { useState } from 'react';
import ProductCard, { type Product } from './ProductCard';

export default function CategoryBlock({ slug, name, image, products }: { slug: string; name: string; image?: string; products: Product[] }) {
  const [n, setN] = useState(8);
  return (
    <section id={slug} className="scroll-mt-32 pt-8">
      <h2 className="text-2xl font-extrabold text-accent">{name}</h2>
      {image && <div className="mt-3 aspect-[16/7] w-full rounded-[24px] bg-cover bg-center md:aspect-[3/1]" style={{ backgroundImage: `url(${image})` }} />}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 lg:grid-cols-4">{products.slice(0, n).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {n < products.length && (
        <button onClick={() => setN(n + 8)} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blush text-sm font-bold text-ink">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>Показать ещё
        </button>
      )}
    </section>
  );
}
