'use client';
import { useEffect, useState } from 'react';
export default function Header() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark-theme')), []);
  const toggle = () => {
    const v = document.documentElement.classList.toggle('dark-theme');
    setDark(v); try { localStorage.setItem('theme', v ? 'dark' : 'light'); } catch {}
  };
  return (
    <header className="sticky top-0 z-40 bg-bg/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <span className="text-xl font-black tracking-tight">i<span className="bg-brand bg-clip-text text-transparent">Sushi</span>Club</span>
        <button onClick={toggle} aria-label="Сменить тему" className="grid h-12 w-12 place-items-center rounded-full bg-card shadow-soft">{dark ? '☀️' : '🌙'}</button>
      </div>
    </header>
  );
}
