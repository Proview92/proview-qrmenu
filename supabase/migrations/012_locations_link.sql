-- 012: locations, not customers. Only the master links them (owner, 12 Nov 2026, LOCATIONS_LINK_SPEC.md; hub contract
-- LOCATIONS_LINK_PROTOCOL.md).
--
-- A business (pq_orgs) holds 1..N locations (pq_sites). From now on:
--   * nobody adds, archives (QR Menu's "delete") or moves a location in the app: not owners, admins, managers, staff,
--     nor the master inside a business. pq_add_site always refuses. The only new locations are the FIRST location of a
--     brand-new business, made in the same transaction as the business (pq_add_business = the licence portal's
--     New location via hub 'add_business', pq_self_trial = the free self sign-up, and the older pq_create_org).
--     Renaming a location stays as it is. The master can still delete a whole business (pq_delete_org).
--   * the licence portal (hub token only) links and unlinks locations:
--       hub_call(token, 'link',   {into: A, from: B}) -> {ok, account: A, from: B, moved_sites, already, renamed_units: []}
--         merges business B into A in one transaction: B's locations (pq_sites, with their licences unchanged), their
--         app data (pq_state), guest inbox (pq_inbox) and the trial record move to A; B's members join A, a person
--         in both keeps the higher role (owner > admin > manager > staff); owners, admins and managers get every
--         location of the merged business; staff keep exactly the locations they had. A keeps its name, contact
--         email and phone. B is deleted. Idempotent (hub_private.location_links).
--       hub_call(token, 'unlink', {account: A, site: S}) -> {ok, account: N, from: A, site: S, already, renamed_units: []}
--         moves location S (with its licence, app data and inbox) out of A into a new business N named after the
--         location, contact email and phone copied from A. Members with access to S are copied (A keeps them):
--         owners and admins as they are, managers and staff of S with S only; S is removed from A's members.
--         Refused when S is A's only (unarchived) location. Idempotent.
--     Menu photos live under <location id>/ in Storage, so they move with the location without any change.
-- Unchanged: 'list', 'set', 'add_business', the master-open scoping (011), every read rule.
-- Safe to run more than once.

-- 1) log of links and unlinks (idempotency, and the record of what moved)
create table if not exists hub_private.location_links(
  id bigint generated always as identity primary key,
  action text not null check (action in ('link', 'unlink')),
  from_account uuid not null,
  into_account uuid not null,
  site_id uuid,
  moved_sites jsonb not null default '[]'::jsonb,
  at timestamptz not null default now());
create index if not exists location_links_from on hub_private.location_links(action, from_account);
revoke all on table hub_private.location_links from public, anon, authenticated;

