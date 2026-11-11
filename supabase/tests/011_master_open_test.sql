-- Tests for supabase/migrations/011_master_open.sql. Run as ONE query: the setup block, then the migration, then the test
-- block. It is all one transaction that always fails at the end (the PASS/FAIL report is the error message), so nothing
-- is kept. Build it with:
--   { sed -n '/^-- SETUP/,/^-- END SETUP/p' supabase/tests/011_master_open_test.sql; cat supabase/migrations/011_master_open.sql; sed -n '/^-- TESTS/,$p' supabase/tests/011_master_open_test.sql; }

-- SETUP (on the functions as they are BEFORE 011): test businesses and logins, then what everyone but the master sees
do $S$
begin
  create or replace function pg_temp.as_(em text, org text default null) returns void language plpgsql as $f$
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated', 'email', em)::text, true);
    perform set_config('request.headers', case when org is null then '{}' else json_build_object('x-pq-org', org)::text end, true);
    execute 'set local role authenticated';
  end $f$;
  create or replace function pg_temp.svc() returns void language plpgsql as $f$
  begin execute 'reset role'; perform set_config('request.jwt.claims', '', true); perform set_config('request.headers', '{}', true); end $f$;
  -- what one login sees: whoami, the business list, each test business's locations, and every row id it can read
  create or replace function pg_temp.sees(em text, org text default null) returns jsonb language plpgsql as $f$
  declare out jsonb;
  begin
    perform pg_temp.as_(em, org);
    select jsonb_build_object(
      'who', public.pq_whoami(), 'list', public.pq_orgs_list(),
      'sites_of_t1', public.pq_sites_of('11111111-0000-4000-8000-000000000001'), 'sites_of_t2', public.pq_sites_of('11111111-0000-4000-8000-000000000002'),
      'orgs', (select coalesce(jsonb_agg(id order by id), '[]') from public.pq_orgs),
      'sites', (select coalesce(jsonb_agg(id order by id), '[]') from public.pq_sites),
      'state', (select coalesce(jsonb_agg(site_id order by site_id), '[]') from public.pq_state),
      'members', (select coalesce(jsonb_agg(org_id::text || '/' || email order by org_id, email), '[]') from public.pq_members),
      'upload_t1', public.pq_can_upload('22222222-0000-4000-8000-0000000000a1/x.png')) into out;
    perform pg_temp.svc();
    return out;
  end $f$;
  insert into public.pq_orgs (id, name) values ('11111111-0000-4000-8000-000000000001', 'MO Test One'), ('11111111-0000-4000-8000-000000000002', 'MO Test Two');
  insert into public.pq_sites (id, org_id, name, license_type) values
    ('22222222-0000-4000-8000-0000000000a1', '11111111-0000-4000-8000-000000000001', 'T1 A', 'lifetime'),
    ('22222222-0000-4000-8000-0000000000a2', '11111111-0000-4000-8000-000000000001', 'T1 B', 'lifetime'),
    ('22222222-0000-4000-8000-0000000000b1', '11111111-0000-4000-8000-000000000002', 'T2', 'lifetime');
  insert into public.pq_state (site_id, org_id, data) values
    ('22222222-0000-4000-8000-0000000000a1', '11111111-0000-4000-8000-000000000001', '{"menus":[]}'),
    ('22222222-0000-4000-8000-0000000000b1', '11111111-0000-4000-8000-000000000002', '{"menus":[]}');
  insert into public.pq_members (org_id, email, role, site_ids) values
    ('11111111-0000-4000-8000-000000000001', 'mo-owner@test.invalid', 'owner', '{}'),
    ('11111111-0000-4000-8000-000000000001', 'mo-mgr@test.invalid', 'manager', '{22222222-0000-4000-8000-0000000000a1}'),
    ('11111111-0000-4000-8000-000000000001', 'mo-staff@test.invalid', 'staff', '{22222222-0000-4000-8000-0000000000a2}'),
    ('11111111-0000-4000-8000-000000000002', 'mo-owner2@test.invalid', 'admin', '{}');
  -- everyone but the master (fixtures and every real login), with no header and with either business's header
  create temp table t_before(em text, hdr text, seen jsonb);
  insert into t_before(em, hdr)
    select e, h from (select distinct email e from public.pq_members union select 'nobody@test.invalid') x
      cross join (values (null::text), ('11111111-0000-4000-8000-000000000001'), ('11111111-0000-4000-8000-000000000002')) h(h)
     where e not in (select email from public.pq_masters);
  update t_before set seen = pg_temp.sees(em, hdr);
  create temp table t_master(k text, v jsonb);
  insert into t_master select 'before', pg_temp.sees((select email from public.pq_masters order by email limit 1), null);
