import type { Zone } from './types';

// Точка внутри многоугольника (координаты [широта, долгота])
export function inside(pt: [number, number], poly: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]; const [yj, xj] = poly[j];
    if (yi > pt[0] !== yj > pt[0] && pt[1] < ((xj - xi) * (pt[0] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export const zoneAt = (zones: Zone[], lat: number, lng: number): Zone | null => zones.find((z) => z.polygon.length >= 3 && inside([lat, lng], z.polygon)) ?? null;

// Поиск адреса по OpenStreetMap (Nominatim). Возвращает null, если адрес не найден или сервис недоступен.
export async function geocodeAddress(q: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru&countrycodes=ru&q=${encodeURIComponent(`${q}, ${city}`)}`);
    const j = await r.json();
    return Array.isArray(j) && j[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null;
  } catch { return null; }
}
