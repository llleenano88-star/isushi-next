'use client';
import { useEffect, useState } from 'react';
export default function ScrollTop() {
  const [show, setShow] = useState(false);
  useEffect(() => { const h = () => setShow(scrollY > 600); addEventListener('scroll', h, { passive: true }); return () => removeEventListener('scroll', h); }, []);
  if (!show) return null;
  return <button aria-label="Наверх" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-[calc(140px+env(safe-area-inset-bottom))] right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-card text-xl shadow-soft">↑</button>;
}
