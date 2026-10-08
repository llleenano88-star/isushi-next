import { BENEFITS } from '@/lib/content';
const P: Record<string, React.ReactNode> = {
  leaf: <path d="M5 19c0-9 6-14 14-14 0 8-5 14-14 14zM5 19c3-4 6-6 9-8" />,
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.500-7 10-7 10z" />,
  truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.800" /><circle cx="17" cy="18" r="1.800" /></>,
  hand: <path d="M4 14h4l4 3h5a2 2 0 0 0 0-4h-4M8 14V8l4-3 4 3v3" />,
};
export default function Footer() {
  return (
    <footer className="mx-auto mt-12 max-w-6xl px-4 pb-6">
      <ul className="grid grid-cols-2 gap-6 rounded-[32px] bg-card p-6 shadow-soft md:grid-cols-4 md:p-10">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex flex-col items-center gap-2 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{P[b.icon]}</svg>
            </span>
            <b className="font-display text-base font-bold leading-tight">{b.title}</b>
            <span className="text-xs text-mute">{b.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-center text-xs text-mute">© {new Date().getFullYear()} iSushiClub</p>
    </footer>
  );
}
