-- iSushiClub: схема этапа 1 (+ заготовки под заказы, этап 1.5)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text unique not null,
  sort_order int default 0, created_at timestamptz default now()
);
create table products (
  id uuid primary key default gen_random_uuid(),
  iiko_id text unique,
  category_id uuid references categories(id) on delete set null,
  name text not null, description text, image_url text,
  is_new boolean default false, is_available boolean default true,
  variants jsonb not null,  -- [{label, price}]
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique, name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz default now()
);
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  idempotency_key text unique,
  iiko_order_id text unique,
  number text unique not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','ready','delivered','cancelled')),
  phone text not null, customer_name text,
  receive_type text check (receive_type in ('delivery','pickup')),
  address jsonb, payment_method text,
  products_total numeric not null, delivery_price numeric default 0, total numeric not null,
  comment text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  name text not null, variant_label text, price numeric not null, qty int not null check (qty > 0)
);
create table rate_limits (  -- запасной вариант, если не Upstash
  key text not null, window_start timestamptz not null, hits int not null default 1,
  primary key (key, window_start)
);
create table iiko_webhook_logs (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null, received_at timestamptz default now()
);

-- Админ-проверка без рекурсии RLS
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Профиль при регистрации
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into profiles (id) values (new.id) on conflict do nothing; return new; end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table categories enable row level security;
alter table products enable row level security;
alter table profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table rate_limits enable row level security;       -- без политик: только service role
alter table iiko_webhook_logs enable row level security; -- без политик: только service role

create policy "read categories" on categories for select using (true);
create policy "admin categories" on categories for all using (is_admin()) with check (is_admin());
create policy "read products" on products for select using (true);
create policy "admin products" on products for all using (is_admin()) with check (is_admin());

create policy "own profile read" on profiles for select using (auth.uid() = id or is_admin());
create policy "own profile update" on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

create policy "own orders read" on orders for select using (auth.uid() = user_id or is_admin());
create policy "admin orders write" on orders for update using (is_admin());
create policy "own order items read" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_admin())));
-- вставка заказов — только с сервера (service role обходит RLS)

-- Сид
insert into categories (name, slug, sort_order) values ('Роллы','rolls',1),('Сеты','sets',2),('Напитки','drinks',3);
insert into products (category_id, name, description, is_new, variants)
select c.id, p.name, p.descr, p.is_new, p.variants::jsonb from categories c join (values
  ('rolls','Филадельфия','Лосось, сливочный сыр, огурец',false,'[{"label":"8 шт","price":490}]'),
  ('rolls','Калифорния','Краб, авокадо, икра масаго',true,'[{"label":"8 шт","price":420}]'),
  ('sets','Сет «Клуб»','Три ролла и нигири на компанию',false,'[{"label":"24 шт","price":1390},{"label":"36 шт","price":1990}]'),
  ('drinks','Морс клюквенный','Домашний, 0,5 л',false,'[{"label":"0,5 л","price":150}]')
) as p(slug, name, descr, is_new, variants) on p.slug = c.slug;
