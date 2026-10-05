'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
export default function Login() {
  const [email, setEmail] = useState(''); const [state, setState] = useState<'idle' | 'sent' | 'error'>('idle');
  const submit = async () => {
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setState(error ? 'error' : 'sent');
  };
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-6 text-3xl font-black">Вход</h1>
      <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ваш email"
        className="mb-3 h-14 w-full rounded-full bg-card px-6 font-semibold shadow-soft outline-none focus:ring-2 focus:ring-orange-400" />
      <button onClick={submit} disabled={!email} className="h-14 w-full rounded-full bg-brand font-black text-black shadow-soft disabled:opacity-50">Получить ссылку для входа</button>
      {state === 'sent' && <p className="mt-4 text-sm text-mute">Письмо отправлено. Откройте ссылку из него на этом устройстве.</p>}
      {state === 'error' && <p className="mt-4 text-sm text-red-500">Не удалось отправить письмо. Проверьте адрес и повторите.</p>}
    </div>
  );
}
