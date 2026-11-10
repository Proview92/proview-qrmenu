-- 006: "+ Add business" on the Locations page (ADD_BUSINESS_SPEC, 10 Nov 2026), as Proview Signage
-- (signage migration 038, add_business / add_user).
--
-- pq_add_business (Proview master only), all-or-nothing:
--   1. the business (pq_orgs; the owner's mobile as its phone) and one location (pq_sites) with the same
--      name, on the usual 3-day 'trial3' licence, exactly as pq_create_org; extend it in the licence portal;
--   2. the owner login:
--      - new email: a ready-to-use login (email confirmed, password set, name and mobile kept), no email sent;
--      - email that already has a login: NOT touched, their password stays;
--   3. that email becomes the business 'owner' (pq_members, with the name).
-- Any error (bad email, short password, not the master...) undoes it all. pq_create_org is left as it is.

create or replace function public.pq_add_business(p_business text, p_name text, p_email text, p_mobile text, p_password text)
returns jsonb
language plpgsql security definer
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

  -- the business and its location
  insert into pq_orgs(name, contact_email, phone, created_by) values (bn, em, mob, auth.uid()) returning id into o;
  insert into pq_sites(org_id, name, license_type, starts_at, expires_at)
    values (o, bn, 'trial3', now(), now() + interval '3 days') returning id into s;

  -- the owner login
  select id into uid from auth.users where lower(email) = em and not coalesce(is_anonymous, false) order by created_at limit 1;
  if uid is not null then
    existing := true;   -- already has a login: never touch their password
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

  -- Owner of the whole business (all its locations)
  insert into pq_members(org_id, email, role, name) values (o, em, 'owner', nm);

  return jsonb_build_object('org_id', o, 'site_id', s, 'user_id', uid, 'email', em, 'existing', existing);
end;
$$;
revoke all on function public.pq_add_business(text, text, text, text, text) from public, anon;
grant execute on function public.pq_add_business(text, text, text, text, text) to authenticated;
