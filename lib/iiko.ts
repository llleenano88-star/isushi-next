import 'server-only';
// iiko Cloud API. Только сервер. Ключи — из env без NEXT_PUBLIC_.
const BASE = process.env.IIKO_API_URL ?? 'https://api-ru.iiko.services';
const ORG = () => process.env.IIKO_ORGANIZATION_ID!;
let cache: { token: string; exp: number } | null = null;

async function token() {
  if (cache && cache.exp > Date.now()) return cache.token;
  const r = await fetch(`${BASE}/api/1/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiLogin: process.env.IIKO_API_LOGIN }), cache: 'no-store' });
  if (!r.ok) throw new Error(`iiko auth ${r.status}`);
  cache = { token: (await r.json()).token, exp: Date.now() + 50 * 60_000 };
  return cache.token;
}
export async function iiko<T = any>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`iiko ${path} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

export const fetchNomenclature = () => iiko('/api/1/nomenclature', { organizationId: ORG() });

// Внешнее меню (то, что настроено в iikoWeb → «Внешнее меню»).
// Если IIKO_EXTERNAL_MENU_ID не задан в env, берётся первое меню из списка.
export async function fetchExternalMenu() {
  const { organizations } = await iiko('/api/1/organizations', {});
  const orgId = organizations?.[0]?.id;
  if (!orgId) throw new Error('iiko: нет организаций');
  const { externalMenus } = await iiko('/api/2/menu', {});
  const externalMenuId = externalMenus?.[0]?.id;
  if (!externalMenuId) throw new Error('iiko: нет внешних меню');
  const body = { externalMenuId, organizationIds: [orgId] };
  try {
    return await iiko('/api/2/menu/by_id', body);
  } catch (e: any) {
    throw new Error(`${String(e.message).slice(0, 100)} | body=${JSON.stringify(body)} | typeof id=${typeof externalMenuId}`);
  }
}

// Терминальная группа: из настроек (IIKO_TERMINAL_GROUP_ID), а если там пусто или неверно, берём первую группу организации из iiko.
// Без неё iiko пытается выбрать группу сам по адресу, и доставка падает с ошибкой «Unable to automatically assign terminal group».
let tgCache: string | null = null;
async function terminalGroupId(): Promise<string | undefined> {
  const env = (process.env.IIKO_TERMINAL_GROUP_ID ?? '').trim().replace(/^"+|"+$/g, '');
  if (/^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/.test(env)) return env;
  if (tgCache) return tgCache;
  try {
    const r = await iiko('/api/1/terminal_groups', { organizationIds: [ORG()] });
    const id = r?.terminalGroups?.[0]?.items?.[0]?.id;
    if (typeof id === 'string') { tgCache = id; return id; }
  } catch { /* без группы iiko попробует выбрать сам */ }
  return undefined;
}

export async function createDelivery(o: { number: string; phone: string; name: string; receiveType: string; address?: string; comment?: string; paymentMethod: string; note?: string; completeBefore?: string; street?: string; house?: string; flat?: string; entrance?: string; floor?: string; doorphone?: string;
  items: { iikoId: string; sizeId?: string | null; price: number; qty: number; comment?: string }[] }) {
  const delivery = o.receiveType === 'delivery';
  const comment = [o.note, o.comment, delivery && o.address && `Адрес: ${o.address}`, `Оплата: ${o.paymentMethod === 'cash' ? 'наличными при получении' : o.paymentMethod === 'transfer' ? 'переводом при получении' : o.paymentMethod === 'qr' ? 'по QR-коду при получении' : 'переводом или по QR-коду при получении'}`].filter(Boolean).join('. ');
  const tg = await terminalGroupId();
  const res = await iiko('/api/1/deliveries/create', {
    organizationId: ORG(), ...(tg ? { terminalGroupId: tg } : {}),
    order: {
      ...(o.completeBefore ? { completeBefore: o.completeBefore } : {}),
      externalNumber: o.number, phone: `+7${o.phone.slice(1)}`, comment,
      orderServiceType: delivery ? 'DeliveryByCourier' : 'DeliveryByClient',
      customer: { name: o.name, type: 'one-time' },
      items: o.items.map((i) => ({ type: 'Product', productId: i.iikoId, amount: i.qty, price: i.price, ...(i.sizeId ? { productSizeId: i.sizeId } : {}), ...(i.comment ? { comment: i.comment } : {}) })),
      ...(delivery && { deliveryPoint: { address: { street: { name: o.street || o.address || '', city: process.env.IIKO_CITY ?? '' }, house: o.house || '-', ...(o.flat ? { flat: o.flat } : {}), ...(o.entrance ? { entrance: o.entrance } : {}), ...(o.floor ? { floor: o.floor } : {}), ...(o.doorphone ? { doorphone: o.doorphone } : {}) } } }),
    },
  });
  const info = res?.orderInfo;
  // iiko может ответить 200, но сообщить, что заказ создать не удалось: тогда считаем это ошибкой
  if (info?.creationStatus === 'Error') throw new Error(`iiko не создал заказ: ${info?.errorInfo?.message ?? info?.errorInfo?.description ?? info?.errorInfo?.code ?? 'причина не указана'}`);
  return info?.id as string | undefined;
}

// Автоподтверждение: заказ с сайта сразу уходит из статуса «Не подтверждён», оператору нажимать ничего не нужно.
// iiko создаёт заказ не мгновенно, поэтому пробуем несколько раз с короткой паузой (всего до ~6 секунд).
// Отключить: переменная IIKO_AUTO_CONFIRM=0. Ошибка подтверждения заказ не ломает: он останется в iiko «не подтверждённым».
// Проверка: сохранил ли iiko комментарии к блюдам (там время готовности). null = не удалось проверить.
export async function iikoItemCommentStored(orderId: string): Promise<boolean | null> {
  try {
    const r = await iiko('/api/1/deliveries/by_id', { organizationId: ORG(), orderIds: [orderId] });
    const items = r?.orders?.[0]?.order?.items;
    if (!Array.isArray(items)) return null;
    return items.some((i: any) => typeof i?.comment === 'string' && i.comment.trim().length > 0);
  } catch { return null; }
}

// Печать чека доставки сразу после создания (нужно для заказов «ко времени», которые iiko иначе держит до своего срока).
// Отключить: переменная IIKO_PRINT_TIMED=0. Возвращает true или текст причины неудачи.
export async function printDeliveryBill(orderId: string): Promise<true | string> {
  if (process.env.IIKO_PRINT_TIMED === '0') return true;
  try { await iiko('/api/1/deliveries/print_delivery_bill', { organizationId: ORG(), orderId }); return true; }
  catch (e: any) { return `Чек не напечатан автоматически: ${String(e?.message ?? e).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 250)}`; }
}

export async function confirmDelivery(orderId: string): Promise<true | string> { // true = подтверждён, строка = причина неудачи
  if (process.env.IIKO_AUTO_CONFIRM === '0') return true;
  let last = '';
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 1200 : 1500));
    try { await iiko('/api/1/deliveries/confirm', { organizationId: ORG(), orderId }); return true; }
    catch (e: any) { last = String(e?.message ?? e); if (i === 3) console.error('iiko confirm failed', e); }
  }
  return `Заказ создан в iiko, но не подтверждён автоматически: ${last.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 250)}`;
}

export const registerWebhook = (uri: string) => iiko('/api/1/webhooks/update_settings', {
  organizationId: ORG(), webHooksUri: uri, authToken: process.env.IIKO_WEBHOOK_SECRET,
  webHooksFilter: { deliveryOrderFilter: { orderStatuses: ['Unconfirmed', 'WaitCooking', 'ReadyForCooking', 'CookingStarted', 'CookingCompleted', 'Waiting', 'OnWay', 'Delivered', 'Closed', 'Cancelled'], errors: true } },
});

export const STATUS_MAP: Record<string, string> = {
  Unconfirmed: 'pending', WaitCooking: 'confirmed', ReadyForCooking: 'confirmed', CookingStarted: 'preparing',
  CookingCompleted: 'ready', Waiting: 'ready', OnWay: 'ready', Delivered: 'delivered', Closed: 'delivered', Cancelled: 'cancelled',
};