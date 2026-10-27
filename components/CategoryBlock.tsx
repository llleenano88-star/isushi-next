'use client';
import { useState } from 'react';
import ProductCard, { type Product } from './ProductCard';
import { useUI } from '@/lib/store/ui';

export default function CategoryBlock({ slug, name, image, products }: { slug: string; name: string; image?: string; products: Product[] }) {
  const [n, setN] = useState(12);
  const q = useUI((s) => s.query).trim().toLowerCase();
  const list = q ? products.filter((p) => `${p.name} ${p.description ?? ''}`.toLowerCase().includes(q)) : products;
  if (q && !list.length) return null;
  const shown = q ? list : list.slice(0, n);
  return (
    <section id={slug} className="scroll-mt-32 pt-9">
      <h2 className="text-3xl font-extrabold text-accent">{name}</h2>
      {image && !q && <div className="mt-3 aspect-[16/8] w-full rounded-[28px] bg-cover bg-center md:aspect-[3/1]" style={{ backgroundImage: `url(${image})` }} />}
      <div className="mt-5 grid gap-x-6 gap-y-9 md:grid-cols-3 lg:grid-cols-4">{shown.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      {!q && n < list.length && (
        <button onClick={() => setN(n + 12)} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blush text-sm font-bold text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 9l6 6 6-6" /></svg>Показать ещё
        </button>
      )}
    </section>
  );
}
