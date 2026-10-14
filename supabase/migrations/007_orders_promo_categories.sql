-- 007: промокоды, поля заказа (промокод и скидка), видимость категорий
create table if not exists promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text not null check (discount_type in ('percent','fixed','free_delivery')),
  discount_value numeric not null default 0 check (discount_value >= 0),
  min_order numeric not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  max_uses int check (max_uses is null or max_uses > 0),
  uses_count int not null default 0,
  created_at timestamptz default now()
);
alter table promo_codes enable row level security;
drop policy if exists "admin promo all" on promo_codes;
create policy "admin promo all" on promo_codes for all using (is_admin()) with check (is_admin());
-- публичного чтения нет: промокоды проверяет только сервер (service role)

create or replace function public.redeem_promo(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update promo_codes set uses_count = uses_count + 1
  where code = upper(p_code) and active and (expires_at is null or expires_at > now())
    and (max_uses is null or uses_count < max_uses);
  get diagnostics n = row_count;
  return n > 0;
end; $$;
create or replace function public.release_promo(p_code text) returns void
language sql security definer set search_path = public as $$
  update promo_codes set uses_count = greatest(uses_count - 1, 0) where code = upper(p_code);
$$;
revoke all on function public.redeem_promo(text) from public, anon, authenticated;
revoke all on function public.release_promo(text) from public, anon, authenticated;

alter table orders add column if not exists promo_code text;
alter table orders add column if not exists discount numeric not null default 0;
alter table categories add column if not exists is_visible boolean not null default true;
