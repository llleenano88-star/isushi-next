import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Реквизиты', alternates: { canonical: '/requisites' } };

const rows: [string, string][] = [
  ['Продавец', 'Индивидуальный предприниматель Гурман Дмитрий Алексеевич (ИП Гурман Д.А.)'],
  ['ИНН', '631815404570'],
  ['ОГРНИП', '322631200045874'],
  ['Фактический адрес', 'г. Самара, Пугачёвский тракт, д. 80'],
  ['Телефон', '+7 (846) 202-10-20'],
  ['E-mail', 'llleenano88@gmail.com'],
  ['Сайт', 'isushiclub.ru'],
];

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl py-8 text-ink">
      <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">Реквизиты</h1>
      <dl className="mt-5 divide-y divide-black/10 rounded-2xl bg-card shadow-soft">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]">
            <dt className="text-sm text-mute">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
