// Типы, безопасные для клиентских компонентов
export type Extra = { id: string; name: string; price: number; image?: string; iikoId?: string; default: boolean; active: boolean };
export type PublicSettings = {
  deliveryTime: string; deliveryPrice: number; freeDeliveryFrom: number; minOrder: number;
  phone: string; includedNote: string; extras: Extra[];
};
