import type { QuestionsBlock as Q } from '@/lib/types';

// Блок «Остались вопросы?». Текст и контакты меняются в админке (раздел «Контакты»).
export default function QuestionsBlock({ q, compact = false }: { q: Q; compact?: boolean }) {
  const tel = q.phone.replace(/[^\d+]/g, '');
  const btn = 'flex h-11 items-center justify-center rounded-full px-5 text-sm font-extrabold transition ease-spring active:scale-95';
  const actions = (
    <div className={`flex flex-wrap gap-2 ${compact ? 'sm:justify-end' : 'justify-center'}`}>
      {q.phone && <a href={`tel:${tel}`} className={`${btn} bg-brand text-white`}>{q.phone}</a>}
      {q.links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={`${btn} bg-blush text-accent`}>{l.label}</a>)}
    </div>
  );
  if (compact) return (
    <section aria-label={q.title} className="mt-4 flex flex-col gap-3 rounded-2xl bg-blush px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-base font-extrabold text-accent">{q.title}</p><p className="mt-0.5 text-sm leading-snug">{q.text}</p></div>
      {actions}
    </section>
  );
  return (
    <section aria-label={q.title} className="mt-6 rounded-[28px] bg-blush p-6 text-center sm:p-10">
      <h2 className="text-2xl font-extrabold text-accent sm:text-3xl">{q.title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed">{q.text}</p>
      <div className="mt-5">{actions}</div>
    </section>
  );
}
