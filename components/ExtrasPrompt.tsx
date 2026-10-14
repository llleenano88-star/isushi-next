'use client';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/store/cart';
import type { Extra } from '@/lib/types';

// Плашка «Хотите добавить к заказу?» при добавлении первого блюда в пустую корзину
export default function ExtrasPrompt({ extras }: { extras: Extra[] }) {
  const ask = useCart((s) => s.askExtras); const setAsk = useCart((s) => s.setAsk); const add = useCart((s) => s.add);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!ask) return;
    if (!extras.length) { setAsk(false); return; }
    setSel(Object.fromEntries(extras.map((e) => [e.id, e.default])));
  }, [ask, extras, setAsk]);
  if (!ask || !extras.length) return null;
  const confirmAdd = () => {
    extras.filter((e) => sel[e.id]).forEach((e) => add({ productId: e.id, name: e.name, label: '', price: e.price, image: e.image ?? null, extra: true }));
    setAsk(false);
  };
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-black/50" onClick={() => setAsk(false)} />
      <div role="dialog" aria-label="Хотите добавить к заказу?" className="fixed inset-x-0 bottom-0 z-[90] mx-auto max-h-[85vh] max-w-lg overflow-y-auto rounded-t-[32px] bg-bg p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-soft">
        <h2 className="text-2xl font-extrabold">Хотите добавить к заказу?</h2>
        <ul className="mt-4 space-y-2">
          {extras.map((e) => (
            <li key={e.id}>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
                <input type="checkbox" checked={!!sel[e.id]} onChange={(ev) => setSel({ ...sel, [e.id]: ev.target.checked })} className="h-6 w-6 shrink-0 accent-[#2f6b2e]" />
                {e.image && <span className="h-10 w-10 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${e.image})` }} />}
                <span className="min-w-0 flex-1 font-bold">{e.name}</span>
                <b className="whitespace-nowrap">{e.price > 0 ? `${e.price} ₽` : 'бесплатно'}</b>
              </label>
            </li>
          ))}
        </ul>
        <button onClick={confirmAdd} className="mt-4 h-14 w-full rounded-xl bg-brand text-lg font-bold text-white">Добавить в заказ</button>
        <button onClick={() => setAsk(false)} className="mt-2 h-12 w-full font-bold text-mute">Пропустить</button>
      </div>
    </>
  );
}
