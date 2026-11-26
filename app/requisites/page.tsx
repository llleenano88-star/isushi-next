import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Юридическая информация', alternates: { canonical: '/requisites' } };

const rows: [string, string][] = [
  ['Продавец', 'Индивидуальный предприниматель Гурман Дмитрий Алексеевич (ИП Гурман Д.А.)'],
  ['ИНН', '631815404570'],
  ['ОГРНИП', '322631200045874'],
  ['Фактический адрес', 'г. Самара, Пугачёвский тракт, д. 80'],
  ['Телефон', '+7 (846) 202-10-20'],
  ['E-mail', 'llleenano88@gmail.com'],
  ['Сайт', 'isushiclub.ru'],
];

const docs: [string, string][] = [
  ['/terms', 'Условия доставки, оплаты и возврата'],
  ['/oferta', 'Публичная оферта'],
  ['/privacy', 'Политика обработки персональных данных и cookie'],
  ['/consent', 'Согласие на обработку персональных данных'],
];

export default function Page() {
  return (
    <article className="mx-auto max-w-3xl py-8 text-ink">
      <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">Юридическая информация</h1>
      <h2 className="mt-6 text-lg font-extrabold">Реквизиты</h2>
      <dl className="mt-3 divide-y divide-black/10 rounded-2xl bg-card shadow-soft">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]">
            <dt className="text-sm text-mute">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-8 text-lg font-extrabold">Документы</h2>
      <ul className="mt-3 divide-y divide-black/10 rounded-2xl bg-card shadow-soft">
        {docs.map(([href, title]) => (
          <li key={href}><Link href={href} className="flex items-center justify-between gap-3 px-4 py-3 font-semibold">{title}<span aria-hidden className="text-mute">›</span></Link></li>
        ))}
      </ul>
    </article>
  );
}
