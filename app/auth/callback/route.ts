import { NextResponse } from 'next/server';
import { supabaseSession } from '@/lib/supabase/ssr';
export async function GET(req: Request) {
  const url = new URL(req.url); const code = url.searchParams.get('code');
  if (code) await (await supabaseSession()).auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL('/account', url.origin));
}
