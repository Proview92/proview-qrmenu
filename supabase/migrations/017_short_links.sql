-- 017: short customer links – qrmenu.proviewcrm.co.uk/<slug>[/<table>]
-- Each location gets a permanent, unique slug made from the business name (plus the location name when the business has
-- more than one location). It never changes by itself when names change, so printed QR codes keep working.
-- Words used by the site's own files/folders are reserved.

alter table public.pq_sites add column if not exists slug text;

create or replace function public.pq_slugify(t text) returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(regexp_replace(lower(coalesce(t,'')), '&', 'and', 'g'), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.pq_make_slug(p_site uuid) returns text
language plpgsql security definer set search_path = public as $$
declare s record; base text; cand text; n int := 1; multi boolean;
begin
  select si.id, si.name, o.name as org, si.org_id into s from pq_sites si join pq_orgs o on o.id = si.org_id where si.id = p_site;
  if not found then return null; end if;
  select count(*) > 1 into multi from pq_sites where org_id = s.org_id and not coalesce(archived,false);
  base := pq_slugify(s.org);
  if multi and pq_slugify(s.name) <> base and pq_slugify(s.name) <> '' then base := base || '-' || pq_slugify(s.name); end if;
  if base = '' then base := 'menu'; end if;
  base := left(base, 48);
  cand := base;
  while cand in ('m','css','js','img','icons','index','index-html','404','404-html','cname','app-icon-svg','favicon-svg','api','admin','login','assets')
     or exists(select 1 from pq_sites where slug = cand and id <> p_site) loop
    n := n + 1; cand := base || '-' || n;
  end loop;
  return cand;
end $$;

-- backfill existing locations
-- (one row at a time, so each new slug is seen by the next)
do $$ declare r record; begin
  for r in select id from public.pq_sites where slug is null order by created_at loop
    update public.pq_sites set slug = public.pq_make_slug(r.id) where id = r.id;
  end loop;
end $$;
create unique index if not exists pq_sites_slug_key on public.pq_sites (slug);

-- new locations get one automatically
create or replace function public.pq_sites_slug_after() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.slug is null then update pq_sites set slug = pq_make_slug(new.id) where id = new.id; end if;
  return null;
end $$;
drop trigger if exists pq_sites_slug_after on public.pq_sites;
create trigger pq_sites_slug_after after insert on public.pq_sites for each row execute function public.pq_sites_slug_after();

-- guests: slug → location id (only for locations that exist and aren't archived; the menu itself still checks the licence)
create or replace function public.pq_site_by_slug(p_slug text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from pq_sites where slug = lower(trim(p_slug)) and not coalesce(archived,false) limit 1
$$;
revoke all on function public.pq_site_by_slug(text) from public;
grant execute on function public.pq_site_by_slug(text) to anon, authenticated;
revoke all on function public.pq_make_slug(uuid) from public, anon, authenticated;

-- the back office needs each location's slug to build links
create or replace function public.pq_sites_of(p_org uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'archived', s.archived, 'created_at', s.created_at,
      'license_type', s.license_type, 'starts_at', s.starts_at, 'expires_at', s.expires_at, 'notes', s.notes,
      'active', pq_site_active(s.id), 'slug', s.slug) order by lower(s.name)), '[]'::jsonb)
  from pq_sites s where s.org_id = p_org and pq_can_org(p_org) and (pq_admin_of(p_org) or pq_can_site(s.id))
$$;

-- 017b (applied separately): /bragsandbrams works as well as /brags-and-brams
create or replace function public.pq_site_by_slug(p_slug text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from pq_sites
   where not coalesce(archived,false)
     and (slug = lower(trim(p_slug)) or replace(slug,'-','') = replace(pq_slugify(p_slug),'-',''))
   order by (slug = lower(trim(p_slug))) desc limit 1
$$;
