import type { ReactNode } from 'react';

// Раздел, который раскрывается по нажатию на заголовок
export function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <details id={id} className="group mt-3 rounded-2xl bg-card p-4 shadow-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-extrabold [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span aria-hidden className="text-xl leading-none text-mute transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 space-y-3 text-[15px] leading-7">{children}</div>
    </details>
  );
}
export const UL = ({ children }: { children: ReactNode }) => <ul className="list-disc space-y-1 pl-6">{children}</ul>;