end $S$;
-- END SETUP

-- TESTS (after 011)
do $T$
declare rep text := ''; n int; bad int; me text := (select email from public.pq_masters order by email limit 1);
  b jsonb := (select v from t_master where k = 'before'); none jsonb; t1 jsonb; t2 jsonb; junk jsonb; r jsonb; ok_ boolean; msg text;
  O1 constant text := '11111111-0000-4000-8000-000000000001'; O2 constant text := '11111111-0000-4000-8000-000000000002';
begin
  -- 1. everyone but the master: exactly as before
  select count(*) into bad from t_before t where pg_temp.sees(t.em, t.hdr) is distinct from t.seen;
  select count(*) into n from t_before;
  rep := rep || case when bad = 0 and n >= 15 then 'PASS' else 'FAIL' end || format(' non-master logins unchanged, with or without a header (%s checks, %s differ)', n, bad) || E'\n';
  rep := rep || case when (select seen->'sites' from t_before where em = 'mo-mgr@test.invalid' and hdr is null) = '["22222222-0000-4000-8000-0000000000a1"]'
                       and (select seen->'state' from t_before where em = 'mo-staff@test.invalid' and hdr = O2) = '[]' then 'PASS' else 'FAIL' end || ' manager / staff still see only their ticked locations' || E'\n';
  -- 2. the master
  none := pg_temp.sees(me, null); t1 := pg_temp.sees(me, O1); t2 := pg_temp.sees(me, O2); junk := pg_temp.sees(me, 'not-a-uuid');
  rep := rep || case when jsonb_array_length(b->'list') >= 2 and b->'sites' @> '["22222222-0000-4000-8000-0000000000b1"]' then 'PASS' else 'FAIL' end || format(' (before 011: master listed %s businesses and every location without a header)', jsonb_array_length(b->'list')) || E'\n';
  rep := rep || case when (none->'who'->>'master')::boolean and none->'list' = '[]' and none->'orgs' = '[]' and none->'sites' = '[]' and none->'state' = '[]' and none->'members' = '[]'
                       and none->'sites_of_t1' = '[]' and none->'sites_of_t2' = '[]' then 'PASS' else 'FAIL' end || ' master, no header: whoami says master; no business, location, data or member' || E'\n';
  rep := rep || case when jsonb_array_length(t1->'list') = 1 and t1->'list'->0->>'id' = O1 and t1->'orgs' = jsonb_build_array(O1)
                       and t1->'sites' = '["22222222-0000-4000-8000-0000000000a1","22222222-0000-4000-8000-0000000000a2"]' and t1->'state' = '["22222222-0000-4000-8000-0000000000a1"]'
                       and jsonb_array_length(t1->'sites_of_t1') = 2 and t1->'sites_of_t2' = '[]' then 'PASS' else 'FAIL' end || ' master + x-pq-org T1: T1''s business, locations and data only' || E'\n';
  rep := rep || case when (select count(*) from jsonb_array_elements_text(t1->'members') x where x not like O1 || '/%') = 0 and jsonb_array_length(t1->'members') = 3 then 'PASS' else 'FAIL' end || ' master + T1: T1''s users only' || E'\n';
  rep := rep || case when t2->'orgs' = jsonb_build_array(O2) and t2->'sites' = '["22222222-0000-4000-8000-0000000000b1"]' and t2->'sites_of_t1' = '[]' and jsonb_array_length(t2->'list') = 1 then 'PASS' else 'FAIL' end || ' master + T2: T2 only' || E'\n';
  rep := rep || case when junk->'list' = '[]' and junk->'sites' = '[]' then 'PASS' else 'FAIL' end || ' master + a header that isn''t a business id: nothing' || E'\n';
  rep := rep || case when (none->>'upload_t1')::boolean and (t2->>'upload_t1')::boolean then 'PASS' else 'FAIL' end || ' master media uploads unchanged (no header on Storage requests)' || E'\n';
  -- 3. writes through the RPCs follow the same rule
  perform pg_temp.as_(me, O1);
  begin perform public.pq_save_state('22222222-0000-4000-8000-0000000000a1', '{"menus":[1]}'); ok_ := true; exception when others then ok_ := false; end;
  begin perform public.pq_save_state('22222222-0000-4000-8000-0000000000b1', '{"menus":[1]}'); msg := 'saved'; exception when others then msg := sqlerrm; end;
  perform pg_temp.svc();
  rep := rep || case when ok_ and msg like 'You don''t have access%' then 'PASS' else 'FAIL' end || ' master inside T1 saves T1, is refused in T2' || E'\n';
  perform pg_temp.as_(me, null);
  begin perform public.pq_update_org(O1::uuid, 'Renamed', null); msg := 'updated'; exception when others then msg := sqlerrm; end;
  perform pg_temp.svc();
  rep := rep || case when msg = 'Not allowed.' then 'PASS' else 'FAIL' end || ' master with no business open can''t change a business (' || msg || ')' || E'\n';
  perform pg_temp.as_('mo-owner@test.invalid', null);
  begin perform public.pq_save_state('22222222-0000-4000-8000-0000000000a2', '{"menus":[2]}'); ok_ := true; exception when others then ok_ := false; end;
  perform pg_temp.svc();
  rep := rep || case when ok_ then 'PASS' else 'FAIL' end || ' owner still saves their location (no header)' || E'\n';
  -- 4. the licence portal: hub_call list and add_business (called with the anon key) still work
  update hub_private.config set token_sha256 = encode(extensions.digest('mo-test-token', 'sha256'), 'hex') where id = 1;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true); execute 'set local role anon';
  r := public.hub_call('mo-test-token', 'list', '{}');
  perform pg_temp.svc();
  rep := rep || case when (select count(*) from jsonb_array_elements(r->'accounts') a where a->>'id' in (O1, O2)) = 2
                       and (select count(*) from jsonb_array_elements(r->'units') u where u->>'id' like '22222222-%') = 3 then 'PASS' else 'FAIL' end || ' hub_call list still sees every business and location' || E'\n';
  perform set_config('request.jwt.claims', '{"role":"anon"}', true); execute 'set local role anon';
  begin r := public.hub_call('mo-test-token', 'add_business', '{"business":"MO New Co","name":"Nia New","email":"mo-new@test.invalid","password":"secret123"}'); msg := 'ok'; exception when others then msg := sqlerrm; end;
  perform pg_temp.svc();
  rep := rep || case when msg = 'ok' and r->>'org_id' is not null and exists (select 1 from public.pq_members where email = 'mo-new@test.invalid' and role = 'owner') then 'PASS' else 'FAIL' end || ' hub_call add_business (New customer) still works: ' || msg || E'\n';
  -- 5. grants
  rep := rep || case when has_function_privilege('authenticated', 'public.pq_master_in(uuid)', 'execute') and not has_function_privilege('anon', 'public.pq_master_in(uuid)', 'execute')
                       and has_function_privilege('authenticated', 'public.pq_orgs_list()', 'execute') and not has_function_privilege('anon', 'public.pq_orgs_list()', 'execute') then 'PASS' else 'FAIL' end || ' grants' || E'\n';
  raise exception E'\n%(rolled back: nothing kept)', rep;
end $T$;
