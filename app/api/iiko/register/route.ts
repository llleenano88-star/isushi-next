import { NextResponse } from 'next/server';
import { registerWebhook } from '@/lib/iiko';
// Разовый вызов: GET /api/iiko/register с заголовком Authorization: Bearer $CRON_SECRET
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new NextResponse('Unauthorized', { status: 401 });
  return NextResponse.json(await registerWebhook(`${process.env.SITE_URL}/api/iiko/webhook`));
}