-- 2) no adding, archiving or moving locations except through the hub (or a brand-new business's first location).
--    The hub flag (pq.hub_move) is set only inside the hub's own SECURITY DEFINER functions, and never counts for a
--    request running as anon / authenticated.
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
    raise exception 'New locations are added by Proview in the licence portal.' using errcode = '42501';
  end if;
  if new.org_id is distinct from old.org_id then
    raise exception 'A location can''t be moved to another business here. Proview links locations in the licence portal.' using errcode = '42501';
  end if;
  if new.archived is distinct from old.archived then
    raise exception 'Locations can''t be archived or deleted here. Proview unlinks locations in the licence portal.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.pq_sites_guard() from public, anon, authenticated;
drop trigger if exists pq_sites_guard on public.pq_sites;
create trigger pq_sites_guard before insert or update on public.pq_sites for each row execute function public.pq_sites_guard();

-- + Add location is gone (older open tabs get this message)
create or replace function public.pq_add_site(p_org uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
begin
  raise exception 'New locations are added by Proview in the licence portal.';
end $$;

-- 3) link: merge business p_from into p_into
create or replace function hub_private.pq_link_orgs(p_into text, p_from text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.pq_orgs; b public.pq_orgs; lg hub_private.location_links; moved jsonb; all_sites uuid[];
  rk constant jsonb := '{"owner":4,"admin":3,"manager":2,"staff":1}';
  bm public.pq_members; am public.pq_members; ia uuid; ib uuid; nr text;
  uu constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if coalesce(trim(p_into), '') = '' or coalesce(trim(p_from), '') = '' then raise exception 'link needs into and from.'; end if;
  if p_into = p_from then raise exception 'An account can''t be linked to itself.'; end if;
  if p_into !~ uu then raise exception 'Account not found: %', p_into; end if;
  if p_from !~ uu then raise exception 'Account not found: %', p_from; end if;
  ia := p_into::uuid; ib := p_from::uuid;
  select * into a from public.pq_orgs where id = ia for update;
  select * into b from public.pq_orgs where id = ib for update;
  if b.id is null then
    select * into lg from hub_private.location_links where action = 'link' and from_account = ib order by id desc limit 1;
    if lg.id is not null and lg.into_account <> ia then
      raise exception '% was already linked into %, not %.', p_from, lg.into_account, p_into;
    end if;
    if lg.id is not null and a.id is not null then
      return jsonb_build_object('ok', true, 'account', p_into, 'from', p_from, 'moved_sites', lg.moved_sites, 'already', true,
                                'renamed_units', '[]'::jsonb);
    end if;
    raise exception 'Account not found: %', case when a.id is null then p_into else p_from end;
  end if;
  if a.id is null then raise exception 'Account not found: %', p_into; end if;

  perform set_config('pq.hub_move', '1', true);
  select coalesce(jsonb_agg(id::text order by created_at, id), '[]'::jsonb) into moved from public.pq_sites where org_id = b.id;
  update public.pq_sites set org_id = a.id where org_id = b.id;
  update public.pq_state set org_id = a.id where org_id = b.id;
  update public.pq_inbox set org_id = a.id where org_id = b.id;
  update public.pq_trials_used set org_id = a.id where org_id = b.id;
  select coalesce(array_agg(id order by created_at, id), '{}') into all_sites from public.pq_sites where org_id = a.id;

  for bm in select * from public.pq_members where org_id = b.id loop
    select * into am from public.pq_members where org_id = a.id and email = bm.email;
    if am.email is not null then
      nr := case when (rk->>bm.role)::int > (rk->>am.role)::int then bm.role else am.role end;
      update public.pq_members set role = nr,
        site_ids = (select coalesce(array_agg(distinct x), '{}') from unnest(am.site_ids || bm.site_ids) x),
        features = coalesce(bm.features, '{}'::jsonb) || coalesce(am.features, '{}'::jsonb),
        name = coalesce(nullif(am.name, ''), bm.name)
       where org_id = a.id and email = am.email;
      delete from public.pq_members where org_id = b.id and email = bm.email;
    else
      update public.pq_members set org_id = a.id where org_id = b.id and email = bm.email;
    end if;
  end loop;
  -- owners, admins and managers: every location of the merged business (owners / admins see them all anyway)
  update public.pq_members set site_ids = all_sites where org_id = a.id and role = 'manager';

  delete from public.pq_orgs where id = b.id;
  insert into hub_private.location_links(action, from_account, into_account, moved_sites) values ('link', b.id, a.id, moved);
  perform set_config('pq.hub_move', '', true);
  return jsonb_build_object('ok', true, 'account', a.id::text, 'from', b.id::text, 'moved_sites', moved, 'already', false,
                            'renamed_units', '[]'::jsonb);
end $$;
revoke all on function hub_private.pq_link_orgs(text, text) from public, anon, authenticated;

-- 4) unlink: move location p_site out of business p_org into a new business of its own
create or replace function hub_private.pq_unlink_site(p_org text, p_site text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.pq_orgs; s public.pq_sites; lg hub_private.location_links; nid uuid; n_other int; ia uuid; isite uuid;
  uu constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if coalesce(trim(p_org), '') = '' or coalesce(trim(p_site), '') = '' then raise exception 'unlink needs account and site.'; end if;
  if p_org !~ uu then raise exception 'Account not found: %', p_org; end if;
  if p_site !~ uu then raise exception 'Location not found: %', p_site; end if;
  ia := p_org::uuid; isite := p_site::uuid;
  select * into a from public.pq_orgs where id = ia for update;
  select * into s from public.pq_sites where id = isite for update;
  if a.id is null or s.id is null or s.org_id <> a.id then
    select * into lg from hub_private.location_links where action = 'unlink' and from_account = ia and site_id = isite order by id desc limit 1;
    if lg.id is not null and s.id is not null and s.org_id = lg.into_account then
      return jsonb_build_object('ok', true, 'account', lg.into_account::text, 'from', p_org, 'site', p_site, 'already', true,
                                'renamed_units', '[]'::jsonb);
    end if;
    if a.id is null then raise exception 'Account not found: %', p_org; end if;
    if s.id is null then raise exception 'Location not found: %', p_site; end if;
    raise exception 'That location is not in account %.', p_org;
  end if;
  select count(*) into n_other from public.pq_sites where org_id = a.id and id <> s.id and not archived;
  if n_other = 0 then raise exception '% has only that one location, so there is nothing to unlink.', a.name; end if;

  perform set_config('pq.hub_move', '1', true);
  insert into public.pq_orgs(name, contact_email, phone, created_by, self_signup, suspended)
    values (s.name, a.contact_email, a.phone, a.created_by, false, a.suspended) returning id into nid;
  update public.pq_sites set org_id = nid where id = s.id;
  update public.pq_state set org_id = nid where site_id = s.id;
  update public.pq_inbox set org_id = nid where site_id = s.id;
  -- members with access to this location: copied (A keeps them); a restriction is reduced to this location
  insert into public.pq_members(org_id, email, name, role, site_ids, features)
    select nid, m.email, m.name, m.role, case when m.role in ('owner', 'admin') then '{}'::uuid[] else array[s.id] end, m.features
      from public.pq_members m where m.org_id = a.id and (m.role in ('owner', 'admin') or s.id = any(m.site_ids));
  update public.pq_members set site_ids = array_remove(site_ids, s.id) where org_id = a.id and s.id = any(site_ids);

  insert into hub_private.location_links(action, from_account, into_account, site_id, moved_sites)
    values ('unlink', a.id, nid, s.id, jsonb_build_array(s.id::text));
  perform set_config('pq.hub_move', '', true);
  return jsonb_build_object('ok', true, 'account', nid::text, 'from', a.id::text, 'site', s.id::text, 'already', false,
                            'renamed_units', '[]'::jsonb);
end $$;
revoke all on function hub_private.pq_unlink_site(text, text) from public, anon, authenticated;

-- 5) hub_call: 'link' and 'unlink' added; 'add_business' exactly as 008; every other action goes to the base as before
create or replace function public.hub_call(p_token text, p_action text, p_args jsonb default '{}'::jsonb)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  r jsonb; mu uuid; me text;
  ce text := nullif(lower(trim(coalesce(p_args->>'contact_email', ''))), '');
  c_claims text := current_setting('request.jwt.claims', true);
  c_sub    text := current_setting('request.jwt.claim.sub', true);
  c_claim  text := current_setting('request.jwt.claim', true);
begin
  if p_action in ('link', 'unlink') then
    if p_token is null or encode(extensions.digest(p_token, 'sha256'), 'hex') is distinct from (select token_sha256 from hub_private.config where id = 1) then
      raise exception 'not authorised';
    end if;
    if p_action = 'link' then return hub_private.pq_link_orgs(p_args->>'into', p_args->>'from'); end if;
    return hub_private.pq_unlink_site(p_args->>'account', regexp_replace(coalesce(p_args->>'site', p_args->>'unit', ''), '^loc/', ''));
  end if;
  if p_action is distinct from 'add_business' then
    return hub_private.hub_call_base(p_token, p_action, p_args);
  end if;
  if p_token is null or encode(extensions.digest(p_token, 'sha256'), 'hex') is distinct from (select token_sha256 from hub_private.config where id = 1) then
    raise exception 'not authorised';
  end if;
  if ce is not null and ce !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid contact email, or leave it empty.'; end if;

  -- the master's own Add business, run as the master (pq_masters (by email)) for this one call
  select u.id, m.email into mu, me from public.pq_masters m
    left join auth.users u on lower(u.email) = m.email and not coalesce(u.is_anonymous, false)
   order by m.email limit 1;
  if mu is null and me is null then raise exception 'This app has no Proview master account to add the business with.'; end if;
  perform set_config('request.jwt.claims', jsonb_strip_nulls(jsonb_build_object('sub', mu, 'email', me, 'role', 'authenticated',
                     'aud', 'authenticated', 'is_anonymous', false))::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(mu::text, ''), true);
  perform set_config('request.jwt.claim', '', true);
  r := public.pq_add_business(p_args->>'business', p_args->>'name', p_args->>'email', p_args->>'mobile', p_args->>'password');
  perform set_config('request.jwt.claims', coalesce(c_claims, ''), true);
  perform set_config('request.jwt.claim.sub', coalesce(c_sub, ''), true);
  perform set_config('request.jwt.claim', coalesce(c_claim, ''), true);

  -- pq_add_business stores the owner's email as the contact email; the portal may pass the customer's instead
  if ce is not null then update public.pq_orgs set contact_email = ce where id = (r->>'org_id')::uuid; end if;
  return r || jsonb_build_object('account_id', r->>'org_id');
end;
$$;
revoke all on function public.hub_call(text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.hub_call(text, text, jsonb) to anon, service_role;
