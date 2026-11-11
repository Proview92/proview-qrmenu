-- 009: the master's "+ Add business" can start the new business on a 3-day trial (ADD_BUSINESS_D_SPEC, owner decision
-- 11 Nov 2026: "Bring back a trial here only").
--
-- Everything else stays no-trial (migration 007): self-signup, + Add location, the older pq_create_org and the licence
-- portal's New customer still start with no licence, and the pq_sites_no_trial insert trigger stays. Only the master,
-- from the Add business dialog's "3-day trial" choice, gives the location they have just added a trial.
--
-- pq_master_trial(p_site): Proview master only. Licences are per location (pq_sites), so this sets that location to
-- 'trial3' from now to now + 3 days. Unlike pq_set_trial (Locations -> Trial..., which extends or overwrites whatever is
-- there), it never replaces a licence that is already set: a location that already has a licence is left as it is and
-- { applied: false } comes back with its current licence. It is an UPDATE, so the insert-only no-trial trigger is not
-- involved. Returns { applied, site_id, license_type, expires_at }. Safe to run more than once.

create or replace function public.pq_master_trial(p_site uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r pq_sites; e timestamptz := now() + interval '3 days';
begin
  if not pq_is_master() then raise exception 'Only Proview can start a trial.'; end if;
  select * into r from pq_sites where id = p_site for update;
  if not found then raise exception 'Location not found.'; end if;
  if r.license_type is not null then
    return jsonb_build_object('applied', false, 'site_id', r.id, 'license_type', r.license_type, 'expires_at', r.expires_at);
  end if;
  update pq_sites set license_type = 'trial3', starts_at = now(), expires_at = e where id = p_site;
  return jsonb_build_object('applied', true, 'site_id', p_site, 'license_type', 'trial3', 'expires_at', e);
end $$;
revoke all on function public.pq_master_trial(uuid) from public, anon;
grant execute on function public.pq_master_trial(uuid) to authenticated;
