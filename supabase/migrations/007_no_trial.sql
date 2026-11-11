-- 007: no free trials (NO_TRIAL_SPEC, owner 11 Nov 2026: "make all businesses start with inactive, they must purchase a
-- license" / "No trials at all").
--
-- A new business and its first location, and any location added later, start with NO licence: the app's existing
-- "no licence" lock with the Buy / renew online plans (Stripe links from the licence hub's hub_plans), the licence portal
-- and 020 8935 5495. The owner can still sign in and reach that screen.
--
-- Trial paths closed here (each inserted the location as 'trial3' for 3 days):
--   pq_self_trial    self-signup "Set up your business": now no licence; the one-trial-per-email check
--                    (pq_trials_used) no longer refuses anyone (the row is still written, as a record).
--   pq_add_business  the master's + Add business: now no licence.
--   pq_create_org    older master "add business": now no licence.
--   pq_add_site      + Add location (owner, admin or master): now no licence.
--   pq_sites_no_trial  new trigger: any other insert into pq_sites (e.g. a future hub_call 'add_business') with a
--                    'trial…' licence is stored with no licence instead.
--   pq_whoami        trial_used is always false now (kept for older app versions, which offered set-up only when false).
-- Not changed: pq_set_trial (master only, sets 'trial3' by hand from Locations → Trial…) and hub_call 'set' (licence
-- portal), as the master may still set a trial licence by hand. Existing locations keep their licence and expiry.
-- Safe to run more than once.

-- 1) Any new location starts without a trial.
create or replace function public.pq_sites_no_trial()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.license_type like 'trial%' then
    new.license_type := null; new.starts_at := null; new.expires_at := null;
  end if;
  return new;
end $$;

drop trigger if exists pq_sites_no_trial on public.pq_sites;
create trigger pq_sites_no_trial before insert on public.pq_sites
  for each row execute function public.pq_sites_no_trial();

-- 2) Self-signup: business + first location (no licence) + you as owner.
create or replace function public.pq_self_trial(p_business text, p_location text, p_phone text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare e text := pq_email(); o uuid;
begin
  if e = '' then raise exception 'Please sign in first.'; end if;
  if pq_is_master() then raise exception 'Masters add businesses from Locations.'; end if;
  if exists(select 1 from pq_members where email = e) then raise exception 'You already belong to a business.'; end if;
  if coalesce(trim(p_business),'') = '' then raise exception 'Enter your business name.'; end if;
  insert into pq_orgs(name, contact_email, phone, created_by, self_signup) values (trim(p_business), e, p_phone, auth.uid(), true) returning id into o;
  insert into pq_sites(org_id, name) values (o, coalesce(nullif(trim(p_location),''), trim(p_business)));   -- no licence until one is bought
  insert into pq_members(org_id, email, role) values (o, e, 'owner');
  insert into pq_trials_used(email, org_id) values (e, o) on conflict (email) do nothing;   -- a record only
  return o;
end $$;

-- 3) The master's + Add business: as before, but the location starts with no licence.
create or replace function public.pq_add_business(p_business text, p_name text, p_email text, p_mobile text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  bn  text := trim(coalesce(p_business, ''));
  nm  text := trim(coalesce(p_name, ''));
  em  text := lower(trim(coalesce(p_email, '')));
  mob text := nullif(left(trim(coalesce(p_mobile, '')), 40), '');
  o uuid; s uuid; uid uuid; existing boolean := false;
begin
  if not pq_is_master() then raise exception 'Only Proview can add businesses.'; end if;
  if length(bn) < 2 then raise exception 'Enter the business name.'; end if;
  if length(nm) < 2 then raise exception 'Enter the owner''s name.'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email address.'; end if;

  insert into pq_orgs(name, contact_email, phone, created_by) values (bn, em, mob, auth.uid()) returning id into o;
  insert into pq_sites(org_id, name) values (o, bn) returning id into s;   -- no licence until one is bought

  select id into uid from auth.users where lower(email) = em and not coalesce(is_anonymous, false) order by created_at limit 1;
  if uid is not null then
    existing := true;
  else
    if length(coalesce(p_password, '')) < 6 then raise exception 'The password needs at least 6 characters.'; end if;
    uid := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change, email_change_token_new)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', em,
            extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_strip_nulls(jsonb_build_object('full_name', nm, 'mobile', mob)), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text, 'email',
            jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true, 'phone_verified', false), now(), now(), now());
  end if;

  insert into pq_members(org_id, email, role, name) values (o, em, 'owner', nm);

  return jsonb_build_object('org_id', o, 'site_id', s, 'user_id', uid, 'email', em, 'existing', existing);
end;
$$;

-- 4) Older master "add business": no licence.
create or replace function public.pq_create_org(p_name text, p_owner_email text, p_location text, p_phone text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare o uuid; s uuid;
begin
  if not pq_is_master() then raise exception 'Only Proview can add businesses.'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Enter the business name.'; end if;
  insert into pq_orgs(name, contact_email, phone, created_by) values (trim(p_name), nullif(lower(trim(p_owner_email)),''), p_phone, auth.uid()) returning id into o;
  insert into pq_sites(org_id, name) values (o, coalesce(nullif(trim(p_location),''), trim(p_name))) returning id into s;   -- no licence
  if coalesce(trim(p_owner_email),'') <> '' then
    insert into pq_members(org_id, email, role) values (o, lower(trim(p_owner_email)), 'owner');
  end if;
  return o;
end $$;

-- 5) + Add location: no licence.
create or replace function public.pq_add_site(p_org uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare s uuid;
begin
  if not pq_admin_of(p_org) then raise exception 'Only the owner, an admin or Proview can add locations.'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'Enter the location name.'; end if;
  insert into pq_sites(org_id, name) values (p_org, trim(p_name)) returning id into s;   -- no licence until one is bought
  return s;
end $$;

-- 6) whoami: trial_used no longer limits anything (always false).
create or replace function public.pq_whoami()
returns jsonb
language sql
stable security definer
set search_path = public
as $$
  select jsonb_build_object('email', pq_email(), 'master', pq_is_master(),
    'trial_used', false,
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('org_id', m.org_id, 'org_name', o.name, 'role', m.role,
        'site_ids', m.site_ids, 'features', m.features, 'suspended', o.suspended) order by lower(o.name))
      from pq_members m join pq_orgs o on o.id = m.org_id where m.email = pq_email()), '[]'::jsonb)) $$;
