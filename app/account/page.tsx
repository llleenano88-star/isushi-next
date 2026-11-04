import { redirect } from 'next/navigation';
import { supabaseSession } from '@/lib/supabase/ssr';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const SELECT = 'id,number,total,created_at,order_items(name,variant_label,qty)';

export default async function Account() {
  const { data: { user } } = await (await supabaseSession()).auth.getUser();
  if (!user) redirect('/login');
  // Показываем только заказы этого клиента: по его аккаунту или по его почте. Фильтр задан явно, поэтому
  // даже у администратора здесь видны только его собственные заказы (раньше права администратора показывали все).
  const email = (user.email ?? '').trim().toLowerCase();
  const db = supabaseAdmin();
  let orders: any[] | null = null;
  if (/^[^\s,()]+@[^\s,()]+$/.test(email)) {
    const r = await db.from('orders').select(SELECT).or(`user_id.eq.${user.id},customer_email.eq.${email}`).order('created_at', { ascending: false });
    if (!r.error) orders = r.data;
  }
  const list: any[] = orders ?? (await db.from('orders').select(SELECT).eq('user_id', user.id).order('created_at', { ascending: false })).data ?? [];
  return (
    <div className="py-6">
      <h1 className="mb-1 font-display text-4xl font-bold text-accent">Мои заказы</h1>
      {email && <p className="mb-4 text-sm text-mute">Вы вошли как {email}</p>}
      {!list.length && <p className="py-10 text-center text-mute">Заказов пока нет.</p>}
      <div className="space-y-3">
        {list.map((o) => (
          <article key={o.id} className="rounded-[24px] bg-card p-5 shadow-soft">
            <div className="flex justify-between font-black"><span>№ {o.number}</span><span>{o.total} ₽</span></div>
            <div className="text-sm text-mute">{new Date(o.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <ul className="mt-2 text-sm text-mute">{(o.order_items ?? []).map((i: any, k: number) => <li key={k}>{i.name} ({i.variant_label}) × {i.qty}</li>)}</ul>
          </article>
        ))}
      </div>
    </div>
  );
}
