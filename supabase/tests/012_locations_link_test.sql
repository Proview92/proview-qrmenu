-- Tests for supabase/migrations/012_locations_link.sql. Run as ONE query: the migration, then this file. It is all one
-- transaction that always fails at the end (the PASS/FAIL report is the error message), so nothing is kept:
--   { cat supabase/migrations/012_locations_link.sql; cat supabase/tests/012_locations_link_test.sql; }
do $T$
declare
  ok int := 0; bad text[] := '{}'; r jsonb; r2 jsonb; nid uuid; n int;
  tok constant text := 'll-test-token';
  A constant uuid := 'a1a1a1a1-0000-4000-8000-000000000001';
  B constant uuid := 'b1b1b1b1-0000-4000-8000-000000000001';
  a1 constant uuid := 'a1a1a1a1-0000-4000-8000-0000000000a1';
  a2 constant uuid := 'a1a1a1a1-0000-4000-8000-0000000000a2';
  b1 constant uuid := 'b1b1b1b1-0000-4000-8000-0000000000b1';
begin
  create or replace function pg_temp.as_(em text, org uuid default null) returns void language plpgsql as $f$
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated', 'email', em)::text, true);
    perform set_config('request.headers', case when org is null then '{}' else json_build_object('x-pq-org', org)::text end, true);
    execute 'set local role authenticated';
  end $f$;
  create or replace function pg_temp.svc() returns void language plpgsql as $f$
  begin
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true); perform set_config('request.headers', '{}', true);
  end $f$;
  create or replace function pg_temp.chk(cond boolean, name text, inout ok int, inout bad text[]) language plpgsql as $f$
  begin if coalesce(cond, false) then ok := ok + 1; else bad := bad || name; end if; end $f$;

  update hub_private.config set token_sha256 = encode(extensions.digest(tok, 'sha256'), 'hex') where id = 1;
  -- fixtures made "earlier" (not brand-new businesses of this transaction); the hub flag lets them in
  perform set_config('pq.hub_move', '1', true);
  insert into public.pq_orgs(id, name, contact_email, phone, created_at) values
    (A, 'LL Alpha', 'alpha@test.invalid', '0207', now() - interval '1 day'), (B, 'LL Beta', 'beta@test.invalid', '0208', now() - interval '1 day');
  insert into public.pq_sites(id, org_id, name, license_type, expires_at, created_at) values
    (a1, A, 'Alpha One', 'lifetime', null, now() - interval '3 days'),
    (a2, A, 'Alpha Two', 'm12', now() + interval '200 days', now() - interval '2 days'),
    (b1, B, 'Beta One', 'm6', now() + interval '100 days', now() - interval '1 day');
  insert into public.pq_state(site_id, org_id, data) values (a1, A, '{"menus":[1]}'), (a2, A, '{"menus":[2]}'), (b1, B, '{"menus":[3]}');
  insert into public.pq_inbox(site_id, org_id, kind, ref, payload) values (b1, B, 'order', 'x', '{}'), (a2, A, 'order', 'y', '{}');
  insert into public.pq_members(org_id, email, role, site_ids) values
    (A, 'll-owner@test.invalid', 'owner', '{}'),
    (A, 'll-mgr@test.invalid', 'manager', array[a1]),
    (A, 'll-staff@test.invalid', 'staff', array[a1, a2]),
    (B, 'll-owner@test.invalid', 'admin', '{}'),
    (B, 'll-ownerb@test.invalid', 'owner', '{}'),
    (B, 'll-staffb@test.invalid', 'staff', array[b1]),
    (B, 'll-mgr@test.invalid', 'staff', array[b1]);
  perform set_config('pq.hub_move', '', true);

  -- 1) nobody adds, archives or moves a location in the app
  perform pg_temp.as_('ll-owner@test.invalid');
  begin perform public.pq_add_site(A, 'New'); bad := bad || 'owner adds a location';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm like 'New locations are added by Proview%', 'owner add: message', ok, bad); end;
  begin perform public.pq_update_site(a2, null, true); bad := bad || 'owner archives a location';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm like 'Locations can''t be archived or deleted here%', 'owner archive: message ' || sqlerrm, ok, bad); end;
  begin perform public.pq_update_site(a2, 'Alpha Two renamed', null);
    select * into ok, bad from pg_temp.chk((select name from public.pq_sites where id = a2) = 'Alpha Two renamed', 'owner renames a location', ok, bad);
  exception when others then bad := bad || ('owner renames: ' || sqlerrm); end;
  begin perform public.pq_save_state(a1, '{"menus":[1,1]}'); ok := ok + 1;
  exception when others then bad := bad || ('owner saves state: ' || sqlerrm); end;
  perform set_config('pq.hub_move', '1', true);
  begin perform public.pq_add_site(A, 'New'); bad := bad || 'owner adds with the hub flag';
  exception when others then ok := ok + 1; end;
  perform set_config('pq.hub_move', '', true);
  perform pg_temp.svc();
  perform pg_temp.as_('altun@proviewtech.co.uk', A);
  begin perform public.pq_add_site(A, 'New'); bad := bad || 'master adds a location';
  exception when others then ok := ok + 1; end;
  begin perform public.pq_update_site(a2, null, true); bad := bad || 'master archives a location';
  exception when others then ok := ok + 1; end;
  perform pg_temp.svc();
  -- self sign-up and the portal's New location still make one business with one location
  perform pg_temp.as_('ll-new@test.invalid');
  begin perform public.pq_self_trial('LL Self', null);
    select * into ok, bad from pg_temp.chk((select count(*) from public.pq_sites s join public.pq_orgs o on o.id = s.org_id where o.name = 'LL Self') = 1, 'self sign-up: one location', ok, bad);
  exception when others then bad := bad || ('self sign-up: ' || sqlerrm); end;
  perform pg_temp.svc();
  begin
    r := public.hub_call(tok, 'add_business', '{"business":"LL Portal","name":"Pat Owner","email":"ll-portal@test.invalid","password":"secret123"}');
    select * into ok, bad from pg_temp.chk((select count(*) from public.pq_sites where org_id = (r->>'account_id')::uuid) = 1, 'portal New location: one location', ok, bad);
  exception when others then bad := bad || ('add_business: ' || sqlerrm); end;

  -- 2) link
  begin perform public.hub_call('wrong', 'link', jsonb_build_object('into', A, 'from', B)); bad := bad || 'wrong token';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm = 'not authorised', 'wrong token: message', ok, bad); end;
  begin perform public.hub_call(tok, 'link', jsonb_build_object('into', A, 'from', A)); bad := bad || 'link to itself';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm = 'An account can''t be linked to itself.', 'itself: message', ok, bad); end;
  begin perform public.hub_call(tok, 'link', jsonb_build_object('into', A, 'from', 'nope')); bad := bad || 'link missing';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm = 'Account not found: nope', 'missing: message', ok, bad); end;
  perform pg_temp.as_('ll-owner@test.invalid');
  begin perform public.hub_call(tok, 'link', jsonb_build_object('into', A, 'from', B)); bad := bad || 'authenticated may call hub_call';
  exception when others then ok := ok + 1; end;
  perform pg_temp.svc();

  execute 'set local role anon';
  r := public.hub_call(tok, 'link', jsonb_build_object('into', A, 'from', B));
  execute 'reset role';
  select * into ok, bad from pg_temp.chk(r->>'ok' = 'true' and r->>'account' = A::text and r->>'from' = B::text and r->'moved_sites' = jsonb_build_array(b1::text)
    and r->>'already' = 'false' and r->'renamed_units' = '[]', 'link result ' || r::text, ok, bad);
  select * into ok, bad from pg_temp.chk(not exists (select 1 from public.pq_orgs where id = B), 'B deleted', ok, bad);
  select * into ok, bad from pg_temp.chk((select org_id from public.pq_sites where id = b1) = A and (select org_id from public.pq_state where site_id = b1) = A
    and not exists (select 1 from public.pq_inbox where org_id = B), 'B location, state and inbox moved', ok, bad);
  select * into ok, bad from pg_temp.chk((select license_type from public.pq_sites where id = b1) = 'm6', 'licence unchanged', ok, bad);
  select * into ok, bad from pg_temp.chk((select role from public.pq_members where org_id = A and email = 'll-owner@test.invalid') = 'owner'
    and (select role from public.pq_members where org_id = A and email = 'll-ownerb@test.invalid') = 'owner', 'owners of both own A', ok, bad);
  select * into ok, bad from pg_temp.chk((select site_ids from public.pq_members where org_id = A and email = 'll-mgr@test.invalid') = array[a1, a2, b1], 'manager (higher role) gets every location', ok, bad);
  select * into ok, bad from pg_temp.chk((select site_ids from public.pq_members where org_id = A and email = 'll-staffb@test.invalid') = array[b1]
    and (select site_ids from public.pq_members where org_id = A and email = 'll-staff@test.invalid') = array[a1, a2], 'staff keep exactly their locations', ok, bad);
  select * into ok, bad from pg_temp.chk((select contact_email from public.pq_orgs where id = A) = 'alpha@test.invalid', 'A keeps its contact email', ok, bad);
  perform pg_temp.as_('ll-ownerb@test.invalid');
  r2 := public.pq_whoami();
  select count(*) into n from jsonb_array_elements(public.pq_sites_of(A));
  perform pg_temp.svc();
  select * into ok, bad from pg_temp.chk(jsonb_array_length(r2->'memberships') = 1 and n = 3, 'B owner sees the 3 linked locations', ok, bad);
  r2 := public.hub_call(tok, 'link', jsonb_build_object('into', A, 'from', B));
  select * into ok, bad from pg_temp.chk(r2->>'already' = 'true' and r2->'moved_sites' = jsonb_build_array(b1::text), 'link again: already', ok, bad);
  begin perform public.hub_call(tok, 'link', jsonb_build_object('into', gen_random_uuid(), 'from', B)); bad := bad || 'link B elsewhere';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm like B::text || ' was already linked into ' || A::text || ', not %', 'elsewhere: message', ok, bad); end;
  r2 := public.hub_call(tok, 'list', '{}');
  select * into ok, bad from pg_temp.chk((select count(*) from jsonb_array_elements(r2->'units') u where u->>'account_id' = A::text) = 3
    and not exists (select 1 from jsonb_array_elements(r2->'accounts') x where x->>'id' = B::text), 'list shows the merged business', ok, bad);

  -- 3) unlink Alpha Two
  r := public.hub_call(tok, 'unlink', jsonb_build_object('account', A, 'site', a2));
  nid := (r->>'account')::uuid;
  select * into ok, bad from pg_temp.chk(r->>'ok' = 'true' and nid <> A and r->>'site' = a2::text and r->>'from' = A::text and r->>'already' = 'false', 'unlink result ' || r::text, ok, bad);
  select * into ok, bad from pg_temp.chk((select name from public.pq_orgs where id = nid) = 'Alpha Two renamed'
    and (select contact_email from public.pq_orgs where id = nid) = 'alpha@test.invalid', 'new business named after the location, contact copied', ok, bad);
  select * into ok, bad from pg_temp.chk((select org_id from public.pq_sites where id = a2) = nid and (select org_id from public.pq_state where site_id = a2) = nid
    and (select org_id from public.pq_inbox where site_id = a2) = nid and (select license_type from public.pq_sites where id = a2) = 'm12', 'location, data, inbox, licence moved', ok, bad);
  select * into ok, bad from pg_temp.chk((select count(*) from public.pq_members where org_id = nid and role = 'owner') = 2
    and (select site_ids from public.pq_members where org_id = nid and email = 'll-mgr@test.invalid') = array[a2]
    and (select site_ids from public.pq_members where org_id = nid and email = 'll-staff@test.invalid') = array[a2]
    and not exists (select 1 from public.pq_members where org_id = nid and email = 'll-staffb@test.invalid'), 'members with access copied, reduced to it', ok, bad);
  select * into ok, bad from pg_temp.chk((select site_ids from public.pq_members where org_id = A and email = 'll-staff@test.invalid') = array[a1]
    and (select count(*) from public.pq_members where org_id = A) = 5, 'A keeps its members, without that location', ok, bad);
  r2 := public.hub_call(tok, 'unlink', jsonb_build_object('account', A, 'site', 'loc/' || a2::text));
  select * into ok, bad from pg_temp.chk(r2->>'account' = nid::text and r2->>'already' = 'true', 'unlink again (loc/ prefix): already', ok, bad);
  begin perform public.hub_call(tok, 'unlink', jsonb_build_object('account', nid, 'site', a2)); bad := bad || 'unlink only location';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm like '%only that one location%', 'only location: message', ok, bad); end;
  begin perform public.hub_call(tok, 'unlink', jsonb_build_object('account', A, 'site', gen_random_uuid())); bad := bad || 'unlink missing location';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm like 'Location not found: %', 'missing location: message', ok, bad); end;
  begin perform public.hub_call(tok, 'unlink', jsonb_build_object('account', nid, 'site', a1)); bad := bad || 'unlink a location of another account';
  exception when others then select * into ok, bad from pg_temp.chk(sqlerrm = 'That location is not in account ' || nid::text || '.', 'not in account: message', ok, bad); end;

  raise exception 'RESULT % passed, % failed: %', ok, coalesce(array_length(bad, 1), 0), array_to_string(bad, ' | ');
end $T$;
