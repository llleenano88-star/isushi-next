import Link from 'next/link';

export default function Footer() {
  const pill = 'inline-flex min-h-10 items-center rounded-full border border-white/25 px-4 text-xs font-semibold text-white/90 transition hover:bg-white/10';
  return (
    <footer className="mt-12 bg-[#16191d] text-sm text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="leading-6">
          г. Самара, Пугачёвский тракт, 80<br />
          Тел.: <a href="tel:+78462021020" className="text-white/90 hover:text-white">+7 (846) 202-10-20</a>
        </p>
        <nav aria-label="Документы" className="mt-4 flex flex-wrap gap-2">
          <Link href="/terms" className={pill}>Условия доставки и возврата</Link>
          <Link href="/oferta" className={pill}>Публичная оферта</Link>
          <Link href="/privacy" className={pill}>Политика конфиденциальности и cookie</Link>
          <Link href="/consent" className={pill}>Согласие на обработку данных</Link>
          <Link href="/requisites" className={pill}>Реквизиты</Link>
        </nav>
        <p className="mt-5 text-xs text-white/40">© {new Date().getFullYear()} iSushiClub</p>
      </div>
    </footer>
  );
}
