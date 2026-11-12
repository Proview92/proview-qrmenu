-- Local test of supabase/migrations/013_business_wording.sql (run 12 Nov 2026 on a local PostgreSQL 16, not on live): minimal
-- pq_orgs / pq_sites / pq_state stubs, the functions as in 010 / 012, every case run before and after 013, compared; rolled back.
-- Run from supabase/tests/ after extracting pq_sites_guard + its trigger and pq_add_site from ../migrations/012_locations_link.sql
-- (q012g.sql, q012a.sql) and pq_save_state from ../migrations/010_no_portal_message.sql (q010s.sql).
\set ON_ERROR_STOP 1
begin;
do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon; end if; if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if; end $$;
create table public.pq_orgs (id uuid primary key, name text, created_at timestamptz default now());
create table public.pq_sites (id uuid primary key, org_id uuid, name text, archived boolean default false, last_seen timestamptz, active_stub boolean default true);
create table public.pq_state (site_id uuid primary key, org_id uuid, data jsonb, updated_at timestamptz, updated_by text);
grant all on public.pq_orgs, public.pq_sites, public.pq_state to authenticated;
create function public.pq_can_site(uuid) returns boolean language sql as $$ select $1 <> '00000000-0000-4000-8000-0000000000ff' $$;
create function public.pq_site_active(uuid) returns boolean language sql as $$ select coalesce((select active_stub from public.pq_sites where id=$1), false) $$;
create function public.pq_is_master() returns boolean language sql as $$ select false $$;
create function public.pq_email() returns text language sql as $$ select 'x@x.test' $$;
\i q012g.sql
\i q012a.sql
\i q010s.sql
create temp table res (step text, which text, outcome text);
grant all on res to authenticated;
create or replace function pg_temp.cases(v text) returns void language plpgsql as $f$
declare e text; O constant uuid := '00000000-0000-4000-8000-000000000001'; N constant uuid := '00000000-0000-4000-8000-000000000002';
  S1 constant uuid := '00000000-0000-4000-8000-0000000000a1'; S2 constant uuid := '00000000-0000-4000-8000-0000000000a2'; S3 constant uuid := '00000000-0000-4000-8000-0000000000a3';
begin
  delete from public.pq_state; delete from public.pq_sites; delete from public.pq_orgs;
  insert into public.pq_orgs values (O,'Old', now() - interval '1 day');
  set local session_replication_role = replica; insert into public.pq_sites(id,org_id,name) values (S1,O,'One'),(S3,O,'Ended'); update public.pq_sites set active_stub=false where id=S3; set local session_replication_role = origin;
  execute 'set local role authenticated';
  begin insert into public.pq_sites(id,org_id,name) values (S2,O,'Two'); insert into res values ('add',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('add',v,sqlstate||' '||e); end;
  begin update public.pq_sites set org_id=N where id=S1; insert into res values ('move',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('move',v,sqlstate||' '||e); end;
  begin update public.pq_sites set archived=true where id=S1; insert into res values ('archive',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('archive',v,sqlstate||' '||e); end;
  begin update public.pq_sites set name='Renamed' where id=S1; insert into res values ('rename',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('rename',v,sqlstate||' '||e); end;
  execute 'reset role';
  begin perform public.pq_add_site(O,'X'); insert into res values ('pq_add_site',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('pq_add_site',v,sqlstate||' '||e); end;
  begin perform public.pq_save_state(S1,'{"a":1}'); insert into res values ('save, licensed',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('save, licensed',v,sqlstate||' '||e); end;
  begin perform public.pq_save_state(S3,'{"a":1}'); insert into res values ('save, licence ended',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('save, licence ended',v,sqlstate||' '||e); end;
  begin perform public.pq_save_state('00000000-0000-4000-8000-0000000000ff','{"a":1}'); insert into res values ('save, no access',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('save, no access',v,sqlstate||' '||e); end;
  insert into public.pq_orgs values (N,'New', now());
  execute 'set local role authenticated';
  begin insert into public.pq_sites(id,org_id,name) values ('00000000-0000-4000-8000-0000000000b1',N,'First'); insert into res values ('first site of new org',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('first site of new org',v,sqlstate||' '||e); end;
  execute 'reset role';
  perform set_config('pq.hub_move','1',true);
  begin update public.pq_sites set org_id=N where id=S1; insert into res values ('hub move',v,'allowed'); exception when others then get stacked diagnostics e = message_text; insert into res values ('hub move',v,sqlstate||' '||e); end;
  perform set_config('pq.hub_move','',true);
end $f$;
select pg_temp.cases('before');
\i ../migrations/013_business_wording.sql
select pg_temp.cases('013');
select a.step, a.outcome as "before (010/012)", b.outcome as "013",
  case when (a.outcome='allowed') = (b.outcome='allowed') and split_part(a.outcome,' ',1)=split_part(b.outcome,' ',1) then 'same' else 'DIFFERENT' end as behaviour
  from res a join res b on a.step=b.step and a.which='before' and b.which='013' order by a.step;
rollback;
