-- Tests for migrations/006_add_business.sql. Run together with the migration as ONE query: everything is one
-- transaction that always fails at the end (results in the error message), so nothing is kept.
do $T$
declare
  out text := '';
  u_master uuid := (select id from auth.users where lower(email) = 'altun@proviewtech.co.uk' limit 1);
  u_other uuid := gen_random_uuid(); u_old uuid := gen_random_uuid();
  r jsonb; e text; pw_before text; pw_after text; n int; nb int; w jsonb; o uuid;
begin
  create or replace function pg_temp.as_(uid uuid, em text) returns void language plpgsql as $f$
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'email', em)::text, true);
    perform set_config('request.jwt.claim.sub', uid::text, true);
    execute 'set local role authenticated';
  end $f$;
  create or replace function pg_temp.svc() returns void language plpgsql as $f$
  begin
    execute 'reset role';
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
  end $f$;

  insert into auth.users (id, email, encrypted_password, aud, role, email_confirmed_at) values
    (u_other, 'pq006-other@test.invalid', extensions.crypt('otherpass', extensions.gen_salt('bf', 4)), 'authenticated', 'authenticated', now()),
    (u_old,   'pq006-old@test.invalid',   extensions.crypt('oldpass1',  extensions.gen_salt('bf', 4)), 'authenticated', 'authenticated', now());
  select encrypted_password into pw_before from auth.users where id = u_old;

  -- 1. master, new email
  perform pg_temp.as_(coalesce(u_master, gen_random_uuid()), 'altun@proviewtech.co.uk');
  r := public.pq_add_business('PQ006 Test Diner', 'Sam Taylor', ' PQ006-New@Test.Invalid ', '07700 900123', 'secret12');
  perform pg_temp.svc();
  o := (r->>'org_id')::uuid;
  out := out || format(E'\n%s master adds (new email): existing=%s', case when not (r->>'existing')::boolean then 'PASS' else 'FAIL' end, r->>'existing');
  select count(*) into n from pq_orgs where id = o and name = 'PQ006 Test Diner' and not self_signup and contact_email = 'pq006-new@test.invalid' and phone = '07700 900123';
  out := out || format(E'\n%s business row (contact email, mobile as phone) (%s)', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from pq_sites where org_id = o and name = 'PQ006 Test Diner' and license_type = 'trial3' and expires_at > now() + interval '71 hours' and id = (r->>'site_id')::uuid;
  out := out || format(E'\n%s one same-name location on the usual trial3 (%s)', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from auth.users u where u.id = (r->>'user_id')::uuid and u.email = 'pq006-new@test.invalid'
     and u.email_confirmed_at is not null and u.encrypted_password = extensions.crypt('secret12', u.encrypted_password)
     and u.raw_user_meta_data->>'full_name' = 'Sam Taylor' and u.raw_user_meta_data->>'mobile' = '07700 900123'
     and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email');
  out := out || format(E'\n%s login ready: confirmed, password set, name + mobile, email identity (%s)', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from pq_members where org_id = o and email = 'pq006-new@test.invalid' and role = 'owner' and name = 'Sam Taylor';
  out := out || format(E'\n%s member: owner with name (%s)', case when n = 1 then 'PASS' else 'FAIL' end, n);
  perform pg_temp.as_((r->>'user_id')::uuid, 'pq006-new@test.invalid');
  w := public.pq_whoami();
  select count(*) into n from jsonb_array_elements(public.pq_sites_of(o)) x where (x->>'active')::boolean;
  perform pg_temp.svc();
  out := out || format(E'\n%s new owner whoami: not master, one business as owner, its location active (%s, %s active)',
    case when not (w->>'master')::boolean and jsonb_array_length(w->'memberships') = 1 and w->'memberships'->0->>'role' = 'owner' and (w->'memberships'->0->>'org_id')::uuid = o and n = 1 then 'PASS' else 'FAIL' end, w->'memberships', n);

  -- 2. non-master refused
  select count(*) into nb from pq_orgs;
  perform pg_temp.as_(u_other, 'pq006-other@test.invalid');
  begin r := public.pq_add_business('PQ006 Sneaky', 'Eve Other', 'pq006-eve@test.invalid', null, 'secret12'); e := 'no error';
  exception when others then e := sqlerrm; end;
  perform pg_temp.svc();
  select count(*) into n from pq_orgs;
  out := out || format(E'\n%s non-master refused (%s), businesses %s -> %s', case when e = 'Only Proview can add businesses.' and n = nb then 'PASS' else 'FAIL' end, e, nb, n);
  begin
    execute 'set local role anon';
    perform public.pq_add_business('PQ006 Anon', 'An On', 'pq006-anon@test.invalid', null, 'secret12'); e := 'no error';
  exception when others then e := sqlerrm; end;
  perform pg_temp.svc();
  out := out || format(E'\n%s anon refused (%s)', case when e like 'permission denied%' then 'PASS' else 'FAIL' end, e);

  -- 3. existing login keeps its password
  perform pg_temp.as_(coalesce(u_master, gen_random_uuid()), 'altun@proviewtech.co.uk');
  r := public.pq_add_business('PQ006 Old Hands Ltd', 'Old Hand', 'PQ006-old@test.invalid', null, 'NEWpass99');
  perform pg_temp.svc();
  select encrypted_password into pw_after from auth.users where id = u_old;
  out := out || format(E'\n%s existing login: existing=%s, same user=%s, password unchanged=%s',
    case when (r->>'existing')::boolean and (r->>'user_id')::uuid = u_old and pw_after = pw_before then 'PASS' else 'FAIL' end,
    r->>'existing', (r->>'user_id')::uuid = u_old, pw_after = pw_before);
  select count(*) into n from pq_members where org_id = (r->>'org_id')::uuid and email = 'pq006-old@test.invalid' and role = 'owner';
  out := out || format(E'\n%s existing login made owner (%s)', case when n = 1 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from auth.users where lower(email) = 'pq006-old@test.invalid';
  out := out || format(E'\n%s no second login made (%s)', case when n = 1 then 'PASS' else 'FAIL' end, n);

  -- 4. bad input refused, nothing left behind
  select count(*) into nb from pq_orgs;
  perform pg_temp.as_(coalesce(u_master, gen_random_uuid()), 'altun@proviewtech.co.uk');
  begin r := public.pq_add_business('PQ006 Bad Email', 'Bad Email', 'not-an-email', null, 'secret12'); e := 'no error';
  exception when others then e := sqlerrm; end;
  out := out || format(E'\n%s bad email refused (%s)', case when e = 'Enter a valid email address.' then 'PASS' else 'FAIL' end, e);
  begin r := public.pq_add_business('PQ006 Short Pass', 'Short Pass', 'pq006-short@test.invalid', null, '12345'); e := 'no error';
  exception when others then e := sqlerrm; end;
  out := out || format(E'\n%s short password refused (%s)', case when e = 'The password needs at least 6 characters.' then 'PASS' else 'FAIL' end, e);
  begin r := public.pq_add_business('X', 'Some One', 'pq006-x@test.invalid', null, 'secret12'); e := 'no error';
  exception when others then e := sqlerrm; end;
  out := out || format(E'\n%s 1-letter business refused (%s)', case when e = 'Enter the business name.' then 'PASS' else 'FAIL' end, e);
  begin r := public.pq_add_business('PQ006 No Name', 'S', 'pq006-x@test.invalid', null, 'secret12'); e := 'no error';
  exception when others then e := sqlerrm; end;
  out := out || format(E'\n%s 1-letter owner name refused (%s)', case when e = 'Enter the owner''s name.' then 'PASS' else 'FAIL' end, e);
  perform pg_temp.svc();
  select count(*) into n from pq_orgs;
  out := out || format(E'\n%s no business left behind after refusals (%s -> %s)', case when n = nb then 'PASS' else 'FAIL' end, nb, n);
  select count(*) into n from pq_sites where name like 'PQ006 Short%' or name like 'PQ006 Bad%';
  out := out || format(E'\n%s no location left behind after refusals (%s)', case when n = 0 then 'PASS' else 'FAIL' end, n);
  select count(*) into n from auth.users where email in ('pq006-short@test.invalid', 'pq006-x@test.invalid');
  out := out || format(E'\n%s no login left behind after refusals (%s)', case when n = 0 then 'PASS' else 'FAIL' end, n);

  raise exception 'TEST RESULTS (rolled back):%', out;
end $T$;
