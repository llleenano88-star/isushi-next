import type { Promotion } from './promotions';
// Типы, безопасные для клиентских компонентов
export type Extra = { id: string; name: string; price: number; image?: string; iikoId?: string; default: boolean; active: boolean };
export type Zone = { id: string; name: string; color: string; polygon: [number, number][]; price: number | null; minOrder: number | null; freeFrom: number | null };
export type PublicSettings = {
  deliveryTime: string; deliveryPrice: number; freeDeliveryFrom: number; minOrder: number;
  phone: string; includedNote: string; extras: Extra[];
  tz: string; pickupLead: [number, number]; deliveryLead: [number, number]; slotStep: number; workFrom: string; workTo: string;
  zoneText: string; zones: Zone[]; promos: Promotion[]; closeCutoff: number; city: string; deliveryTravel: number;
};

export type QuestionsBlock = { title: string; text: string; phone: string; links: { label: string; href: string }[] };
