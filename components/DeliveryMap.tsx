'use client';
import ZonePicker from './ZonePicker';
import { useCart } from '@/lib/store/cart';
import type { PublicSettings } from '@/lib/types';

// Карта зон доставки внизу страницы: клиент вводит адрес и видит, доставляем ли мы к нему
export default function DeliveryMap({ settings }: { settings: PublicSettings }) {
  const zoneId = useCart((s) => s.zoneId); const setZone = useCart((s) => s.setZone);
  if (!settings.zones.length) return null;
  return (
    <section id="delivery-zones" className="scroll-mt-24 pt-10">
      <h2 className="text-3xl font-extrabold text-accent">Зоны доставки</h2>
      <ZonePicker zones={settings.zones} text={settings.zoneText} city={settings.city} defaultPrice={settings.deliveryPrice} selectedId={zoneId} onSelect={setZone} />
    </section>
  );
}
