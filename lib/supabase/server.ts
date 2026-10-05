import { createClient } from '@supabase/supabase-js';
// Публичное чтение (RLS: select для всех). Для записи — отдельный клиент с service role на этапе 1.5.
export const supabase = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
