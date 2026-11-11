-- 010: customers are never sent to the licence portal (owner decision, 11 Nov 2026).
-- pq_save_state's "licence ended" message now points to Buy / renew licence in the app, or Proview's phone number.
create or replace function public.pq_save_state(p_site uuid, p_data jsonb) returns timestamptz language plpgsql security definer set search_path = public as $$
declare o uuid; t timestamptz := now();
begin
  if not pq_can_site(p_site) then raise exception 'You don''t have access to this location.'; end if;
  if not pq_site_active(p_site) and not pq_is_master() then raise exception 'This location''s licence has ended. Renew it with Buy / renew licence in the ⋯ menu, or call Proview on 020 8935 5495.'; end if;
  select org_id into o from pq_sites where id = p_site;
  insert into pq_state(site_id, org_id, data, updated_at, updated_by) values (p_site, o, p_data, t, pq_email())
  on conflict (site_id) do update set data = excluded.data, updated_at = t, updated_by = excluded.updated_by;
  update pq_sites set last_seen = t where id = p_site;
  return t;
end $$;
