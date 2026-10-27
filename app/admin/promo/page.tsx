import Link from 'next/link';
import ConfirmButton from '@/components/ConfirmButton';
import { supabaseSession } from '@/lib/supabase/ssr';
import { savePromo, deletePromo } from './promoActions';

export const dynamic = 'force-dynamic';
const inp = 'h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent';
const lab = 'block text-[11px] font-bold text-mute';
const btn = 'min-h-11 rounded-full bg-brand px-5 text-sm font-black text-white';

function Fields({ p }: { p?: any }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <label className={lab}>Код<input name="code" required defaultValue={p?.code} placeholder="WELCOME10" className={`${inp} uppercase`} /></label>
      <label className={lab}>Тип скидки
        <select name="discount_type" defaultValue={p?.discount_type ?? 'percent'} className={inp}>
          <option value="percent">Процент</option><option value="fixed">Сумма, ₽</option><option value="free_delivery">Бесплатная доставка</option>
        </select>
      </label>
      <label className={lab}>Размер скидки<input name="discount_value" type="number" step="any" min="0" defaultValue={p?.discount_value ?? 0} className={inp} /></label>
      <label className={lab}>Мин. сумма заказа, ₽<input name="min_order" type="number" step="any" min="0" defaultValue={p?.min_order ?? 0} className={inp} /></label>
      <label className={lab}>Действует до<input name="expires_at" type="date" defaultValue={p?.expires_at ? String(p.expires_at).slice(0, 10) : ''} className={inp} /></label>
      <label className={lab}>Лимит использований<input name="max_uses" type="number" min="1" defaultValue={p?.max_uses ?? ''} placeholder="без лимита" className={inp} /></label>
      <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" name="active" defaultChecked={p ? p.active : true} className="h-5 w-5 accent-[#d81b7a]" />Активен</label>
    </div>
  );
}

export default async function PromoAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const sp = await searchParams;
  const { data, error } = await (await supabaseSession()).from('promo_codes').select('*').order('created_at', { ascending: false });
  return (
    <div className="space-y-4 py-6">
      <Link href="/admin" className="text-sm font-bold text-accent">← К заказам</Link>
      <h1 className="font-display text-4xl font-bold text-accent">Промокоды</h1>
      {sp.saved && <p className="rounded-2xl bg-blush p-3 text-sm font-bold text-accent">Сохранено.</p>}
      {sp.err && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">Не удалось сохранить. Проверьте поля: код (латиница, цифры), процент не больше 100. Код должен быть уникальным.</p>}
      {error && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">Таблица промокодов недоступна. Выполните в Supabase миграцию 007_orders_promo_categories.sql.</p>}

      <form action={savePromo} className="space-y-3 rounded-[24px] bg-card p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Новый промокод</h2>
        <Fields />
        <button className={btn}>Добавить</button>
      </form>

      {(data ?? []).map((p: any) => (
        <form key={p.id} action={savePromo} className="space-y-3 rounded-[24px] bg-card p-5 shadow-soft">
          <input type="hidden" name="id" value={p.id} />
          <div className="flex items-center justify-between gap-3">
            <b className="text-lg">{p.code}</b>
            <span className="text-xs font-semibold text-mute">Использован: {p.uses_count}{p.max_uses ? ` из ${p.max_uses}` : ''}</span>
          </div>
          <Fields p={p} />
          <div className="flex gap-2">
            <button className={btn}>Сохранить</button>
            <ConfirmButton action={deletePromo} message={`Удалить промокод ${p.code}?`} className="min-h-11 rounded-full bg-blush px-5 text-sm font-black text-accent">Удалить</ConfirmButton>
          </div>
        </form>
      ))}
      {!error && !(data ?? []).length && <p className="py-6 text-center text-mute">Промокодов пока нет.</p>}
    </div>
  );
}
