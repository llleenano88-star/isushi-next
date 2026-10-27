import Link from 'next/link';
import ConfirmButton from '@/components/ConfirmButton';
import { supabaseSession } from '@/lib/supabase/ssr';
import { saveCategory, toggleCategory, deleteCategory } from './categoryActions';

export const dynamic = 'force-dynamic';
const inp = 'h-11 w-full rounded-xl border border-black/10 bg-transparent px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent';
const lab = 'block text-[11px] font-bold text-mute';
const btn = 'min-h-11 rounded-full bg-brand px-5 text-sm font-black text-white';
const soft = 'min-h-11 rounded-full bg-blush px-5 text-sm font-black text-accent';

export default async function CategoriesAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; err?: string }> }) {
  const sp = await searchParams; const sb = await supabaseSession();
  let r = await sb.from('categories').select('id,name,slug,sort_order,is_visible').order('sort_order');
  const noColumn = !!r.error;
  if (r.error) r = (await sb.from('categories').select('id,name,slug,sort_order').order('sort_order')) as typeof r;
  const cats = (r.data ?? []) as { id: string; name: string; slug: string; sort_order: number; is_visible?: boolean }[];
  return (
    <div className="space-y-4 py-6">
      <Link href="/admin" className="text-sm font-bold text-accent">← К заказам</Link>
      <h1 className="font-display text-4xl font-bold text-accent">Категории</h1>
      <p className="text-sm text-mute">Порядок задаётся числом: меньше число, выше категория. Скрытая категория и её блюда не показываются на сайте. Категории, пришедшие из iiko, обновляют название при синхронизации меню.</p>
      {sp.saved && <p className="rounded-2xl bg-blush p-3 text-sm font-bold text-accent">Сохранено.</p>}
      {sp.err && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">Не удалось сохранить. Адрес (slug) должен быть уникальным, только латиница, цифры и дефис. Если ошибка повторяется, выполните миграцию 007.</p>}
      {noColumn && <p className="rounded-2xl bg-red-100 p-3 text-sm font-bold text-red-700">Нет колонки видимости. Выполните в Supabase миграцию 007_orders_promo_categories.sql.</p>}

      <form action={saveCategory} className="space-y-3 rounded-[24px] bg-card p-5 shadow-soft">
        <h2 className="text-lg font-extrabold">Новая категория</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <label className={lab}>Название<input name="name" required className={inp} /></label>
          <label className={lab}>Адрес (slug), необязательно<input name="slug" placeholder="rolls" className={inp} /></label>
          <label className={lab}>Порядок<input name="sort_order" type="number" defaultValue={cats.length + 1} className={inp} /></label>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" name="is_visible" defaultChecked className="h-5 w-5 accent-[#d81b7a]" />Показывать</label>
        </div>
        <button className={btn}>Добавить</button>
      </form>

      {cats.map((c) => (
        <form key={c.id} action={saveCategory} className="space-y-3 rounded-[24px] bg-card p-5 shadow-soft">
          <input type="hidden" name="id" value={c.id} />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className={lab}>Название<input name="name" required defaultValue={c.name} className={inp} /></label>
            <label className={lab}>Адрес (slug)<input name="slug" defaultValue={c.slug} className={inp} /></label>
            <label className={lab}>Порядок<input name="sort_order" type="number" defaultValue={c.sort_order} className={inp} /></label>
            <label className="flex min-h-11 items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" name="is_visible" defaultChecked={c.is_visible !== false} className="h-5 w-5 accent-[#d81b7a]" />Показывать</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn}>Сохранить</button>
            <button formAction={toggleCategory} name="to" value={c.is_visible === false ? '1' : '0'} className={soft}>{c.is_visible === false ? 'Показать' : 'Скрыть'}</button>
            <ConfirmButton action={deleteCategory} message={`Удалить категорию «${c.name}»? Блюда останутся, но без категории.`} className={soft}>Удалить</ConfirmButton>
          </div>
        </form>
      ))}
      {!cats.length && <p className="py-6 text-center text-mute">Категорий пока нет.</p>}
    </div>
  );
}
