-- Proview QR Menu: access model (applied to project yblafwttmqaqvfvedaoc on 9 Nov 2026).
-- Businesses (pq_orgs) → locations (pq_sites, one licence each) → members by email with role, locations and feature switches.
-- Master: pq_masters. Per-location app data: pq_state (jsonb). Licence portal: hub_call / hub_plans with a hashed token.
create extension if not exists pgcrypto with schema extensions;
create schema if not exists hub_private;
revoke all on schema hub_private from public, anon, authenticated;

create table public.pq_masters(email text primary key check (email = lower(email)), created_at timestamptz default now());
create table public.pq_orgs(
  id uuid primary key default gen_random_uuid(), name text not null, contact_email text, phone text,
  created_by uuid, created_at timestamptz not null default now(), self_signup boolean not null default false, suspended boolean not null default false);
create table public.pq_sites(
  id uuid primary key default gen_random_uuid(), org_id uuid not null references public.pq_orgs(id) on delete cascade,
  name text not null, created_at timestamptz not null default now(), archived boolean not null default false,
  license_type text, starts_at timestamptz, expires_at timestamptz, notes text, last_seen timestamptz);
create index on public.pq_sites(org_id);
create table public.pq_members(
  org_id uuid not null references public.pq_orgs(id) on delete cascade, email text not null check (email = lower(email)),
  name text, role text not null check (role in ('owner','admin','manager','staff')),
  site_ids uuid[] not null default '{}', features jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  primary key (org_id, email));
create index on public.pq_members(email);
create table public.pq_state(
  site_id uuid primary key references public.pq_sites(id) on delete cascade, org_id uuid not null references public.pq_orgs(id) on delete cascade,
  data jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), updated_by text);
create table public.pq_trials_used(email text primary key, org_id uuid, at timestamptz default now());
create table public.pq_sso_used(jti text primary key, email text, at timestamptz default now());
create table hub_private.config(id int primary key check (id = 1), token_sha256 text, plans jsonb not null default '{}'::jsonb);
insert into hub_private.config(id) values (1);

alter table public.pq_masters enable row level security;
alter table public.pq_orgs enable row level security;
alter table public.pq_sites enable row level security;
alter table public.pq_members enable row level security;
alter table public.pq_state enable row level security;
alter table public.pq_trials_used enable row level security;
alter table public.pq_sso_used enable row level security;

insert into public.pq_masters(email) values ('altun@proviewtech.co.uk');

-- helpers
create or replace function public.pq_email() returns text language sql stable as $$ select lower(coalesce(auth.jwt()->>'email','')) $$;
create or replace function public.pq_is_master() returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from pq_masters where email = pq_email() and pq_email() <> '') $$;
create or replace function public.pq_role(p_org uuid) returns text language sql stable security definer set search_path = public as $$
  select role from pq_members where org_id = p_org and email = pq_email() $$;
create or replace function public.pq_can_org(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select pq_is_master() or exists(select 1 from pq_members where org_id = p_org and email = pq_email()) $$;
create or replace function public.pq_can_site(p_site uuid) returns boolean language sql stable security definer set search_path = public as $$
  select pq_is_master() or exists(
    select 1 from pq_sites s join pq_members m on m.org_id = s.org_id and m.email = pq_email()
     where s.id = p_site and (m.role in ('owner','admin') or s.id = any(m.site_ids))) $$;
create or replace function public.pq_admin_of(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select pq_is_master() or coalesce(pq_role(p_org) in ('owner','admin'), false) $$;
create or replace function public.pq_site_active(p_site uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from pq_sites s join pq_orgs o on o.id = s.org_id
    where s.id = p_site and not s.archived and not o.suspended and s.license_type is not null
      and (s.license_type = 'lifetime' or s.expires_at > now())) $$;

-- read policies (all writes go through the functions below)
create policy orgs_read on public.pq_orgs for select to authenticated using (pq_can_org(id));
create policy sites_read on public.pq_sites for select to authenticated using (pq_can_site(id) or pq_admin_of(org_id));
create policy members_read on public.pq_members for select to authenticated using (pq_admin_of(org_id) or email = pq_email());
create policy state_read on public.pq_state for select to authenticated using (pq_can_site(site_id));

create or replace function public.pq_whoami() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('email', pq_email(), 'master', pq_is_master(),
    'trial_used', exists(select 1 from pq_trials_used where email = pq_email()),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('org_id', m.org_id, 'org_name', o.name, 'role', m.role,
        'site_ids', m.site_ids, 'features', m.features, 'suspended', o.suspended) order by lower(o.name))
      from pq_members m join pq_orgs o on o.id = m.org_id where m.email = pq_email()), '[]'::jsonb)) $$;

