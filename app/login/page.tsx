'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Куда вернуть после входа (только внутри сайта)
const nextPath = () => { const n = new URLSearchParams(location.search).get('next') ?? '/account'; return n.startsWith('/') && !n.startsWith('//') ? n : '/account'; };

export default function Login() {
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle'); const [err, setErr] = useState('');
  const submit = async () => {
    setState('busy'); setErr('');
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(nextPath())}` } });
    setState(error ? 'error' : 'sent');
  };
  // Вход по коду из письма: работает, даже если ссылку из письма открыло другое приложение или браузер
  const verify = async () => {
    setErr('');
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (error) { setErr('Неверный или устаревший код. Запросите новый.'); return; }
    location.href = nextPath();
  };
  const input = 'mb-3 h-14 w-full rounded-full bg-card px-6 font-semibold shadow-soft outline-none focus:ring-2 focus:ring-accent';
  return (
    <div className="mx-auto my-6 max-w-sm rounded-[28px] bg-card p-6 shadow-soft">
      <h1 className="mb-2 font-display text-4xl font-bold text-accent">Вход</h1>
      <p className="mb-5 text-sm text-mute">Войдите по почте один раз, и мы запомним ваши имя, телефон и заказы.</p>
      <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ваш email" className={input} />
      <button onClick={submit} disabled={!email || state === 'busy'} className="h-14 w-full rounded-full bg-brand font-black text-white shadow-soft disabled:opacity-50">{state === 'sent' ? 'Отправить ещё раз' : 'Получить код и ссылку'}</button>
      {state === 'sent' && (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-mute">Письмо отправлено. Нажмите ссылку в письме или введите код из него ниже.</p>
          <input inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="Код из письма" className={input} />
          <button onClick={verify} disabled={code.length < 6} className="h-14 w-full rounded-full bg-brand font-black text-white shadow-soft disabled:opacity-50">Войти по коду</button>
        </div>
      )}
      {err && <p className="mt-3 text-sm text-red-500">{err}</p>}
      {state === 'error' && <p className="mt-4 text-sm text-red-500">Не удалось отправить письмо. Проверьте адрес и повторите.</p>}
    </div>
  );
}
