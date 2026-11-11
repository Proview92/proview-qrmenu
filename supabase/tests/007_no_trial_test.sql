-- Tests for migrations/007_no_trial.sql. One DO block that always fails at the end (results in the error message), so
-- nothing is kept. Before 007 is applied, run it with the migration executed first
-- (replace the --MIGRATION-- line with: execute $mig$ <contents of 007_no_trial.sql> $mig$;).
do $T$
declare
  out text := '';
  u_master uuid := (select id from auth.users where lower(email) = 'altun@proviewtech.co.uk' limit 1);
  u_self uuid := gen_random_uuid(); u_again uuid := gen_random_uuid(); u_other uuid := gen_random_uuid();
  before_s text; after_s text; r jsonb; w jsonb; o uuid; s uuid; e text; ok boolean; x record;
begin
  select md5(coalesce(string_agg(id::text || coalesce(license_type, '-') || coalesce(starts_at::text, '-') || coalesce(expires_at::text, '-'), ',' order by id), ''))
    into before_s from public.pq_sites;

  --MIGRATION--

  insert into auth.users (id, email, aud, role) values
    (u_self, 'pq007-self@test.invalid', 'authenticated', 'authenticated'),
    (u_again, 'pq007-again@test.invalid', 'authenticated', 'authenticated'),
    (u_other, 'pq007-other@test.invalid', 'authenticated', 'authenticated');
  insert into public.pq_trials_used (email) values ('pq007-again@test.invalid');   -- already had a trial

  -- ---------- 1. the master's + Add business
  perform set_config('request.jwt.claims', json_build_object('sub', u_master, 'role', 'authenticated', 'email', 'altun@proviewtech.co.uk')::text, true);
  perform set_config('request.jwt.claim.sub', u_master::text, true);
  execute 'set local role authenticated';
  r := public.pq_add_business('PQ007 Master Biz', 'Owner Person', 'pq007-owner@test.invalid', null, 'secret123');
  o := public.pq_create_org('PQ007 Old Create', 'pq007-old@test.invalid', null, null);
  execute 'reset role';
  select * into x from public.pq_sites where id = (r->>'site_id')::uuid;
  out := out || format(E'\n%s master + Add business: location has no licence (%s), pq_site_active %s',
    case when x.license_type is null and x.expires_at is null and not public.pq_site_active(x.id) then 'PASS' else 'FAIL' end,
    coalesce(x.license_type, 'none'), public.pq_site_active(x.id));
  select * into x from public.pq_sites where org_id = o;
  out := out || format(E'\n%s older pq_create_org: location has no licence (%s)', case when x.license_type is null and x.expires_at is null then 'PASS' else 'FAIL' end, coalesce(x.license_type, 'none'));
  -- the new owner signs in and sees the business (to reach the buy screen)
  perform set_config('request.jwt.claims', json_build_object('sub', r->>'user_id', 'role', 'authenticated', 'email', 'pq007-owner@test.invalid')::text, true);
  perform set_config('request.jwt.claim.sub', r->>'user_id', true);
  execute 'set local role authenticated';
  w := public.pq_whoami();
  r := r || jsonb_build_object('sites', public.pq_sites_of((r->>'org_id')::uuid));
  execute 'reset role';
  out := out || format(E'\n%s new owner signs in: owner of the business, its location shows no licence, not active (%s)',
    case when w->'memberships'->0->>'role' = 'owner' and r->'sites'->0->>'license_type' is null and not (r->'sites'->0->>'active')::boolean then 'PASS' else 'FAIL' end,
    r->'sites');

  -- ---------- 2. self-signup ("Set up your business")
  perform set_config('request.jwt.claims', json_build_object('sub', u_self, 'role', 'authenticated', 'email', 'pq007-self@test.invalid')::text, true);
  perform set_config('request.jwt.claim.sub', u_self::text, true);
  execute 'set local role authenticated';
  o := public.pq_self_trial('PQ007 Self Biz', null, '0700');
  w := public.pq_whoami();
  execute 'reset role';
  select * into x from public.pq_sites where org_id = o;
  out := out || format(E'\n%s self-signup: business + location with no licence (%s), owner (%s)',
    case when x.license_type is null and x.expires_at is null and w->'memberships'->0->>'role' = 'owner' then 'PASS' else 'FAIL' end,
    coalesce(x.license_type, 'none'), w->'memberships'->0->>'role');
  -- an email that already had a trial: may still set up a business (no licence); whoami trial_used false
  perform set_config('request.jwt.claims', json_build_object('sub', u_again, 'role', 'authenticated', 'email', 'pq007-again@test.invalid')::text, true);
  perform set_config('request.jwt.claim.sub', u_again::text, true);
  execute 'set local role authenticated';
  w := public.pq_whoami();
  ok := true; o := null; e := null;
  begin o := public.pq_self_trial('PQ007 Again Biz', null, null); exception when others then ok := false; e := sqlerrm; end;
  execute 'reset role';
  out := out || format(E'\n%s self-signup with an email that had a trial: whoami trial_used %s, allowed, no licence %s',
    case when ok and (w->>'trial_used')::boolean = false and (select license_type from public.pq_sites where org_id = o) is null then 'PASS' else 'FAIL' end,
    w->>'trial_used', coalesce(e, ''));

  -- ---------- 3. new location (+ Add location, as the owner)
  perform set_config('request.jwt.claims', json_build_object('sub', u_self, 'role', 'authenticated', 'email', 'pq007-self@test.invalid')::text, true);
  perform set_config('request.jwt.claim.sub', u_self::text, true);
  execute 'set local role authenticated';
  s := public.pq_add_site((select org_id from public.pq_members where email = 'pq007-self@test.invalid'), 'PQ007 Second');
  execute 'reset role';
  select * into x from public.pq_sites where id = s;
  out := out || format(E'\n%s new location (pq_add_site): no licence (%s)', case when x.license_type is null and x.expires_at is null then 'PASS' else 'FAIL' end, coalesce(x.license_type, 'none'));

  -- ---------- 4. any other insert with a trial licence is stored with no licence; paid ones are kept
  insert into public.pq_sites (org_id, name, license_type, starts_at, expires_at) values (x.org_id, 'PQ007 Direct', 'trial3', now(), now() + interval '3 days') returning * into x;
  out := out || format(E'\n%s direct insert with ''trial3'': stored with no licence (%s)', case when x.license_type is null and x.expires_at is null then 'PASS' else 'FAIL' end, coalesce(x.license_type, 'none'));
  insert into public.pq_sites (org_id, name, license_type, starts_at, expires_at) values (x.org_id, 'PQ007 Paid', 'm12', now(), now() + interval '12 months') returning * into x;
  out := out || format(E'\n%s direct insert with a paid licence: kept (%s)', case when x.license_type = 'm12' then 'PASS' else 'FAIL' end, coalesce(x.license_type, 'none'));
  -- the master can still set a trial by hand (Trial… button)
  perform set_config('request.jwt.claims', json_build_object('sub', u_master, 'role', 'authenticated', 'email', 'altun@proviewtech.co.uk')::text, true);
  perform set_config('request.jwt.claim.sub', u_master::text, true);
  execute 'set local role authenticated';
  w := public.pq_set_trial(s, 3, null, false);
  execute 'reset role';
  out := out || format(E'\n%s master can still set a trial by hand (pq_set_trial: %s)', case when w->>'license_type' = 'trial3' then 'PASS' else 'FAIL' end, w->>'license_type');

  -- ---------- 5. a non-master is still refused
  perform set_config('request.jwt.claims', json_build_object('sub', u_other, 'role', 'authenticated', 'email', 'pq007-other@test.invalid')::text, true);
  perform set_config('request.jwt.claim.sub', u_other::text, true);
  execute 'set local role authenticated';
  ok := true; e := null;
  begin perform public.pq_add_business('PQ007 Sneaky', 'X Person', 'pq007-x@test.invalid', null, 'secret123'); exception when others then ok := false; e := sqlerrm; end;
  out := out || format(E'\n%s non-master pq_add_business refused (%s)', case when not ok then 'PASS' else 'FAIL' end, coalesce(e, 'allowed'));
  ok := true; e := null;
  begin perform public.pq_create_org('PQ007 Sneaky 2', null, null, null); exception when others then ok := false; e := sqlerrm; end;
  out := out || format(E'\n%s non-master pq_create_org refused (%s)', case when not ok then 'PASS' else 'FAIL' end, coalesce(e, 'allowed'));
  ok := true; e := null;
  begin perform public.pq_set_trial(s, 30, null, false); exception when others then ok := false; e := sqlerrm; end;
  out := out || format(E'\n%s non-master pq_set_trial refused (%s)', case when not ok then 'PASS' else 'FAIL' end, coalesce(e, 'allowed'));
  ok := true; e := null;
  begin perform public.pq_add_site((select org_id from public.pq_members where email = 'pq007-self@test.invalid'), 'Sneaky'); exception when others then ok := false; e := sqlerrm; end;
  out := out || format(E'\n%s non-member pq_add_site refused (%s)', case when not ok then 'PASS' else 'FAIL' end, coalesce(e, 'allowed'));
  execute 'reset role';

  -- ---------- 6. existing locations (incl. ones on a trial today) unchanged
  select md5(coalesce(string_agg(id::text || coalesce(license_type, '-') || coalesce(starts_at::text, '-') || coalesce(expires_at::text, '-'), ',' order by id), ''))
    into after_s from public.pq_sites where org_id not in (select id from public.pq_orgs where name like 'PQ007 %');
  out := out || format(E'\n%s existing locations unchanged (%s on a trial today keep their expiry)',
    case when before_s = after_s then 'PASS' else 'FAIL' end,
    (select count(*) from public.pq_sites where license_type like 'trial%' and expires_at > now() and org_id not in (select id from public.pq_orgs where name like 'PQ007 %')));

  raise exception 'ROLLED BACK. Results:%', out;
end $T$;
