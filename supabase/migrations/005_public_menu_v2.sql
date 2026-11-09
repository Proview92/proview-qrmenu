-- pq_public_menu v2 (applied 9 Nov 2026 as 005_public_promo_fields + 006_public_cfg_no_emails):
-- promo codes expose only code/type/off/mode/min of active, live codes; settings hide e-mail addresses and Google data.
create or replace function public.pq_public_cfg(c jsonb) returns jsonb language sql immutable set search_path = public as $$
  select coalesce(c, '{}'::jsonb) - 'forms' - 'google' || jsonb_build_object('forms', coalesce((
    select jsonb_object_agg(key, value) from jsonb_each(coalesce(c->'forms', '{}'::jsonb)) where key !~* '(e-?mail|error emailing|notification)'), '{}'::jsonb)) $$;
-- pq_public_menu: as in 003, with 'cfg' => pq_public_cfg(st.data->'cfg') and the promoCodes block:
--   jsonb_build_object('code', p->'code', 'type', p->'type', 'off', p->'off', 'mode', p->'mode', 'min', p->'min')
--   where coalesce((p->>'active')::boolean, false) and coalesce(p->>'status','Live') = 'Live'
