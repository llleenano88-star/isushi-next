import { supabaseSession } from '@/lib/supabase/ssr';
export default async function Account() {
  const sb = await supabaseSession();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from('profiles').select('name,phone').eq('id', user.id).maybeSingle();
  const { data: orders } = await sb.from('orders').select('id,number,total,created_at,order_items(name,variant_label,qty)').eq('user_id', user.id).order('created_at', { ascending: false });
  return (
    <div className="py-6">
      <h1 className="mb-4 font-display text-4xl font-bold text-accent">Мой аккаунт</h1>
      <section className="mb-6 rounded-[24px] bg-card p-5 shadow-soft">
        <h2 className="mb-2 font-extrabold">Данные для заказов</h2>
        <p className="text-sm text-mute">Почта: {user.email ?? '—'}</p>
        <p className="text-sm text-mute">Имя: {profile?.name || 'Добавится при первом заказе'}</p>
        <p className="text-sm text-mute">Телефон: {profile?.phone || 'Добавится при первом заказе'}</p>
      </section>
      <h2 className="mb-4 font-display text-2xl font-bold text-accent">Мои заказы</h2>
      {!orders?.length && <p className="py-10 text-center text-mute">Заказов пока нет.</p>}
      <div className="space-y-3">
        {orders?.map((o) => (
          <article key={o.id} className="rounded-[24px] bg-card p-5 shadow-soft">
            <div className="flex justify-between font-black"><span>№ {o.number}</span><span>{o.total} ₽</span></div>
            <div className="text-sm text-mute">{new Date(o.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <ul className="mt-2 text-sm text-mute">{o.order_items.map((i: any, k: number) => <li key={k}>{i.name} ({i.variant_label}) × {i.qty}</li>)}</ul>
          </article>
        ))}
      </div>
    </div>
  );
}
