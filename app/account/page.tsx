import PushToggle from '@/components/PushToggle';
import { supabaseSession } from '@/lib/supabase/ssr';
const LABEL: Record<string, string> = { pending: 'Принят', confirmed: 'Подтверждён', preparing: 'Готовится', ready: 'Готов', delivered: 'Доставлен', cancelled: 'Отменён' };
export default async function Account() {
  const sb = await supabaseSession();
  const { data: orders } = await sb.from('orders').select('id,number,status,total,created_at,order_items(name,variant_label,qty)').order('created_at', { ascending: false });
  return (
    <div className="py-6">
      <h1 className="mb-4 text-3xl font-black">Мои заказы</h1>
      <PushToggle />
      {!orders?.length && <p className="py-10 text-center text-mute">Заказов пока нет.</p>}
      <div className="space-y-3">
        {orders?.map((o) => (
          <article key={o.id} className="rounded-[24px] bg-card p-5 shadow-soft">
            <div className="flex justify-between font-black"><span>№ {o.number}</span><span>{o.total} ₽</span></div>
            <div className="text-sm font-bold text-orange-500">{LABEL[o.status] ?? o.status}</div>
            <ul className="mt-2 text-sm text-mute">{o.order_items.map((i: any, k: number) => <li key={k}>{i.name} ({i.variant_label}) × {i.qty}</li>)}</ul>
          </article>
        ))}
      </div>
    </div>
  );
}
