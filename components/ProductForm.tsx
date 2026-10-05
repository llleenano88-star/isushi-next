'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type V = { label: string; price: number | string; sizeId?: string | null };
type P = { id?: string; name?: string; description?: string | null; category_id?: string | null; image_url?: string | null; is_new?: boolean; variants?: V[]; iiko_id?: string | null };
const inp = 'h-14 w-full rounded-full bg-card px-6 font-semibold shadow-soft outline-none focus:ring-2 focus:ring-orange-400';

async function shrink(file: File): Promise<Blob> { // уменьшаем фото с телефона до 1200px
  const bmp = await createImageBitmap(file); const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), 'image/webp', 0.85));
}

export default function ProductForm({ product: p, categories, action }: { product: P; categories: { id: string; name: string }[]; action: (fd: FormData) => void }) {
  const [img, setImg] = useState(p.image_url ?? ''); const [vars, setVars] = useState<V[]>(p.variants?.length ? p.variants : [{ label: '', price: '' }]);
  const [name, setName] = useState(p.name ?? ''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const upload = async (f?: File) => {
    if (!f) return; setBusy(true); setErr('');
    try {
      const blob = await shrink(f); const ext = blob.type === 'image/webp' ? 'webp' : 'png'; const path = `${crypto.randomUUID()}.${ext}`;
      const sb = supabaseBrowser(); const { error } = await sb.storage.from('product-images').upload(path, blob, { contentType: blob.type });
      if (error) throw error; setImg(sb.storage.from('product-images').getPublicUrl(path).data.publicUrl);
    } catch { setErr('Не удалось загрузить фото. Попробуйте другой файл.'); }
    setBusy(false);
  };
  const setV = (i: number, k: keyof V, v: string) => setVars(vars.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const valid = name.trim().length >= 2 && vars.length > 0 && vars.every((v) => v.label.toString().trim() && Number(v.price) > 0);
  return (
    <form action={action} className="space-y-3 py-6">
      <input type="hidden" name="id" value={p.id ?? ''} /><input type="hidden" name="image_url" value={img} />
      <input type="hidden" name="variants" value={JSON.stringify(vars)} />
      <h1 className="text-3xl font-black">{p.id ? 'Изменить позицию' : 'Новая позиция'}</h1>
      {p.iiko_id && <p className="rounded-2xl bg-card p-3 text-sm text-mute">Эта позиция из iiko: название, описание, цены и категория обновляются из iiko при синхронизации. Своё фото, «Новинка» и скрытие сохраняются.</p>}
      <div className="flex items-center gap-4">
        <div className="h-28 w-28 shrink-0 rounded-[20px] bg-black/5 bg-cover bg-center dark:bg-white/10" style={img ? { backgroundImage: `url(${img})` } : undefined} />
        <div className="space-y-2">
          <label className="flex h-12 cursor-pointer items-center rounded-full bg-brand px-5 font-black text-black">{busy ? 'Загружаем…' : img ? 'Заменить фото' : 'Загрузить фото'}
            <input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} /></label>
          {img && <button type="button" onClick={() => setImg('')} className="h-12 px-2 text-sm font-bold text-mute">Убрать фото</button>}
        </div>
      </div>
      {err && <p className="text-sm text-red-500">{err}</p>}
      <input name="name" className={inp} placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea name="description" defaultValue={p.description ?? ''} placeholder="Описание (состав)" rows={3} className="w-full rounded-[24px] bg-card p-5 font-semibold shadow-soft outline-none focus:ring-2 focus:ring-orange-400" />
      <select name="category_id" defaultValue={p.category_id ?? ''} className={inp}><option value="">Без категории</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <label className="flex h-12 items-center gap-3 font-bold"><input type="checkbox" name="is_new" defaultChecked={p.is_new} className="h-6 w-6" />Показать бейдж «Новинка»</label>
      <div>
        <h2 className="mb-2 font-black">Варианты и цены</h2>
        {vars.map((v, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input className={inp} placeholder="8 шт" value={v.label} onChange={(e) => setV(i, 'label', e.target.value)} />
            <input className={`${inp} max-w-32`} placeholder="₽" type="number" inputMode="numeric" value={v.price} onChange={(e) => setV(i, 'price', e.target.value)} />
            {vars.length > 1 && <button type="button" aria-label="Убрать" onClick={() => setVars(vars.filter((_, j) => j !== i))} className="h-14 w-12 shrink-0">✕</button>}
          </div>
        ))}
        <button type="button" onClick={() => setVars([...vars, { label: '', price: '' }])} className="h-12 px-2 font-bold text-orange-500">+ Добавить вариант</button>
      </div>
      <button disabled={!valid || busy} className="h-14 w-full rounded-full bg-brand font-black text-black shadow-soft disabled:opacity-50">Сохранить</button>
    </form>
  );
}
