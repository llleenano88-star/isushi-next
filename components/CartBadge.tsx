// Красный счётчик в правом верхнем углу иконки. Родитель должен быть relative.
export default function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
      {count > 99 ? '99+' : count}
    </span>
  );
}
