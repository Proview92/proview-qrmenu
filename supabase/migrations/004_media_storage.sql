-- Public bucket for menu photos, logos and landing images. Files live under <location id>/...;
-- only people who can open that location may upload, change or delete them; anyone can view.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('qrmenu', 'qrmenu', true, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/gif','image/svg+xml','video/mp4'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.pq_can_upload(p_name text) returns boolean language sql stable security definer set search_path = public as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f-]{36}$' then pq_can_site(split_part(p_name, '/', 1)::uuid) else false end $$;
grant execute on function public.pq_can_upload(text) to authenticated;

create policy qrmenu_read on storage.objects for select to public using (bucket_id = 'qrmenu');
create policy qrmenu_insert on storage.objects for insert to authenticated with check (bucket_id = 'qrmenu' and public.pq_can_upload(name));
create policy qrmenu_update on storage.objects for update to authenticated using (bucket_id = 'qrmenu' and public.pq_can_upload(name));
create policy qrmenu_delete on storage.objects for delete to authenticated using (bucket_id = 'qrmenu' and public.pq_can_upload(name));
