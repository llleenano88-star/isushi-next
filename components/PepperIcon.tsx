// Перчик: красный = острый, серый с чертой = не острый
export default function PepperIcon({ off = false, size = 20 }: { off?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d="M15.2 3.4c.5-.9 1.7-1.3 2.6-.8" fill="none" stroke={off ? '#9a9a9a' : '#2f8f3a'} strokeWidth="2" strokeLinecap="round" />
      <path d="M14.6 5.2c2.6.4 4.3 2.4 4 5.3-.5 5.2-5.1 9.6-12.4 10.3-1.2.1-1.6-.9-.8-1.6 3.1-2.6 4.5-5.2 4.9-8.4.3-2.7 2.3-6 4.3-5.6z" fill={off ? '#bdbdbd' : '#e02e24'} />
      <path d="M13 6.2c1.6.4 2.6 1.4 2.8 3" fill="none" stroke="#fff" strokeOpacity=".45" strokeWidth="1.2" strokeLinecap="round" />
      {off && <path d="M3.5 3.5l17 17" stroke="#555" strokeWidth="2.2" strokeLinecap="round" />}
    </svg>
  );
}

// Иконка по тексту выбора: «Острый» — красный перчик, «Не острый» — серый с чертой, остальное — без иконки
export function ChoiceIcon({ text, size = 18 }: { text: string; size?: number }) {
  if (/^\s*не\s*остр/i.test(text)) return <PepperIcon off size={size} />;
  if (/остр/i.test(text)) return <PepperIcon size={size} />;
  return null;
}
