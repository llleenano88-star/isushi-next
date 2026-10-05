alter table products add column image_manual boolean not null default false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Читать по ссылке может любой (бакет публичный), загружать и менять — только админ
create policy "admin upload product images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin update product images" on storage.objects for update using (bucket_id = 'product-images' and public.is_admin());
create policy "admin delete product images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_admin());
