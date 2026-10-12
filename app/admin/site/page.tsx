import Link from 'next/link';
import SiteSettingsForm from '@/components/SiteSettingsForm';
import { getSettings } from '@/lib/settings';
import { supabaseSession } from '@/lib/supabase/ssr';
import { saveSettings } from './actions';

export const dynamic = 'force-dynamic';
export default async function SiteAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams; const s = await getSettings();
  const { data: cats } = await (await supabaseSession()).from('categories').select('name').order('sort_order');
  return (
    <div className="py-6">
      <Link href="/admin" className="text-sm font-bold text-accent">← К заказам</Link>
      <SiteSettingsForm initial={s} categories={(cats ?? []).map((c) => c.name)} action={saveSettings} saved={!!saved} />
    </div>
  );
}
