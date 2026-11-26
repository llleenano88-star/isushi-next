import { getSettings } from '@/lib/settings';

// Ссылка «ВК» берётся из контактов в админке (поле «VK (ссылка)»). Если ссылка не заполнена, выводится просто текст.
export default async function VkLink() {
  try {
    const s = await getSettings();
    const l = s.questions?.links?.find((x: { label: string; href: string }) => x.label === 'ВКонтакте');
    if (l) return <a href={l.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline">ВК</a>;
  } catch {}
  return <>ВК</>;
}
