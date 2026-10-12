import { supabaseBrowser } from '@/lib/supabase/client';

async function shrink(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file); const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob((b) => r(b!), 'image/webp', 0.85));
}
// Загружает картинку в хранилище Supabase (только админ) и возвращает публичную ссылку
export async function uploadImage(file: File, max = 1800): Promise<string> {
  const blob = await shrink(file, max); const ext = blob.type === 'image/webp' ? 'webp' : 'png';
  const sb = supabaseBrowser(); const path = `site/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('product-images').upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
}
