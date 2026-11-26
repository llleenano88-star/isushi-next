import Link from 'next/link';

export default function Footer() {
  const link = 'px-2 py-1 text-center text-sm font-medium leading-5 text-white/90 transition hover:text-white';
  return (
    <footer className="mt-12 bg-[#16191d] text-white/70">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <nav aria-label="Документы" className="grid grid-cols-3 items-start gap-2">
          <Link href="/requisites" className={link}>Юридическая информация</Link>
          <Link href="/privacy" className={link}>Персональные данные</Link>
          <Link href="/oferta" className={link}>Публичная оферта</Link>
        </nav>
        <p className="mt-6 text-center text-xs leading-5 text-white/50">
          г. Самара, Пугачёвский тракт, 80 · Тел.: <a href="tel:+78462021020" className="text-white/70 hover:text-white">+7 (846) 202-10-20</a>
        </p>
        <p className="mt-2 text-center text-xs text-white/40">© {new Date().getFullYear()} iSushiClub</p>
      </div>
    </footer>
  );
}
