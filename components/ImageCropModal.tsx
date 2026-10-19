'use client';
import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import { cropToWebp, type Area, type CropSpec } from '@/lib/imageCrop';

export default function ImageCropModal({ file, spec, onCancel, onDone }: { file: File; spec: CropSpec; onCancel: () => void; onDone: (cropped: File) => void }) {
  const [src, setSrc] = useState(''); const [crop, setCrop] = useState({ x: 0, y: 0 }); const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { const u = URL.createObjectURL(file); setSrc(u); return () => URL.revokeObjectURL(u); }, [file]);
  const save = async () => {
    if (!area) return; setBusy(true); setErr('');
    try { onDone(await cropToWebp(src, area, spec, file.name)); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Не удалось обработать фото'); setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-[28px] bg-card p-5 shadow-soft">
        <h2 className="text-xl font-black">Обрезка фото</h2>
        <p className="mt-1 text-sm text-mute">Двигайте фото и меняйте масштаб. Итог: {spec.width}×{spec.height}.</p>
        {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
        <div className="relative mt-3 h-72 w-full overflow-hidden rounded-2xl bg-black">
          {src && <Cropper image={src} crop={crop} zoom={zoom} aspect={spec.aspect} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />}
        </div>
        <label className="mt-3 flex items-center gap-3 text-sm font-bold">Масштаб
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" /></label>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className="h-12 flex-1 rounded-full font-bold text-mute">Отмена</button>
          <button type="button" onClick={save} disabled={busy || !area} className="h-12 flex-1 rounded-full bg-brand font-black text-white disabled:opacity-50">{busy ? 'Обработка…' : 'Сохранить'}</button>
        </div>
      </div>
    </div>
  );
}
