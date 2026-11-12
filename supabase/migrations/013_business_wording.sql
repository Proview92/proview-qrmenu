-- 013: wording only, apply after 012 (owner, 12 Nov 2026).
--  * "business", not "location", in the refusals people see (the licence portal says Businesses: "New business",
--    "Link with another business…"): pq_sites_guard and pq_add_site from 012.
--  * the licence-ended message of pq_save_state (010) says "business" (MULTI_BUSINESS_PICKER_STANDARD.md, 07:47b) and
--    points to Settings → This location: its "⋯ menu" was on the Locations page, which is gone.
-- What each function allows and refuses is exactly the same.

create or replace function public.pq_sites_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('pq.hub_move', true), '') = '1' and current_user not in ('anon', 'authenticated') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if exists (select 1 from public.pq_orgs o where o.id = new.org_id and o.created_at = now())
       and not exists (select 1 from public.pq_sites s where s.org_id = new.org_id) then
      return new;   -- the first location of a business made in this same transaction
    end if;
    raise exception 'Businesses are set up by Proview in the licence portal, so a location can''t be added here.' using errcode = '42501';
  end if;
  if new.org_id is distinct from old.org_id then
    raise exception 'A location can''t be moved to another business here. Proview links businesses in the licence portal.' using errcode = '42501';
  end if;
  if new.archived is distinct from old.archived then
    raise exception 'Locations can''t be archived or deleted here. Proview links and unlinks businesses in the licence portal.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.pq_sites_guard() from public, anon, authenticated;

-- + Add location is gone (older open tabs get this message)
create or replace function public.pq_add_site(p_org uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  raise exception 'Businesses are set up by Proview in the licence portal, so a location can''t be added here.';
end $$;

create or replace function public.pq_save_state(p_site uuid, p_data jsonb) returns timestamptz language plpgsql security definer set search_path = public as $$
declare o uuid; t timestamptz := now();
begin
  if not pq_can_site(p_site) then raise exception 'You don''t have access to this location.'; end if;
  if not pq_site_active(p_site) and not pq_is_master() then raise exception 'This business’s licence has ended. Renew it online in Settings → This location, or call Proview on 020 8935 5495.'; end if;
  select org_id into o from pq_sites where id = p_site;
  insert into pq_state(site_id, org_id, data, updated_at, updated_by) values (p_site, o, p_data, t, pq_email())
  on conflict (site_id) do update set data = excluded.data, updated_at = t, updated_by = excluded.updated_by;
  update pq_sites set last_seen = t where id = p_site;
  return t;
end $$;
