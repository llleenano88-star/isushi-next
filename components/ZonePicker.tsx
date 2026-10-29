'use client';
import { useEffect, useRef, useState } from 'react';
import type { Zone } from '@/lib/types';

// Карта OpenFreeMap (MapLibre): без ключа, без значков заведений и флагов
const ML_JS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js';
const ML_CSS = 'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css';
const STYLE = 'https://tiles.openfreemap.org/styles/positron';

function loadMapLibre(): Promise<any> {
  const w = window as any;
  if (w.maplibregl) return Promise.resolve(w.maplibregl);
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${ML_CSS}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = ML_CSS; document.head.appendChild(l); }
    const ex = document.querySelector(`script[src="${ML_JS}"]`);
    const done = () => (w.maplibregl ? resolve(w.maplibregl) : reject(new Error('maplibre')));
    if (ex) { ex.addEventListener('load', done); return; }
    const sc = document.createElement('script'); sc.src = ML_JS; sc.async = true; sc.onload = done; sc.onerror = () => reject(new Error('maplibre')); document.head.appendChild(sc);
  });
}
const ring = (poly: [number, number][]) => { const r = poly.map(([lat, lng]) => [lng, lat]); r.push(r[0]); return r; };

// Точка внутри многоугольника (координаты [широта, долгота])
function inside(pt: [number, number], poly: [number, number][]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i]; const [yj, xj] = poly[j];
    if (yi > pt[0] !== yj > pt[0] && pt[1] < ((xj - xi) * (pt[0] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Превращает телефон в тексте в ссылку «позвонить»
function Linked({ text }: { text: string }) {
  const parts = text.split(/(\+?\d[\d\s()-]{5,}\d)/g);
  return <>{parts.map((t, i) => (i % 2 ? <a key={i} href={`tel:${t.replace(/[^\d+]/g, '')}`} className="font-extrabold underline">{t}</a> : <span key={i}>{t}</span>))}</>;
}

type Status = { kind: 'idle' | 'busy' | 'ok' | 'out' | 'nf'; text: string };

export default function ZonePicker({ zones, text, city, defaultPrice, selectedId, onSelect }: { zones: Zone[]; text: string; city: string; defaultPrice: number; selectedId: string | null; onSelect: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null); const mapRef = useRef<any>(null); const ready = useRef(false); const marker = useRef<any>(null);
  const onSel = useRef(onSelect); onSel.current = onSelect; const zonesRef = useRef(zones); zonesRef.current = zones; const selRef = useRef(selectedId); selRef.current = selectedId;
  const [addr, setAddr] = useState(''); const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' }); const [mapErr, setMapErr] = useState(false);
  const priceText = (z: Zone) => { const p = z.price ?? defaultPrice; return p > 0 ? `${p} ₽` : 'бесплатно'; };
  const paint = () => {
    const m = mapRef.current; if (!m || !ready.current) return;
    zonesRef.current.forEach((z) => { if (!m.getLayer(`zf-${z.id}`)) return; const on = z.id === selRef.current; m.setPaintProperty(`zf-${z.id}`, 'fill-opacity', on ? 0.4 : 0.22); m.setPaintProperty(`zl-${z.id}`, 'line-width', on ? 4 : 2); });
  };

  // Ставит метку и проверяет, в какую зону попал адрес / клик
  const check = (lat: number, lng: number, move = false) => {
    const ml = (window as any).maplibregl; const m = mapRef.current;
    if (ml && m) { if (marker.current) marker.current.remove(); marker.current = new ml.Marker({ color: '#d81b7a' }).setLngLat([lng, lat]).addTo(m); if (move) m.flyTo({ center: [lng, lat], zoom: 15 }); }
    const z = zonesRef.current.find((x) => x.polygon.length >= 3 && inside([lat, lng], x.polygon));
    if (z) { onSel.current(z.id); setStatus({ kind: 'ok', text: `Доставка возможна: зона «${z.name}». Стоимость доставки: ${priceText(z)}` }); }
    else setStatus({ kind: 'out', text: 'Этот адрес вне зон доставки. Если есть вопросы, позвоните нам.' });
  };
  const search = async () => {
    const q = addr.trim(); if (q.length < 3) return;
    setStatus({ kind: 'busy', text: 'Ищем адрес…' });
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ru&countrycodes=ru&q=${encodeURIComponent(`${q}, ${city}`)}`);
      const j = await r.json();
      if (!Array.isArray(j) || !j[0]) { setStatus({ kind: 'nf', text: 'Адрес не найден. Уточните улицу и номер дома или поставьте точку на карте.' }); return; }
      check(Number(j[0].lat), Number(j[0].lon), true);
    } catch { setStatus({ kind: 'nf', text: 'Не удалось найти адрес. Поставьте точку на карте или выберите зону кнопкой.' }); }
  };

  useEffect(() => {
    let dead = false; let map: any = null;
    loadMapMaybe();
    function loadMapMaybe() {
      loadMapLibre().then((ml) => {
        if (dead || !box.current) return;
        map = new ml.Map({ container: box.current, style: STYLE, center: [50.15, 53.2], zoom: 10, attributionControl: false, cooperativeGestures: true });
        mapRef.current = map; ready.current = false;
        map.addControl(new ml.AttributionControl({ compact: true, customAttribution: 'OpenFreeMap © OpenMapTiles Data from OpenStreetMap' }));
        map.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right');
        map.on('load', () => {
          const bounds = new ml.LngLatBounds(); let any = false;
          zonesRef.current.forEach((z) => {
            if (z.polygon.length < 3) return;
            map.addSource(`z-${z.id}`, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring(z.polygon)] } } });
            map.addLayer({ id: `zf-${z.id}`, type: 'fill', source: `z-${z.id}`, paint: { 'fill-color': z.color, 'fill-opacity': 0.22 } });
            map.addLayer({ id: `zl-${z.id}`, type: 'line', source: `z-${z.id}`, paint: { 'line-color': z.color, 'line-width': 2 } });
            z.polygon.forEach(([lat, lng]) => { bounds.extend([lng, lat]); any = true; });
          });
          ready.current = true; paint();
          if (any) map.fitBounds(bounds, { padding: 30, duration: 0 });
        });
        map.on('click', (e: any) => check(e.lngLat.lat, e.lngLat.lng));
      }).catch(() => setMapErr(true));
    }
    return () => { dead = true; if (map) map.remove(); mapRef.current = null; marker.current = null; ready.current = false; };
  }, [zones]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(paint, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-4 rounded-[24px] bg-card p-4 shadow-soft">
      <p className="rounded-2xl bg-blush px-4 py-3 text-sm font-semibold leading-snug"><Linked text={text} /></p>
      <p className="mb-2 mt-4 text-sm font-extrabold">Проверьте свой адрес</p>
      <div className="flex gap-2">
        <input value={addr} onChange={(e) => setAddr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Улица и номер дома" aria-label="Адрес доставки" className="h-12 min-w-0 flex-1 rounded-full border border-black/10 bg-card px-5 font-semibold outline-none focus:ring-2 focus:ring-accent" />
        <button type="button" onClick={search} className="h-12 shrink-0 rounded-full bg-brand px-5 font-bold text-white">Найти</button>
      </div>
      {status.text && <p className={`mt-2 rounded-2xl px-4 py-2 text-sm font-semibold ${status.kind === 'ok' ? 'bg-[#e6f6e3] text-[#1f6b16]' : status.kind === 'busy' ? 'text-mute' : 'bg-[#ffe9ec] text-[#b3261e]'}`}>{status.text}</p>}
      <div ref={box} className="mt-3 h-64 w-full overflow-hidden rounded-2xl bg-blush md:h-80" />
      {mapErr && <p className="mt-1 text-xs text-red-500">Карта не открылась на этом устройстве. Выберите зону кнопкой ниже.</p>}
      <p className="mt-1 text-xs text-mute">Нажмите на карту, чтобы поставить точку (на телефоне двигайте карту двумя пальцами), или выберите зону кнопкой ниже.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {zones.map((z) => (
          <button key={z.id} type="button" aria-pressed={selectedId === z.id} onClick={() => onSelect(z.id)} className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold ${selectedId === z.id ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>
            <span className="h-3 w-3 rounded-full" style={{ background: z.color }} />{z.name}<span className="opacity-80">· {priceText(z)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
