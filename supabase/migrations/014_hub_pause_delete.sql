-- 014: the licence portal can pause / resume a business and delete it completely (owner, 12 Nov 2026).
--   hub_call 'suspend' { account_id, suspended } -> pq_orgs.suspended (a suspended business is locked: pq_site_active)
--   hub_call 'delete_account' { account_id }     -> deletes the business and everything in it (pq_orgs cascades:
--                                                   locations, menus/state, inbox, members). People's logins are kept.
create or replace function hub_private.pq_hub_admin(p_action text, p_args jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare o public.pq_orgs; s boolean; oid uuid;
begin
  begin oid := (p_args->>'account_id')::uuid; exception when others then raise exception 'Business not found.'; end;
  select * into o from public.pq_orgs where id = oid;
  if p_action = 'suspend' then
    if o.id is null then raise exception 'Business not found.'; end if;
    s := coalesce((p_args->>'suspended')::boolean, true);
    update public.pq_orgs set suspended = s where id = o.id;
    return jsonb_build_object('ok', true, 'account_id', o.id, 'suspended', s);
  end if;
  if o.id is null then return jsonb_build_object('ok', true, 'account_id', oid, 'deleted', true, 'already', true); end if;
  delete from public.pq_orgs where id = o.id;
  return jsonb_build_object('ok', true, 'account_id', o.id, 'deleted', true);
end $$;
revoke all on function hub_private.pq_hub_admin(text, jsonb) from public, anon, authenticated;

do $p$ declare d text; begin
  d := pg_get_functiondef('public.hub_call(text,text,jsonb)'::regprocedure);
  if position('pq_hub_admin' in d) = 0 then
    execute replace(d, '  if p_action in (''link'', ''unlink'') then',
      '  if p_action in (''suspend'', ''delete_account'') then
    if p_token is null or encode(extensions.digest(p_token, ''sha256''), ''hex'') is distinct from (select token_sha256 from hub_private.config where id = 1) then
      raise exception ''not authorised'';
    end if;
    return hub_private.pq_hub_admin(p_action, p_args);
  end if;
  if p_action in (''link'', ''unlink'') then');
  end if;
end $p$;
