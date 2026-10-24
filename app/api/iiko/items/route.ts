import { NextResponse } from 'next/server';
import { iiko } from '@/lib/iiko';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 60;
export const preferredRegion = 'fra1';

// Страница со всеми позициями iiko (не только из внешнего меню): блюда, товары, услуги, модификаторы.
// Открыть в браузере: /api/iiko/items?key=ВАШ_CRON_SECRET — дальше поиск по названию и копирование ID одним нажатием.
// Ничего не пишет ни в iiko, ни в базу. Для JSON добавьте &format=json
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const given = url.searchParams.get('key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || given !== secret) return new NextResponse('Unauthorized', { status: 401 });

  type Item = { id: string; name: string; type: string; group: string; price: number | null };
  const items: Item[] = []; const seen = new Set<string>(); const notes: string[] = [];
  const add = (it: Item) => { if (it.id && it.name && !seen.has(it.id)) { seen.add(it.id); items.push(it); } };

  const clean = (e: any) => String(e?.message ?? e).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 160);

  // 1) организации, к которым есть доступ у ключа iiko, и номенклатура каждой из них
  let orgs: { id: string; name: string }[] = [];
  try { orgs = ((await iiko('/api/1/organizations', {})).organizations ?? []).map((o: any) => ({ id: o.id, name: o.name })); notes.push(`организации: ${orgs.map((o) => o.name).join(', ') || 'нет'}`); }
  catch (e) { notes.push(`организации не загрузились: ${clean(e)}`); }
  // Сначала организации самого ключа (как при переносе меню), потом значение из настроек сайта
  const envOrg = process.env.IIKO_ORGANIZATION_ID;
  const orgIds = [...new Set([...orgs.map((o) => o.id), envOrg].filter(Boolean) as string[])];
  if (orgs.length && envOrg && !orgs.some((o) => o.id === envOrg)) notes.push(`ВНИМАНИЕ: IIKO_ORGANIZATION_ID в Vercel не совпадает с организацией ключа iiko (в ключе: ${orgs.map((o) => `${o.name} = ${o.id}`).join(', ')})`);
  for (const orgId of orgIds) {
    try {
      const nom: any = await iiko('/api/1/nomenclature', { organizationId: orgId });
      const groups = new Map<string, string>((nom.groups ?? []).map((g: any) => [g.id, g.name]));
      for (const p of nom.products ?? []) add({ id: String(p.id), name: String(p.name ?? ''), type: String(p.type ?? ''), group: groups.get(p.groupId) ?? '', price: p.sizePrices?.[0]?.price?.currentPrice ?? null });
      notes.push(`номенклатура ${orgs.find((o) => o.id === orgId)?.name ?? orgId.slice(0, 8)}: ${nom.products?.length ?? 0}`);
    } catch (e) { notes.push(`номенклатура ${orgId.slice(0, 8)} не загрузилась: ${clean(e)}`); }
  }

  // 2) внешнее меню вместе с модификаторами (соусы и допы часто лежат там)
  try {
    const { externalMenus } = await iiko('/api/2/menu', {});
    notes.push(`внешних меню: ${externalMenus?.length ?? 0}`);
    for (const em of externalMenus ?? []) {
      try {
        const menu: any = await iiko('/api/2/menu/by_id', { externalMenuId: em.id, organizationIds: orgIds.slice(0, 1) });
        let n = 0;
        for (const c of menu.itemCategories ?? []) for (const it of c.items ?? []) {
          add({ id: String(it.itemId), name: String(it.name ?? ''), type: 'Внешнее меню', group: String(c.name ?? ''), price: it.itemSizes?.[0]?.prices?.[0]?.price ?? null }); n++;
          for (const sz of it.itemSizes ?? []) for (const mg of sz.itemModifierGroups ?? []) for (const m of mg.items ?? [])
            add({ id: String(m.itemId), name: String(m.name ?? ''), type: 'Модификатор', group: String(mg.name ?? ''), price: m.prices?.[0]?.price ?? null });
        }
        notes.push(`меню «${em.name ?? em.id}»: ${n}`);
      } catch (e) { notes.push(`меню «${em.name ?? em.id}» не загрузилось: ${clean(e)}`); }
    }
  } catch (e) { notes.push(`список внешних меню не загрузился: ${clean(e)}`); }

  // 3) то, что уже есть на сайте (в базе): товары и их варианты
  try {
    const { data } = await supabaseAdmin().from('products').select('iiko_id,name,variants');
    let n = 0;
    for (const p of data ?? []) {
      if (p.iiko_id) { add({ id: String(p.iiko_id), name: String(p.name), type: 'На сайте', group: '', price: null }); n++; }
      for (const v of (Array.isArray(p.variants) ? p.variants : []) as any[]) if (v?.iiko_id) add({ id: String(v.iiko_id), name: `${p.name} (${v.label ?? ''})`, type: 'На сайте, вариант', group: '', price: v.price ?? null });
    }
    notes.push(`на сайте: ${n}`);
  } catch (e) { notes.push(`база не прочиталась: ${clean(e)}`); }

  items.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const status = `Загружено позиций: ${items.length}. ${notes.join(' | ')}`;

  if (url.searchParams.get('format') === 'json') return NextResponse.json({ status, total: items.length, items });

  const data = JSON.stringify(items).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ID позиций iiko</title>
<style>body{font:15px system-ui,sans-serif;margin:0;padding:16px;background:#fafafa;color:#222}input{width:100%;box-sizing:border-box;padding:14px;font-size:17px;border:2px solid #ccc;border-radius:12px}
.r{display:flex;gap:10px;align-items:center;padding:10px 12px;margin-top:8px;background:#fff;border-radius:12px;border:1px solid #eee}.n{flex:1;min-width:0}.n b{display:block}.n small{color:#777;word-break:break-all}
button{padding:10px 14px;border:0;border-radius:10px;background:#2f6b2e;color:#fff;font-weight:700;cursor:pointer}</style></head><body>
<h2 style="margin:0 0 10px">ID позиций iiko</h2><input id="q" placeholder="Начните вводить название: доставка, соус, имбирь…" autofocus><p style="color:#555;margin:8px 0 0;font-size:13px">${status.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p><p id="c" style="color:#777"></p><div id="l"></div>
<script>const items=${data};const q=document.getElementById('q'),l=document.getElementById('l'),c=document.getElementById('c');
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function draw(){const nz=t=>String(t).toLowerCase().replace(/ё/g,'е');const s=nz(q.value.trim());const m=items.filter(i=>!s||nz(i.name).includes(s)||nz(i.id).includes(s)||nz(i.group).includes(s));const f=m.slice(0,100);
c.textContent='Найдено: '+m.length+(f.length===100?' (показаны первые 100, уточните поиск)':'');
l.innerHTML=f.map(i=>'<div class="r"><div class="n"><b>'+esc(i.name)+'</b><small>'+esc(i.type)+(i.group?' · '+esc(i.group):'')+(i.price!=null?' · '+i.price+' ₽':'')+'<br>'+esc(i.id)+'</small></div><button data-id="'+esc(i.id)+'">Копировать ID</button></div>').join('');}
l.onclick=e=>{const b=e.target.closest('button');if(!b)return;navigator.clipboard.writeText(b.dataset.id);b.textContent='Скопировано ✓';setTimeout(()=>b.textContent='Копировать ID',1200);};
q.oninput=draw;draw();</script></body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
