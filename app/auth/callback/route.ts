import { NextResponse } from 'next/server';
import { supabaseSession } from '@/lib/supabase/ssr';
import { SITE_URL } from '@/lib/site';

export async function GET(req: Request) {
  const url = new URL(req.url); const code = url.searchParams.get('code');
  if (code) await (await supabaseSession()).auth.exchangeCodeForSession(code);
  // За прокси хостинга (Timeweb) req.url показывает внутренний адрес localhost:3000, поэтому настоящий адрес берём
  // из заголовков прокси, а если их нет, из SITE_URL. Локально (npm run dev) остаётся адрес из запроса.
  let origin = url.origin;
  if (process.env.NODE_ENV === 'production') {
    const host = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? '').split(',')[0].trim();
    const proto = (req.headers.get('x-forwarded-proto') ?? 'https').split(',')[0].trim();
    origin = host && !/^(localhost|127\.0\.0\.1)/.test(host) ? `${proto}://${host}` : SITE_URL;
  }
  return NextResponse.redirect(new URL('/account', origin));
}
