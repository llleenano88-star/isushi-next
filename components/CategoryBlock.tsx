'use client';
import { useState } from 'react';
import ProductCard, { type Product } from './ProductCard';

export default function CategoryBlock({
  slug,
  name,
  image,
  products,
}: {
  slug: string;
  name: string;
  image?: string;
  products: Product[];
}) {
  const [n, setN] = useState(4);
  return (
    <section id={slug} className="scroll-mt-32 pt-8">
      <div
        className="relative grid h-36 place-items-center overflow-hidden rounded-[24px] bg-cover bg-center sm:h-48"
        style={image ? { backgroundImage: `url(${image})` } : undefined}
      >
        {!image && <div className="absolute inset-0 bg-gradient-to-r from-[#5c9a4c] to-[#2f6b2e]" />}
        <h2 className="relative max-w-[90%] rounded-2xl bg-white/90 px-6 py-3 text-center text-2xl font-extrabold lowercase text-[#1f2a1c] sm:text-3xl">
          {name}
        </h2>
      </div>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {products.slice(0, n).map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
      {n < products.length && (
        <button
          onClick={() => setN(n + 6)}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-sage text-lg font-bold text-white"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          Показать ещё
        </button>
      )}
    </section>
  );
}