-- Настройки оформления сайта (баннеры, текст «о нас», карта), правятся в админке
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);
alter table site_settings enable row level security;
create policy "read site settings" on site_settings for select using (true);
create policy "admin write site settings" on site_settings for all using (is_admin()) with check (is_admin());
