-- Атомарный счётчик: true, пока лимит не превышен
create or replace function public.hit_rate_limit(p_key text, p_max int, p_window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds); h int;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, w, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1 returning hits into h;
  return h <= p_max;
end; $$;
revoke all on function public.hit_rate_limit from public, anon, authenticated;
