import { supabase } from '@/lib/supabase/server';
import { ABOUT, BANNERS, CATEGORY_IMAGES, MAP_EMBED, DELIVERY_TIME, INCLUDED_NOTE } from '@/lib/content';
import type { Extra, PublicSettings, QuestionsBlock, Zone } from '@/lib/types';
import type { Promotion, PromoKind } from '@/lib/promotions';

export type Banner = { image: string; href?: string };
export type About = typeof ABOUT;
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const strList = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

// Картинки категорий: админка кладёт их по slug, старый вариант — по названию. Читаем оба, ничего не удаляем и не меняем в базе.
function normImages(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === 'string' && val.trim() && k.trim()) out[k.trim().toLowerCase()] = val.trim();
    }
  }
  return out;
}

// Баннеры: сайт хранит ссылку в href, новая админка — в link
function normBanners(v: unknown): Banner[] {
  return (v as any[])
    .map((b) => ({ image: String(b?.image ?? b?.url ?? b?.src ?? '').trim(), href: String(b?.href ?? b?.link ?? '').trim() || undefined }))
    .filter((b) => b.image);
}

// «О нас»: поддерживаем и camelCase (сайт), и snake_case (новая админка)
function normAbout(v: unknown): About {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return ABOUT;
  const a = v as any;
  return {
    title: typeof a.title === 'string' ? a.title : ABOUT.title,
    blocks: Array.isArray(a.blocks) ? strList(a.blocks) : ABOUT.blocks,
    listTitle: typeof (a.listTitle ?? a.list_title) === 'string' ? (a.listTitle ?? a.list_title) : ABOUT.listTitle,
    list: Array.isArray(a.list ?? a.items) ? strList(a.list ?? a.items) : ABOUT.list,
    outro: typeof (a.outro ?? a.footer) === 'string' ? (a.outro ?? a.footer) : ABOUT.outro,
  };
}

