'use client';
import { useEffect, useRef, useState } from 'react';
import Checkout from './Checkout';
import { useCart, selectCount, selectTotal, type CartItem } from '@/lib/store/cart';

function Row({ it }: { it: CartItem }) {
  const { setQty, remove } = useCart();
  const [dx, setDx] = useState(0); const x0 = useRef<number | null>(null);
  const btn = 'grid h-12 w-12 place-items-center rounded-full bg-black/5 text-xl font-black dark:bg-white/10';
  return (
    <div className="relative overflow-hidden rounded-[20px] bg-red-500">
      <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-white">Удалить</span>
      <div className="relative flex touch-pan-y items-center gap-3 bg-card p-3 transition-transform" style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={(e) => (x0.current = e.clientX)}
        onPointerMove={(e) => x0.current !== null && setDx(Math.min(0, e.clientX - x0.current))}
        onPointerUp={() => { if (dx < -80) remove(it.key); setDx(0); x0.current = null; }}
        onPointerCancel={() => { setDx(0); x0.current = null; }}>
        <div className="min-w-0 flex-1"><div className="truncate font-extrabold">{it.name}</div><div className="text-xs text-mute">{it.label} · {it.price} ₽</div></div>
        <button className={btn} onClick={() => setQty(it.key, it.qty - 1)} aria-label="Меньше">−</button>
        <b className="w-5 text-center">{it.qty}</b>
        <button className={btn} onClick={() => setQty(it.key, it.qty + 1)} aria-label="Больше">+</button>
      </div>
    </div>
  );
}

export default function CartSheet() {
  const items = useCart((s) => s.items); const open = useCart((s) => s.open); const setOpen = useCart((s) => s.setOpen);
  const count = useCart(selectCount); const total = useCart(selectTotal);
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  useEffect(() => { if (!open) setStep('cart'); }, [open]);
  return (
    <>
      {count > 0 && !open && (
        <button onClick={() => setOpen(true)} className="fixed inset-x-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 mx-auto flex h-14 max-w-md items-center justify-between rounded-full bg-brand px-6 font-black text-black shadow-soft">
          <span>Корзина · {count}</span><span>{total} ₽</span>
        </button>
      )}
      {open && <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[90vh] max-w-lg overflow-y-auto rounded-t-[32px] bg-bg p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-soft transition-transform duration-300 ease-spring ${open ? 'translate-y-0' : 'translate-y-full'}`} aria-hidden={!open}>
        <div className="mb-3 flex items-center justify-between">
          {step === 'checkout' ? <button onClick={() => setStep('cart')} className="h-12 pr-4 text-sm font-bold text-orange-500">← К корзине</button> : <h2 className="text-2xl font-black">Корзина</h2>}
          <button onClick={() => setOpen(false)} className="h-12 w-12 text-xl" aria-label="Закрыть">✕</button>
        </div>
        {items.length === 0 ? <p className="py-10 text-center text-mute">Пока пусто. Добавьте что-нибудь из меню.</p>
          : step === 'cart' ? (
            <>
              <div className="space-y-2">{items.map((it) => <Row key={it.key} it={it} />)}</div>
              <p className="mt-2 text-center text-xs text-mute">Смахните позицию влево, чтобы удалить</p>
              <div className="mt-4 flex items-center justify-between rounded-[24px] bg-brand p-5 text-black"><span className="font-bold">Итого</span><span className="text-2xl font-black">{total} ₽</span></div>
              <button onClick={() => setStep('checkout')} className="mt-3 h-14 w-full rounded-full bg-black font-black text-white shadow-soft">Оформить заказ</button>
            </>
          ) : <Checkout />}
      </aside>
    </>
  );
}
