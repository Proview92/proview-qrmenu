-- 016 (owner, 20 Nov 2026): the standard Proview roles and sign-in check, the same in every Proview app.
--   Roles of a business: admin, manager, staff (nothing else). The Proview master stays the master (pq_masters).
--   "owner" is gone: every owner becomes admin, and an admin can do everything an owner could (manage users, admins,
--   licences). Done by rewriting each function that knew 'owner' so it reads 'admin', and by a CHECK on pq_members.role.
--   Sign-in check (sso_entitled), as Proview WiFi's rules, with account wording:
--     on hold -> "This Proview QR Menu account is on hold. Contact Proview."
--     master, or a member of a business -> let in (a missing login is made; one password gives it the password)
--     anyone else -> "No Proview QR Menu account for this email."
-- Safe to run more than once.

-- 1) data
update public.pq_members set role = 'admin' where lower(role) = 'owner';

-- 2) only admin / manager / staff
do $c$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid = 'public.pq_members'::regclass and contype = 'c'
            and pg_get_constraintdef(oid) ~* 'role' loop
    execute format('alter table public.pq_members drop constraint %I', r.conname);
  end loop;
  alter table public.pq_members add constraint pq_members_role_check check (role in ('admin', 'manager', 'staff'));
end $c$;

-- 3) every function that knew 'owner' now reads 'admin' (texts reworded), same signatures, grants and owners
do $f$
declare r record; d text; n text;
begin
  for r in select p.oid from pg_proc p join pg_namespace s on s.oid = p.pronamespace
            where s.nspname in ('public', 'hub_private') and p.prokind = 'f' and p.prosrc ~* 'owner' loop
    d := pg_get_functiondef(r.oid); n := d;
    -- the role list the licence portal shows, and the link ranking: no owner
    n := replace(n, '{"value": "owner", "label": "Owner"}, ', '');
    n := replace(n, '"owner":4,', '');
    -- messages
    n := replace(n, 'Only an owner can add or change owners.', 'Only an admin can add or change admins.');
    n := replace(n, 'Only the owner, an admin or Proview', 'Only an admin or Proview');
    n := replace(n, 'Only an owner can remove an owner.', 'Only an admin can remove an admin.');
    n := replace(n, 'This is the only owner of the business. Add another owner first.', 'This is the only admin of the business. Add another admin first.');
    n := replace(n, 'Enter the owner''''s name.', 'Enter the admin''''s name.');
    -- the role itself
    n := replace(n, '''owner''', '''admin''');
    if n <> d then execute n; end if;
  end loop;
end $f$;

-- 4) the standard sign-in check
create or replace function public.sso_entitled(p_email text) returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare uid uuid; ban timestamptz; em text := lower(trim(p_email));
begin
  select id, banned_until into uid, ban from auth.users
   where lower(email) = em and not coalesce(is_anonymous, false) order by created_at limit 1;
  if ban > now() then return jsonb_build_object('ok', false, 'reason', 'This Proview QR Menu account is on hold. Contact Proview.'); end if;
  if exists (select 1 from public.pq_masters where email = em) or exists (select 1 from public.pq_members where email = em) then
    return jsonb_build_object('ok', true, 'user_id', uid, 'create', uid is null);
  end if;
  return jsonb_build_object('ok', false, 'reason', 'No Proview QR Menu account for this email.');
end $$;
revoke execute on function public.sso_entitled(text) from public, anon, authenticated;
grant execute on function public.sso_entitled(text) to service_role;
