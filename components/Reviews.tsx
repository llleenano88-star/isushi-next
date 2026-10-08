import { REVIEWS } from '@/lib/content';
export default function Reviews() {
  if (!REVIEWS.length) return null;
  return (
    <section className="my-10">
      <h2 className="mb-4 font-display text-3xl font-bold text-accent">Отзывы</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {REVIEWS.map((r, i) => (
          <figure key={i} className="rounded-[24px] bg-brand p-6 text-white shadow-soft">
            <span className="font-display text-5xl leading-none">“</span>
            <blockquote className="text-sm leading-relaxed">{r.text}</blockquote>
            <figcaption className="mt-3 text-xs font-bold opacity-80">{r.author}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