create or replace function public.pq_orgs_list() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'contact_email', o.contact_email, 'self_signup', o.self_signup,
      'suspended', o.suspended, 'created_at', o.created_at,
      'sites', (select count(*) from pq_sites s where s.org_id = o.id and not s.archived),
      'users', (select count(*) from pq_members m where m.org_id = o.id)) order by lower(o.name)), '[]'::jsonb)
  from pq_orgs o where pq_is_master() or exists(select 1 from pq_members m where m.org_id = o.id and m.email = pq_email()) $$;

create or replace function public.pq_sites_of(p_org uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'archived', s.archived, 'created_at', s.created_at,
      'license_type', s.license_type, 'starts_at', s.starts_at, 'expires_at', s.expires_at, 'notes', s.notes,
      'active', pq_site_active(s.id)) order by lower(s.name)), '[]'::jsonb)
  from pq_sites s where s.org_id = p_org and pq_can_org(p_org) and (pq_admin_of(p_org) or pq_can_site(s.id)) $$;

create or replace function public.pq_create_org(p_name text, p_owner_email text, p_location text, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare o uuid; s uuid;
begin
  if not pq_is_master() then raise exception 'Only Proview can add businesses.'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Enter the business name.'; end if;
  insert into pq_orgs(name, contact_email, phone, created_by) values (trim(p_name), nullif(lower(trim(p_owner_email)),''), p_phone, auth.uid()) returning id into o;
  insert into pq_sites(org_id, name, license_type, starts_at, expires_at)
    values (o, coalesce(nullif(trim(p_location),''), trim(p_name)), 'trial3', now(), now() + interval '3 days') returning id into s;
  if coalesce(trim(p_owner_email),'') <> '' then
    insert into pq_members(org_id, email, role) values (o, lower(trim(p_owner_email)), 'owner');
  end if;
  return o;
end $$;

create or replace function public.pq_self_trial(p_business text, p_location text, p_phone text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare e text := pq_email(); o uuid;
begin
  if e = '' then raise exception 'Please sign in first.'; end if;
  if pq_is_master() then raise exception 'Masters add businesses from Locations.'; end if;
  if exists(select 1 from pq_members where email = e) then raise exception 'You already belong to a business.'; end if;
  if exists(select 1 from pq_trials_used where email = e) then raise exception 'This email has already used its free trial. Call 020 8935 5495 to renew.'; end if;
  if coalesce(trim(p_business),'') = '' then raise exception 'Enter your business name.'; end if;
  insert into pq_orgs(name, contact_email, phone, created_by, self_signup) values (trim(p_business), e, p_phone, auth.uid(), true) returning id into o;
  insert into pq_sites(org_id, name, license_type, starts_at, expires_at)
    values (o, coalesce(nullif(trim(p_location),''), trim(p_business)), 'trial3', now(), now() + interval '3 days');
  insert into pq_members(org_id, email, role) values (o, e, 'owner');
  insert into pq_trials_used(email, org_id) values (e, o);
  return o;
end $$;

create or replace function public.pq_add_site(p_org uuid, p_name text) returns uuid language plpgsql security definer set search_path = public as $$
declare s uuid;
begin
  if not pq_admin_of(p_org) then raise exception 'Only the owner, an admin or Proview can add locations.'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Enter the location name.'; end if;
  insert into pq_sites(org_id, name, license_type, starts_at, expires_at)
    values (p_org, trim(p_name), 'trial3', now(), now() + interval '3 days') returning id into s;
  return s;
end $$;
create or replace function public.pq_update_site(p_site uuid, p_name text, p_archived boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not pq_admin_of((select org_id from pq_sites where id = p_site)) then raise exception 'Not allowed.'; end if;
  update pq_sites set name = coalesce(nullif(trim(p_name),''), name), archived = coalesce(p_archived, archived) where id = p_site;
end $$;
create or replace function public.pq_update_org(p_org uuid, p_name text, p_suspended boolean default null) returns void language plpgsql security definer set search_path = public as $$
begin
  if not pq_admin_of(p_org) then raise exception 'Not allowed.'; end if;
  if p_suspended is not null and not pq_is_master() then raise exception 'Only Proview can suspend a business.'; end if;
  update pq_orgs set name = coalesce(nullif(trim(p_name),''), name), suspended = coalesce(p_suspended, suspended) where id = p_org;
end $$;
create or replace function public.pq_delete_org(p_org uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not pq_is_master() then raise exception 'Only Proview can delete a business.'; end if;
  delete from pq_orgs where id = p_org;
end $$;

create or replace function public.pq_set_trial(p_site uuid, p_days int default null, p_until timestamptz default null, p_clear boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r pq_sites;
begin
  if not pq_is_master() then raise exception 'Only Proview can change trials.'; end if;
  if p_clear then update pq_sites set license_type = null, starts_at = null, expires_at = null where id = p_site;
  else update pq_sites set license_type = 'trial3', starts_at = coalesce(starts_at, now()),
      expires_at = coalesce(p_until, greatest(coalesce(expires_at, now()), now()) + make_interval(days => coalesce(p_days, 3))) where id = p_site;
  end if;
  select * into r from pq_sites where id = p_site;
  return to_jsonb(r);
end $$;

create or replace function public.pq_set_member(p_org uuid, p_email text, p_role text, p_site_ids uuid[], p_features jsonb, p_name text default null)
returns void language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email)); cur text;
begin
  if not pq_admin_of(p_org) then raise exception 'Only the owner, an admin or Proview can manage users.'; end if;
  if e = pq_email() and not pq_is_master() then raise exception 'You can''t change your own access.'; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address.'; end if;
  if p_role not in ('owner','admin','manager','staff') then raise exception 'Unknown role.'; end if;
  select role into cur from pq_members where org_id = p_org and email = e;
  if (p_role = 'owner' or cur = 'owner') and not (pq_is_master() or pq_role(p_org) = 'owner') then raise exception 'Only an owner can add or change owners.'; end if;
  if exists(select 1 from unnest(coalesce(p_site_ids,'{}')) x where x not in (select id from pq_sites where org_id = p_org)) then raise exception 'Unknown location.'; end if;
  insert into pq_members(org_id, email, role, site_ids, features, name)
    values (p_org, e, p_role, coalesce(p_site_ids,'{}'), coalesce(p_features,'{}'::jsonb), nullif(trim(p_name),''))
  on conflict (org_id, email) do update set role = excluded.role, site_ids = excluded.site_ids, features = excluded.features,
    name = coalesce(excluded.name, pq_members.name);
end $$;
create or replace function public.pq_remove_member(p_org uuid, p_email text) returns void language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(p_email));
begin
  if not pq_admin_of(p_org) then raise exception 'Not allowed.'; end if;
  if e = pq_email() and not pq_is_master() then raise exception 'You can''t remove yourself.'; end if;
  if (select role from pq_members where org_id = p_org and email = e) = 'owner' and not (pq_is_master() or pq_role(p_org) = 'owner') then raise exception 'Only an owner can remove an owner.'; end if;
  delete from pq_members where org_id = p_org and email = e;
end $$;

create or replace function public.pq_save_state(p_site uuid, p_data jsonb) returns timestamptz language plpgsql security definer set search_path = public as $$
declare o uuid; t timestamptz := now();
begin
  if not pq_can_site(p_site) then raise exception 'You don''t have access to this location.'; end if;
  if not pq_site_active(p_site) and not pq_is_master() then raise exception 'This location''s licence has ended. Renew at license.proviewcrm.co.uk or call 020 8935 5495.'; end if;
  select org_id into o from pq_sites where id = p_site;
  insert into pq_state(site_id, org_id, data, updated_at, updated_by) values (p_site, o, p_data, t, pq_email())
  on conflict (site_id) do update set data = excluded.data, updated_at = t, updated_by = excluded.updated_by;
  update pq_sites set last_seen = t where id = p_site;
  return t;
end $$;

create or replace function public.pq_plans() returns jsonb language sql stable security definer set search_path = public, hub_private as $$
  select plans from hub_private.config where id = 1 $$;

-- "Sign in with Proview account": can this email sign in here? (service role only)
create or replace function public.sso_entitled(p_email text) returns jsonb language sql stable security definer set search_path = public, auth as $$
  select case
    when exists(select 1 from pq_masters where email = lower(p_email)) or exists(select 1 from pq_members where email = lower(p_email) and role in ('owner','admin','manager'))
      then jsonb_build_object('ok', true, 'create', true, 'user_id', (select id from auth.users where lower(email) = lower(p_email) limit 1))
    else jsonb_build_object('ok', false, 'reason', 'No Proview QR Menu login for this email.') end $$;
revoke all on function public.sso_entitled(text) from public, anon, authenticated;

-- licence portal (license.proviewcrm.co.uk): list / set licences per location
create or replace function public.hub_call(p_token text, p_action text, p_args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare cur pq_sites; base timestamptz; new_exp timestamptz;
  t text := nullif(p_args->>'type',''); ext boolean := coalesce((p_args->>'extend')::boolean,false);
  cust timestamptz := nullif(p_args->>'expires','')::timestamptz; nt text := p_args->>'notes'; u uuid;
begin
  if p_token is null or encode(extensions.digest(p_token,'sha256'),'hex') is distinct from (select token_sha256 from hub_private.config where id = 1) then
    raise exception 'not authorised'; end if;
  if p_action = 'list' then
    return jsonb_build_object(
      'accounts', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name,
          'contact_email', coalesce(o.contact_email, (select email from auth.users x where x.id = o.created_by)), 'phone', o.phone,
          'created_at', o.created_at, 'self_signup', o.self_signup, 'suspended', o.suspended) order by lower(o.name)) from pq_orgs o), '[]'::jsonb),
      'units', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'account_id', s.org_id, 'name', s.name,
          'detail', (select name from pq_orgs where id = s.org_id), 'license_type', s.license_type, 'starts_at', s.starts_at,
          'expires_at', s.expires_at, 'notes', s.notes, 'last_seen', s.last_seen, 'archived', s.archived) order by lower(s.name)) from pq_sites s), '[]'::jsonb));
  elsif p_action = 'set' then
    u := (p_args->>'unit')::uuid;
    select * into cur from pq_sites where id = u for update;
    if not found then raise exception 'Location not found'; end if;
    if t is null then
      update pq_sites set license_type = null, starts_at = null, expires_at = null, notes = coalesce(nullif(trim(nt),''), notes) where id = u;
    else
      if t = 'lifetime' then new_exp := null;
      elsif t = 'custom' then if cust is null then raise exception 'Choose an end date.'; end if; new_exp := cust;
      else
        base := case when ext and cur.license_type is distinct from 'lifetime' and cur.expires_at > now() then cur.expires_at else now() end;
        new_exp := base + case t when 'trial3' then interval '3 days' when 'm1' then interval '1 month' when 'm3' then interval '3 months'
          when 'm6' then interval '6 months' when 'm12' then interval '12 months' when 'm24' then interval '24 months' when 'm36' then interval '36 months'
          else null end;
        if new_exp is null then raise exception 'Unknown licence type %', t; end if;
      end if;
      update pq_sites set license_type = t, starts_at = case when ext and starts_at is not null then starts_at else now() end,
        expires_at = new_exp, notes = coalesce(nullif(trim(nt),''), notes) where id = u;
    end if;
    select * into cur from pq_sites where id = u;
    return jsonb_build_object('id', cur.id, 'license_type', cur.license_type, 'starts_at', cur.starts_at, 'expires_at', cur.expires_at, 'notes', cur.notes);
  else raise exception 'unknown action %', p_action; end if;
end $$;
create or replace function public.hub_plans(p_token text, p_plans jsonb) returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_token is null or encode(extensions.digest(p_token,'sha256'),'hex') is distinct from (select token_sha256 from hub_private.config where id = 1) then
    raise exception 'not authorised'; end if;
  update hub_private.config set plans = coalesce(p_plans,'{}'::jsonb) where id = 1;
  return jsonb_build_object('ok', true, 'plans', (select count(*) from jsonb_object_keys(coalesce(p_plans,'{}'::jsonb))));
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.pq_email, public.pq_is_master, public.pq_role, public.pq_can_org, public.pq_can_site, public.pq_admin_of, public.pq_site_active,
  public.pq_whoami, public.pq_orgs_list, public.pq_sites_of, public.pq_create_org, public.pq_self_trial, public.pq_add_site, public.pq_update_site,
  public.pq_update_org, public.pq_delete_org, public.pq_set_trial, public.pq_set_member, public.pq_remove_member, public.pq_save_state, public.pq_plans to authenticated;
grant execute on function public.hub_call(text,text,jsonb), public.hub_plans(text,jsonb) to anon, authenticated;
grant execute on function public.sso_entitled(text) to service_role;