// Берёт настройки из админки; если их нет (или таблица не создана), использует значения из lib/content.ts
export async function getSettings() {
  let m: Record<string, any> = {};
  try {
    const { data } = await supabase().from('site_settings').select('key,value');
    m = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  } catch { /* остаются значения по умолчанию */ }
  // Доп. товары: новая админка хранит их в таблице extras, старая форма сайта — в настройках (site_settings.extras).
  // Если в таблице есть позиции, показываем их; иначе остаётся старый список, ничего не пропадёт.
  const oldExtras: Extra[] = (Array.isArray(m.extras) ? m.extras : [])
    .map((e: any) => ({ id: String(e.id ?? ''), name: String(e.name ?? ''), price: num(e.price), image: e.image || undefined, iikoId: e.iikoId || undefined, default: !!e.default, active: e.active !== false }))
    .filter((e: Extra) => e.id && e.name);
  let tableExtras: Extra[] = [];
  try {
    const { data, error } = await supabase().from('extras').select('id,name,price,image_url,iiko_id,is_default,is_active,sort_order').order('sort_order', { ascending: true });
    if (!error) {
      tableExtras = (data ?? [])
        .map((e: any) => ({ id: String(e.id ?? ''), name: String(e.name ?? '').trim(), price: num(e.price), image: e.image_url || undefined, iikoId: e.iiko_id || undefined, default: !!e.is_default, active: e.is_active !== false }))
        .filter((e: Extra) => e.id && e.name);
    }
  } catch { /* таблицы нет — работаем со старым списком */ }
  const extras: Extra[] = tableExtras.length ? tableExtras : oldExtras;
  // Акции и зоны доставки из таблиц админки (если миграция 011 ещё не выполнена, просто пусто)
  let promos: Promotion[] = []; let zones: Zone[] = [];
  try {
    const { data, error } = await supabase().from('promotions').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (!error) promos = (data ?? []).map((r: any) => ({
      id: String(r.id), title: String(r.title ?? ''), description: String(r.description ?? ''), image: r.image_url || undefined, kind: r.kind as PromoKind,
      config: r.config && typeof r.config === 'object' ? r.config : {}, timeFrom: String(r.time_from ?? ''), timeTo: String(r.time_to ?? ''),
      weekdays: Array.isArray(r.weekdays) ? r.weekdays.map(Number).filter((d: number) => d >= 1 && d <= 7) : [], startsAt: String(r.starts_at ?? ''), endsAt: String(r.ends_at ?? ''),
      receive: r.receive_type === 'delivery' || r.receive_type === 'pickup' ? r.receive_type : 'any',
    })).filter((p: Promotion) => p.id && p.title);
  } catch { /* акций нет */ }
  try {
    const { data, error } = await supabase().from('delivery_zones').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    const optNum = (v: unknown) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
    if (!error) zones = (data ?? []).map((r: any) => ({
      id: String(r.id), name: String(r.name ?? ''), color: String(r.color || '#d81b7a'),
      polygon: (Array.isArray(r.polygon) ? r.polygon : []).filter((pt: any) => Array.isArray(pt) && Number.isFinite(Number(pt[0])) && Number.isFinite(Number(pt[1]))).map((pt: any) => [Number(pt[0]), Number(pt[1])] as [number, number]),
      price: optNum(r.delivery_price), minOrder: optNum(r.min_order), freeFrom: optNum(r.free_from),
    })).filter((z: Zone) => z.id && z.name);
  } catch { /* зон нет */ }
  const lead = (a: unknown, b: unknown, da: number, db_: number): [number, number] => { const x = num(a) || da; const y = num(b) || db_; return [Math.min(x, y), Math.max(x, y)]; };
  const phone = str(m.phone) || str(m.contact_phone);
  const cart: PublicSettings = {
    deliveryTime: (m.delivery_time as string | undefined) ?? DELIVERY_TIME,
    deliveryPrice: num(m.delivery_price), freeDeliveryFrom: num(m.free_delivery_from), minOrder: num(m.min_order),
    phone,
    includedNote: (m.included_note as string | undefined) ?? INCLUDED_NOTE,
    extras,
    tz: str(m.site_tz) || process.env.SITE_TZ || 'Europe/Samara',
    pickupLead: lead(m.pickup_lead_min, m.pickup_lead_max, 30, 40), deliveryLead: lead(m.delivery_lead_min, m.delivery_lead_max, 60, 90),
    slotStep: [5, 10, 15, 20, 30].includes(num(m.slot_step)) ? num(m.slot_step) : 10,
    workFrom: str(m.work_from), workTo: str(m.work_to),
    zoneText: str(m.zone_text) || 'Есть вопросы по поводу зоны доставки? Позвоните 202-10-20',
    zones, promos, closeCutoff: Math.min(240, num(m.close_cutoff_min)), city: str(m.site_city) || 'Самара',
  };
  const links = [
    { label: 'Telegram', href: str(m.telegram) }, { label: 'WhatsApp', href: str(m.whatsapp) }, { label: 'ВКонтакте', href: str(m.vk) },
  ].filter((l) => /^https?:\/\//i.test(l.href));
  const questions: QuestionsBlock = {
    title: str(m.questions_title) || 'Остались вопросы?',
    text: str(m.questions_text) || 'Позвоните нам или напишите в мессенджер — подскажем по меню, составу блюд и доставке.',
    phone, links,
  };
  return {
    banners: Array.isArray(m.banners) ? normBanners(m.banners) : BANNERS,
    categoryImages: m.category_images ? normImages(m.category_images) : normImages(CATEGORY_IMAGES),
    about: normAbout(m.about),
    mapEmbed: (m.map_embed as string | undefined) ?? MAP_EMBED,
    cart,
    questions,
    // Код доставки в iiko: доставка уходит в iiko отдельной позицией с этим кодом. Только для сервера.
    deliveryIikoId: str(m.delivery_iiko_id).replace(/^"+|"+$/g, ''),
  };
}
