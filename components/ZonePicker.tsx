'use client';
import { useEffect, useRef, useState } from 'react';
import type { Zone } from '@/lib/types';

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
// Чистая светлая карта (без значков заведений и флагов), подписи улиц отдельным слоем поверх зон
const TILES = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
const LABELS = 'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png';

function loadLeaflet(): Promise<any> {
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = LEAFLET_CSS; document.head.appendChild(l); }
    const ex = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    const done = () => (w.L ? resolve(w.L) : reject(new Error('leaflet')));
    if (ex) { ex.addEventListener('load', done); return; }
    const s = document.createElement('script'); s.src = LEAFLET_JS; s.async = true; s.onload = done; s.onerror = () => reject(new Error('leaflet')); document.head.appendChild(s);
  });
}

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
  const box = useRef<HTMLDivElement>(null); const layers = useRef<Record<string, any>>({}); const mapRef = useRef<any>(null); const marker = useRef<any>(null);
  const onSel = useRef(onSelect); onSel.current = onSelect; const zonesRef = useRef(zones); zonesRef.current = zones;
  const [addr, setAddr] = useState(''); const [status, setStatus] = useState<Status>({ kind: 'idle', text: '' });
  const style = (id: string) => (id === selectedId ? { weight: 4, fillOpacity: 0.4 } : { weight: 2, fillOpacity: 0.22 });
  const priceText = (z: Zone) => { const p = z.price ?? defaultPrice; return p > 0 ? `${p} ₽` : 'бесплатно'; };

  // Ставит метку и проверяет, в какую зону попал адрес / клик
  const check = (lat: number, lng: number, move = false) => {
    const L = (window as any).L; const m = mapRef.current;
    if (L && m) { if (marker.current) marker.current.remove(); marker.current = L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#d81b7a', fillOpacity: 1 }).addTo(m); if (move) m.setView([lat, lng], 15); }
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
    let map: any; let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !box.current) return;
      map = L.map(box.current, { scrollWheelZoom: false, attributionControl: true }).setView([53.2, 50.15], 11); mapRef.current = map;
      L.tileLayer(TILES, { maxZoom: 19, subdomains: 'abcd', attribution: '© OpenStreetMap, © CARTO' }).addTo(map);
      const all: any[] = [];
      zones.forEach((z) => {
        if (z.polygon.length < 3) return;
        const poly = L.polygon(z.polygon, { color: z.color, weight: 2, fillColor: z.color, fillOpacity: 0.22 }).addTo(map);
        poly.bindTooltip(`${z.name} · ${priceText(z)}`, { sticky: true });
        layers.current[z.id] = poly; all.push(poly);
      });
      map.createPane('labels'); map.getPane('labels').style.zIndex = 650; map.getPane('labels').style.pointerEvents = 'none';
      L.tileLayer(LABELS, { maxZoom: 19, subdomains: 'abcd', pane: 'labels' }).addTo(map);
      if (all.length) map.fitBounds(L.featureGroup(all).getBounds(), { padding: [20, 20] });
      map.on('click', (e: any) => check(e.latlng.lat, e.latlng.lng));
      Object.entries(layers.current).forEach(([id, l]: [string, any]) => l.setStyle(style(id)));
    }).catch(() => { /* карта не загрузилась: зону всё равно можно выбрать кнопками */ });
    return () => { dead = true; if (map) map.remove(); layers.current = {}; mapRef.current = null; marker.current = null; };
  }, [zones]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { Object.entries(layers.current).forEach(([id, l]: [string, any]) => l.setStyle(style(id))); }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <p className="mt-1 text-xs text-mute">Нажмите на карту, чтобы поставить точку, или выберите зону кнопкой ниже.</p>
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
