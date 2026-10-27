'use client';
import { useEffect, useRef } from 'react';
import type { Zone } from '@/lib/types';

const LEAFLET_JS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
const LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';

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

// Превращает телефон в тексте в ссылку «позвонить»
function Linked({ text }: { text: string }) {
  const parts = text.split(/(\+?\d[\d\s()-]{5,}\d)/g);
  return <>{parts.map((t, i) => (i % 2 ? <a key={i} href={`tel:${t.replace(/[^\d+]/g, '')}`} className="font-extrabold underline">{t}</a> : <span key={i}>{t}</span>))}</>;
}

export default function ZonePicker({ zones, text, selectedId, onSelect }: { zones: Zone[]; text: string; selectedId: string | null; onSelect: (id: string) => void }) {
  const box = useRef<HTMLDivElement>(null); const layers = useRef<Record<string, any>>({}); const onSel = useRef(onSelect); onSel.current = onSelect;
  useEffect(() => {
    let map: any; let dead = false;
    loadLeaflet().then((L) => {
      if (dead || !box.current) return;
      map = L.map(box.current, { scrollWheelZoom: false, attributionControl: true }).setView([53.2, 50.15], 11);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
      const all: any[] = [];
      zones.forEach((z) => {
        if (z.polygon.length < 3) return;
        const poly = L.polygon(z.polygon, { color: z.color, weight: 2, fillColor: z.color, fillOpacity: 0.22 }).addTo(map);
        poly.bindTooltip(z.name, { sticky: true }); poly.on('click', () => onSel.current(z.id));
        layers.current[z.id] = poly; all.push(poly);
      });
      if (all.length) map.fitBounds(L.featureGroup(all).getBounds(), { padding: [20, 20] });
      Object.entries(layers.current).forEach(([id, l]: [string, any]) => l.setStyle(id === selectedId ? { weight: 4, fillOpacity: 0.4 } : { weight: 2, fillOpacity: 0.22 }));
    }).catch(() => { /* карта не загрузилась: зоны всё равно можно выбрать кнопками */ });
    return () => { dead = true; if (map) map.remove(); layers.current = {}; };
  }, [zones]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { Object.entries(layers.current).forEach(([id, l]: [string, any]) => l.setStyle(id === selectedId ? { weight: 4, fillOpacity: 0.4 } : { weight: 2, fillOpacity: 0.22 })); }, [selectedId]);
  return (
    <div className="mt-4 rounded-[24px] bg-card p-4 shadow-soft">
      <p className="rounded-2xl bg-blush px-4 py-3 text-sm font-semibold leading-snug"><Linked text={text} /></p>
      <p className="mb-2 mt-4 text-sm font-extrabold">Выберите зону доставки</p>
      <div ref={box} className="h-64 w-full overflow-hidden rounded-2xl bg-blush md:h-80" />
      <div className="mt-3 flex flex-wrap gap-2">
        {zones.map((z) => (
          <button key={z.id} type="button" aria-pressed={selectedId === z.id} onClick={() => onSelect(z.id)} className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold ${selectedId === z.id ? 'bg-brand text-white' : 'bg-blush text-ink'}`}>
            <span className="h-3 w-3 rounded-full" style={{ background: z.color }} />{z.name}{z.price != null && <span className="opacity-80">· {z.price > 0 ? `${z.price} ₽` : 'бесплатно'}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
