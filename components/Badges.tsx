import PepperIcon from './PepperIcon';

const Sparkle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M9 3l1.6 4.4L15 9l-4.4 1.6L9 15l-1.6-4.4L3 9l4.4-1.6zM17 11l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1zM17 2l.7 1.8L19.5 4.5l-1.8.7L17 7l-.7-1.8L14.5 4.5l1.8-.7z" /></svg>;
const Flame = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2c1 3.5-1.5 5-2.5 7-.8 1.6-.3 3 .7 3.8C9.4 11.5 9 10 9.5 8.5 7 10 5 12.5 5 15.5 5 19.4 8 22 12 22s7-2.6 7-6.5c0-4.2-3.2-6.5-4.5-9-.7 1.2-1.2 2-2 2.5C13 7.5 13.5 4.5 12 2z" /></svg>;

const pill = 'inline-flex h-7 items-center gap-1 rounded-full pr-3 text-[11px] font-extrabold uppercase tracking-wide';
const dot = 'ml-0.5 grid h-7 w-7 place-items-center rounded-full';

// Значки на карточке: ХИТ (оранжевый), ОСТРО (зелёный), НОВИНКА (персиковый)
export default function Badges({ hit, spicy, isNew, promo }: { hit?: boolean; spicy?: boolean; isNew?: boolean; promo?: boolean }) {
  if (!hit && !spicy && !isNew && !promo) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {promo && <span className={`${pill} bg-[#fde0ee] text-[#c2185b]`}><span className={`${dot} bg-[#f9b8d8]`}><Sparkle /></span>Акция</span>}
      {hit && <span className={`${pill} bg-[#ffe3bd] text-[#c2410c]`}><span className={`${dot} bg-[#ffc983]`}><Flame /></span>Хит</span>}
      {spicy && <span className={`${pill} bg-[#d4f1b3] text-[#2c6a14]`}><span className={`${dot} bg-[#aedf7a]`}><PepperIcon green size={16} /></span>Остро</span>}
      {isNew && <span className={`${pill} bg-[#ffe0d3] text-[#e4572e]`}><span className={`${dot} bg-[#ffc7b0]`}><Sparkle /></span>Новинка</span>}
    </div>
  );
}
