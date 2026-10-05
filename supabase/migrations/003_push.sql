create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text unique not null, p256dh text not null, auth text not null,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "own subs read" on push_subscriptions for select using (auth.uid() = user_id);
create policy "own subs delete" on push_subscriptions for delete using (auth.uid() = user_id);
-- вставка — только с сервера (service role)
