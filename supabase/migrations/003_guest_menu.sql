-- Proview QR Menu: public guest menu + guest inbox (9 Nov 2026).
-- Guests (not signed in) can read a live location's public menu and send orders, feedback, reviews, likes and
-- service requests. Those land in pq_inbox; the back office pulls them into the location's data (pq_inbox_take),
-- so guest traffic never overwrites what staff are editing.

create table if not exists public.pq_inbox(
  id bigserial primary key,
  site_id uuid not null references public.pq_sites(id) on delete cascade,
  org_id uuid not null references public.pq_orgs(id) on delete cascade,
  kind text not null check (kind in ('order','feedback','review','like','service','customer')),
  ref text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now());
create index if not exists pq_inbox_site_idx on public.pq_inbox(site_id, id);
alter table public.pq_inbox enable row level security;

-- Public, read-only view of one live location (null when it is archived, unlicensed, expired or paused).
create or replace function public.pq_public_menu(p_site uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when not pq_site_active(p_site) then null else (
    select jsonb_build_object(
      'site', jsonb_build_object('id', s.id, 'name', s.name),
      'org', jsonb_build_object('name', o.name),
      'venue', coalesce(st.data->'venue', '{}'::jsonb) - 'pincode',
      'menus', coalesce(jsonb_path_query_array(st.data->'menus', '$[*] ? (@.on == true)'), '[]'::jsonb),
      'modifiers', coalesce(st.data->'modifiers', '[]'::jsonb),
      'promotions', coalesce(jsonb_path_query_array(st.data->'promotions', '$[*] ? (@.on == true)'), '[]'::jsonb),
      'cfg', coalesce(st.data->'cfg', '{}'::jsonb),
      'forms', coalesce(jsonb_path_query_array(st.data->'forms', '$[*] ? (@.active == true)'), '[]'::jsonb),
      'tables', coalesce((select jsonb_agg(jsonb_build_object('id', t->'id', 'name', t->'name')) from jsonb_array_elements(coalesce(st.data->'tables','[]'::jsonb)) t), '[]'::jsonb),
      'reviews', coalesce((select jsonb_agg(jsonb_build_object('item', r->'item', 'rate', r->'rate', 'text', r->'text',
                    'customer', split_part(coalesce(r->>'customer',''), ' ', 1), 'date', r->'date'))
                  from jsonb_array_elements(coalesce(st.data->'reviews','[]'::jsonb)) r where r->>'status' = 'Live'), '[]'::jsonb),
      'likes', coalesce(st.data->'likes', '{}'::jsonb),
      'promoCodes', coalesce((select jsonb_agg(jsonb_build_object('code', p->'code', 'type', p->'type', 'kind', p->'kind', 'value', p->'value',
                    'mode', p->'mode', 'min', p->'min')) from jsonb_array_elements(coalesce(st.data->'promoCodes','[]'::jsonb)) p
                  where coalesce((p->>'active')::boolean, false) or p->>'status' = 'Live'), '[]'::jsonb),
      'updated_at', st.updated_at)
    from pq_sites s join pq_orgs o on o.id = s.org_id left join pq_state st on st.site_id = s.id
    where s.id = p_site) end $$;

-- A guest sends something. Returns a short reference the guest can use to follow an order.
create or replace function public.pq_guest_submit(p_site uuid, p_kind text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o uuid; r text; n int;
begin
  if not pq_site_active(p_site) then raise exception 'This menu is not available right now.'; end if;
  if p_kind not in ('order','feedback','review','like','service','customer') then raise exception 'Unknown request.'; end if;
  if p_payload is null or length(p_payload::text) > 20000 then raise exception 'Request too large.'; end if;
  select count(*) into n from pq_inbox where site_id = p_site and created_at > now() - interval '1 minute';
  if n >= 60 then raise exception 'Too many requests. Please try again in a minute.'; end if;
  select org_id into o from pq_sites where id = p_site;
  r := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  insert into pq_inbox(site_id, org_id, kind, ref, payload) values (p_site, o, p_kind, r, p_payload);
  return jsonb_build_object('ok', true, 'ref', r);
end $$;

-- Guest order tracking: status of an order by its reference (only status fields, nothing personal).
create or replace function public.pq_guest_order(p_site uuid, p_ref text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object('ref', p_ref, 'status', o->>'status', 'id', o->>'id', 'updated', o->>'updated')
       from pq_state st, jsonb_array_elements(coalesce(st.data->'orders','[]'::jsonb)) o
      where st.site_id = p_site and o->>'guestRef' = p_ref limit 1),
    (select jsonb_build_object('ref', p_ref, 'status', 'Sent', 'id', null) from pq_inbox where site_id = p_site and ref = p_ref and kind = 'order' limit 1)) $$;

-- Back office: read what guests sent (oldest first), then confirm once saved so nothing is lost on a failed save.
create or replace function public.pq_inbox_take(p_site uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not pq_can_site(p_site) then raise exception 'You don''t have access to this location.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'ref', ref, 'payload', payload, 'at', created_at) order by id)
    from (select * from pq_inbox where site_id = p_site order by id limit 200) x), '[]'::jsonb);
end $$;
create or replace function public.pq_inbox_ack(p_site uuid, p_ids bigint[])
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not pq_can_site(p_site) then raise exception 'You don''t have access to this location.'; end if;
  delete from pq_inbox where site_id = p_site and id = any(p_ids);
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function public.pq_public_menu(uuid), public.pq_guest_submit(uuid,text,jsonb), public.pq_guest_order(uuid,text), public.pq_inbox_take(uuid), public.pq_inbox_ack(uuid,bigint[]) from public;
grant execute on function public.pq_public_menu(uuid), public.pq_guest_submit(uuid,text,jsonb), public.pq_guest_order(uuid,text) to anon, authenticated;
grant execute on function public.pq_inbox_take(uuid), public.pq_inbox_ack(uuid,bigint[]) to authenticated;
revoke execute on function public.pq_inbox_take(uuid), public.pq_inbox_ack(uuid,bigint[]) from anon;
