import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { notifyStatus } from '@/lib/push';
import { supabaseSession } from '@/lib/supabase/ssr';

const STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
const LABEL: Record<string, string> = { pending: 'Принят', confirmed: 'Подтверждён', preparing: 'Готовится', ready: 'Готов', delivered: 'Доставлен', cancelled: 'Отменён' };

async function setStatus(fd: FormData) {
  'use server';
  const status = String(fd.get('status')); if (!STATUSES.includes(status)) return;
  const { data } = await (await supabaseSession()).from('orders').update({ status, updated_at: new Date().toISOString() })
    .eq('id', String(fd.get('id'))).select('user_id,number').maybeSingle(); // RLS: только admin
  if (data) await notifyStatus(data.user_id, data.number, status);
  revalidatePath('/admin');
}
async function setAvailable(fd: FormData) {
  'use server';
  await (await supabaseSession()).from('products').update({ is_available: fd.get('to') === '1' }).eq('id', String(fd.get('id')));
  revalidatePath('/admin');
}

export default async function Admin() {
  const sb = await supabaseSession();
  const [{ data: orders }, { data: products }] = await Promise.all([
    sb.from('orders').select('id,number,status,phone,customer_name,receive_type,address,total,created_at,iiko_order_id').order('created_at', { ascending: false }).limit(50),
    sb.from('products').select('id,name,is_available').order('name'),
  ]);
  const btn = 'min-h-12 rounded-full bg-brand px-5 text-sm font-black text-black';
  return (
    <div className="py-6">
      <h1 className="mb-4 text-3xl font-black">Заказы</h1>
      <div className="space-y-3">
        {orders?.map((o) => (
          <form key={o.id} action={setStatus} className="flex flex-wrap items-center gap-3 rounded-[24px] bg-card p-4 shadow-soft">
            <input type="hidden" name="id" value={o.id} />
            <div className="min-w-0 flex-1">
              <div className="font-black">№ {o.number} · {o.total} ₽ {!o.iiko_order_id && <span className="text-xs text-red-500">не в iiko</span>}</div>
              <div className="text-xs text-mute">{o.customer_name}, {o.phone} · {o.receive_type === 'delivery' ? (o.address as any)?.text : 'самовывоз'}</div>
            </div>
            <select name="status" defaultValue={o.status} className="h-12 rounded-full bg-bg px-4 font-bold">{STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}</select>
            <button className={btn}>Сохранить</button>
          </form>
        ))}
      </div>
      <div className="mb-4 mt-10 flex items-center justify-between"><h2 className="text-2xl font-black">Товары</h2><Link href="/admin/products/new" className={btn}>+ Добавить</Link></div>
      <div className="space-y-2">
        {products?.map((p) => (
          <form key={p.id} action={setAvailable} className="flex items-center gap-3 rounded-[20px] bg-card px-4 py-2 shadow-soft">
            <input type="hidden" name="id" value={p.id} /><input type="hidden" name="to" value={p.is_available ? '0' : '1'} />
            <span className={`flex-1 font-bold ${p.is_available ? '' : 'text-mute line-through'}`}>{p.name}</span>
            <Link href={`/admin/products/${p.id}`} className="flex min-h-12 items-center px-3 text-sm font-bold text-orange-500">Изменить</Link>
            <button className={btn}>{p.is_available ? 'Скрыть' : 'Показать'}</button>
          </form>
        ))}
      </div>
    </div>
  );
}
