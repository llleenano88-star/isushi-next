'use client';
// Кнопка отправки формы с подтверждением (для удаления)
export default function ConfirmButton({ action, message, className, children }: { action: (fd: FormData) => void | Promise<void>; message: string; className?: string; children: React.ReactNode }) {
  return <button type="submit" formAction={action} className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>{children}</button>;
}
