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

export async function createDelivery(o: { number: string; phone: string; name: string; receiveType: string; address?: string; comment?: string; paymentMethod: string; note?: string; completeBefore?: string;
  items: { iikoId: string; sizeId?: string | null; price: number; qty: number; comment?: string }[] }) {
  const delivery = o.receiveType === 'delivery';
  const comment = [o.comment, o.note, delivery && o.address && `Адрес: ${o.address}`, `Оплата: ${o.paymentMethod === 'cash' ? 'наличными при получении' : 'переводом или по QR-коду при получении'}`].filter(Boolean).join('. ');
  const res = await iiko('/api/1/deliveries/create', {
    organizationId: ORG(), terminalGroupId: process.env.IIKO_TERMINAL_GROUP_ID,
    order: {
      ...(o.completeBefore ? { completeBefore: o.completeBefore } : {}),
      externalNumber: o.number, phone: `+7${o.phone.slice(1)}`, comment,
      orderServiceType: delivery ? 'DeliveryByCourier' : 'DeliveryByClient',
      customer: { name: o.name, type: 'one-time' },
      items: o.items.map((i) => ({ type: 'Product', productId: i.iikoId, amount: i.qty, price: i.price, ...(i.sizeId ? { productSizeId: i.sizeId } : {}), ...(i.comment ? { comment: i.comment } : {}) })),
      ...(delivery && { deliveryPoint: { address: { street: { name: o.address ?? '', city: process.env.IIKO_CITY ?? '' }, house: '-' } } }),
    },
  });
  return res?.orderInfo?.id as string | undefined;
}

// Автоподтверждение: заказ с сайта сразу уходит из статуса «Не подтверждён», оператору нажимать ничего не нужно.
// iiko создаёт заказ не мгновенно, поэтому пробуем несколько раз с короткой паузой (всего до ~6 секунд).
// Отключить: переменная IIKO_AUTO_CONFIRM=0. Ошибка подтверждения заказ не ломает: он останется в iiko «не подтверждённым».
export async function confirmDelivery(orderId: string) {
  if (process.env.IIKO_AUTO_CONFIRM === '0') return false;
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, i === 0 ? 1200 : 1500));
    try { await iiko('/api/1/deliveries/confirm', { organizationId: ORG(), orderId }); return true; }
    catch (e) { if (i === 3) console.error('iiko confirm failed', e); }
  }
  return false;
}

export const registerWebhook = (uri: string) => iiko('/api/1/webhooks/update_settings', {
  organizationId: ORG(), webHooksUri: uri, authToken: process.env.IIKO_WEBHOOK_SECRET,
  webHooksFilter: { deliveryOrderFilter: { orderStatuses: ['Unconfirmed', 'WaitCooking', 'ReadyForCooking', 'CookingStarted', 'CookingCompleted', 'Waiting', 'OnWay', 'Delivered', 'Closed', 'Cancelled'], errors: true } },
});

export const STATUS_MAP: Record<string, string> = {
  Unconfirmed: 'pending', WaitCooking: 'confirmed', ReadyForCooking: 'confirmed', CookingStarted: 'preparing',
  CookingCompleted: 'ready', Waiting: 'ready', OnWay: 'ready', Delivered: 'delivered', Closed: 'delivered', Cancelled: 'cancelled',
};