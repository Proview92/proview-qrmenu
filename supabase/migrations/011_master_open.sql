-- 011: master open (owner, 11 Nov 2026, MASTER_OPEN_SPEC.md: "the database tightening: ADD IT")
--
-- The master has no view of every business any more: they open ONE customer from the licence portal, and the app now
-- names it on every database request in the x-pq-org header (as Proview Label's x-pl-org). The database gives the
-- master that business only:
--   * pq_can_org / pq_can_site / pq_admin_of: the master only for the business in x-pq-org. These drive every read
--     policy (pq_orgs, pq_sites, pq_state, pq_members) and every per-business RPC (pq_sites_of, pq_save_state,
--     pq_add_site, pq_update_site, pq_update_org, pq_set_member, pq_remove_member, pq_inbox_take / _ack).
--   * pq_orgs_list: the master gets only the business in x-pq-org (it used to list every business).
-- Unchanged on purpose:
--   * the licence portal: hub_call / hub_call_base / hub_plans are SECURITY DEFINER, owned by postgres (RLS not forced),
--     and use none of these helpers; add_business runs pq_add_business as the master, which checks pq_is_master() only;
--   * the master-only SECURITY DEFINER functions (pq_add_business, pq_set_trial, pq_master_trial, pq_delete_org);
--   * media uploads (pq_can_upload, storage policies): the master keeps uploading without the header (Storage requests
--     don't carry it), still only into a location's folder;
--   * owners, admins, managers, staff and the guest menu: every branch for them is the same expression as before.
-- Safe before or after the new app: the old master UI just loses its every-business view (it sends no header).

-- the business this request is for (x-pq-org header; null when not sent or not a uuid)
create or replace function public.pq_req_org() returns uuid language sql stable set search_path = public as $$
  select case when h ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then h::uuid end
    from (select coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-pq-org' as h) x $$;

-- master, working inside this business (named in this request). Always true or false, never null: the RPCs test
-- "if not pq_admin_of(...)", where a null would let the call through.
create or replace function public.pq_master_in(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(p_org = pq_req_org(), false) and pq_is_master() $$;

create or replace function public.pq_can_org(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select pq_master_in(p_org) or exists(select 1 from pq_members where org_id = p_org and email = pq_email()) $$;

create or replace function public.pq_can_site(p_site uuid) returns boolean language sql stable security definer set search_path = public as $$
  select pq_master_in((select org_id from pq_sites where id = p_site)) or exists(
    select 1 from pq_sites s join pq_members m on m.org_id = s.org_id and m.email = pq_email()
     where s.id = p_site and (m.role in ('owner','admin') or s.id = any(m.site_ids))) $$;

create or replace function public.pq_admin_of(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select pq_master_in(p_org) or coalesce(pq_role(p_org) in ('owner','admin'), false) $$;

-- media: as before for everyone (the master: any location's folder, as before; Storage requests carry no x-pq-org)
create or replace function public.pq_can_upload(p_name text) returns boolean language sql stable security definer set search_path = public as $$
  select case when split_part(p_name, '/', 1) ~ '^[0-9a-f-]{36}$'
    then pq_is_master() or pq_can_site(split_part(p_name, '/', 1)::uuid) else false end $$;

create or replace function public.pq_orgs_list() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'contact_email', o.contact_email, 'self_signup', o.self_signup,
      'suspended', o.suspended, 'created_at', o.created_at,
      'sites', (select count(*) from pq_sites s where s.org_id = o.id and not s.archived),
      'users', (select count(*) from pq_members m where m.org_id = o.id)) order by lower(o.name)), '[]'::jsonb)
  from pq_orgs o where pq_master_in(o.id) or exists(select 1 from pq_members m where m.org_id = o.id and m.email = pq_email()) $$;

revoke execute on function public.pq_req_org(), public.pq_master_in(uuid) from public, anon;
grant execute on function public.pq_req_org(), public.pq_master_in(uuid) to authenticated, service_role;
