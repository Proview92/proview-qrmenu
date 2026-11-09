alter function public.pq_email() set search_path = public;
revoke execute on function public.hub_call(text,text,jsonb), public.hub_plans(text,jsonb) from authenticated;
