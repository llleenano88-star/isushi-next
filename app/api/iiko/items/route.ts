import { NextResponse } from 'next/server';
import { fetchNomenclature } from '@/lib/iiko';

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

  let nom: any;
  try { nom = await fetchNomenclature(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 502 }); }

  const groups = new Map<string, string>((nom.groups ?? []).map((g: any) => [g.id, g.name]));
  const items = (nom.products ?? []).map((p: any) => ({
    id: String(p.id), name: String(p.name ?? ''), type: String(p.type ?? ''), group: groups.get(p.groupId) ?? '',
    price: p.sizePrices?.[0]?.price?.currentPrice ?? null,
  })).sort((a: any, b: any) => a.name.localeCompare(b.name, 'ru'));

  if (url.searchParams.get('format') === 'json') return NextResponse.json({ total: items.length, items });

  const data = JSON.stringify(items).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ID позиций iiko</title>
<style>body{font:15px system-ui,sans-serif;margin:0;padding:16px;background:#fafafa;color:#222}input{width:100%;box-sizing:border-box;padding:14px;font-size:17px;border:2px solid #ccc;border-radius:12px}
.r{display:flex;gap:10px;align-items:center;padding:10px 12px;margin-top:8px;background:#fff;border-radius:12px;border:1px solid #eee}.n{flex:1;min-width:0}.n b{display:block}.n small{color:#777;word-break:break-all}
button{padding:10px 14px;border:0;border-radius:10px;background:#2f6b2e;color:#fff;font-weight:700;cursor:pointer}</style></head><body>
<h2 style="margin:0 0 10px">ID позиций iiko</h2><input id="q" placeholder="Начните вводить название: доставка, соус, имбирь…" autofocus><p id="c" style="color:#777"></p><div id="l"></div>
<script>const items=${data};const q=document.getElementById('q'),l=document.getElementById('l'),c=document.getElementById('c');
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function draw(){const s=q.value.trim().toLowerCase();const f=items.filter(i=>!s||i.name.toLowerCase().includes(s)).slice(0,100);
c.textContent='Найдено: '+items.filter(i=>!s||i.name.toLowerCase().includes(s)).length+(f.length===100?' (показаны первые 100, уточните поиск)':'');
l.innerHTML=f.map(i=>'<div class="r"><div class="n"><b>'+esc(i.name)+'</b><small>'+esc(i.type)+(i.group?' · '+esc(i.group):'')+(i.price!=null?' · '+i.price+' ₽':'')+'<br>'+esc(i.id)+'</small></div><button data-id="'+esc(i.id)+'">Копировать ID</button></div>').join('');}
l.onclick=e=>{const b=e.target.closest('button');if(!b)return;navigator.clipboard.writeText(b.dataset.id);b.textContent='Скопировано ✓';setTimeout(()=>b.textContent='Копировать ID',1200);};
q.oninput=draw;draw();</script></body></html>`;
  return new NextResponse(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}
