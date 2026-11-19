-- Test for 016_standard_roles.sql. Paste into the SQL editor of proview-qrmenu (yblafwttmqaqvfvedaoc) AFTER the migration.
-- Throw-away rows (zz016q / example.invalid); it ALWAYS ends with an exception listing PASS / FAIL, which rolls back.
do $t$
declare out text[] := '{}'; tok text := 'zz016q-hub-token'; oa uuid; a1 uuid; j jsonb; r jsonb; n int; ok boolean;
begin
  update hub_private.config set token_sha256 = encode(extensions.digest(tok, 'sha256'), 'hex') where id = 1;
  insert into pq_orgs(name) values ('zz016q Alpha') returning id into oa;
  insert into pq_sites(org_id, name) values (oa, 'zz016q A') returning id into a1;

  -- the role column: admin / manager / staff only
  begin insert into pq_members(org_id, email, role) values (oa, 'zz016q-o@example.invalid', 'owner'); out := out || 'FAIL owner role accepted'::text;
  exception when check_violation then out := out || 'PASS owner role refused by the table'::text; end;
  insert into pq_members(org_id, email, role) values (oa, 'zz016q-adm@example.invalid', 'admin');
  insert into pq_members(org_id, email, role, site_ids) values (oa, 'zz016q-mgr@example.invalid', 'manager', array[a1]);
  select count(*) into n from pq_members where lower(role) = 'owner';
  out := out || ((case when n = 0 then 'PASS' else 'FAIL' end) || ' no owner left in pq_members (' || n || ')');

  -- no function knows 'owner' any more
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname in ('public', 'hub_private') and p.prosrc ~ '''owner''|"owner"';
  out := out || ((case when n = 0 then 'PASS' else 'FAIL' end) || ' no function uses the owner role (' || n || ')');

  -- an admin does what an owner did: add an admin, add a manager, change a role
  perform set_config('request.jwt.claims', '{"email":"zz016q-adm@example.invalid","role":"authenticated"}', true);
  begin perform pq_set_member(oa, 'zz016q-adm2@example.invalid', 'admin', '{}', '{}'::jsonb, null); out := out || 'PASS an admin adds another admin'::text;
  exception when others then out := out || ('FAIL admin adds admin: ' || sqlerrm); end;
  begin perform pq_set_member(oa, 'zz016q-new@example.invalid', 'manager', array[a1], '{}'::jsonb, null); out := out || 'PASS an admin adds a manager'::text;
  exception when others then out := out || ('FAIL admin adds manager: ' || sqlerrm); end;
  begin perform pq_set_member(oa, 'zz016q-x@example.invalid', 'owner', '{}', '{}'::jsonb, null); out := out || 'FAIL owner role given'::text;
  exception when others then out := out || ('PASS owner role can''t be given: ' || sqlerrm); end;
  ok := public.pq_admin_of(oa);
  out := out || ((case when ok then 'PASS' else 'FAIL' end) || ' an admin has the old owner rights');
  -- a manager still can't manage users
  perform set_config('request.jwt.claims', '{"email":"zz016q-mgr@example.invalid","role":"authenticated"}', true);
  begin perform pq_set_member(oa, 'zz016q-y@example.invalid', 'staff', array[a1], '{}'::jsonb, null); out := out || 'FAIL a manager added a user'::text;
  exception when others then out := out || ('PASS a manager can''t manage users: ' || sqlerrm); end;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  -- the licence portal: role list without Owner, New business makes an Admin
  j := hub_users(tok, 'list', jsonb_build_object('account', oa::text));
  out := out || ((case when j::text !~* 'owner' and j::text ~ '"admin"' then 'PASS' else 'FAIL' end) || ' portal role list: Admin / Manager / Staff ' || coalesce(j->'roles', j)::text);
  begin
    j := hub_call(tok, 'add_business', jsonb_build_object('business', 'zz016q Beta', 'name', 'Bea Test', 'email', 'zz016q-bea@example.invalid', 'password', 'longpassword18'));
    select role into r from (select to_jsonb(m.role) as role from pq_members m where m.email = 'zz016q-bea@example.invalid') x;
    out := out || ((case when r #>> '{}' = 'admin' then 'PASS' else 'FAIL' end) || ' New business makes its login an Admin (' || coalesce(r #>> '{}', 'none') || ')');
  exception when others then out := out || ('FAIL add_business: ' || sqlerrm); end;

  -- sign-in check
  r := public.sso_entitled('zz016q-stranger@example.invalid');
  out := out || ((case when r->>'reason' = 'No Proview QR Menu account for this email.' then 'PASS' else 'FAIL' end) || ' stranger: ' || coalesce(r->>'reason', r::text));
  r := public.sso_entitled('zz016q-mgr@example.invalid');
  out := out || ((case when (r->>'ok')::boolean and (r->>'create')::boolean then 'PASS' else 'FAIL' end) || ' member with no login yet: let in, login made');
  r := public.sso_entitled((select email from pq_masters limit 1));
  out := out || ((case when (r->>'ok')::boolean then 'PASS' else 'FAIL' end) || ' the master is let in');

  raise exception E'016 QR TEST RESULT (rolled back): %/% PASS\n%',
    (select count(*) from unnest(out) x where x like 'PASS%'), array_length(out, 1), array_to_string(out, E'\n');
end $t$;
