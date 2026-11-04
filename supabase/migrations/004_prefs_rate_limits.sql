create table public.notification_preferences (
  admin_id uuid not null references public.profiles (id) on delete cascade,
  key      text not null,
  value    jsonb not null,
  primary key (admin_id, key)
);
alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from anon, authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;

create table public.rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;   -- no policies: service role only
revoke all on public.rate_limits from anon, authenticated;

-- Returns true when the call is allowed. Fixed window; the key includes the action and caller.
create function public.rate_limit_check(p_key text, p_max int, p_window interval)
  returns boolean language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / extract(epoch from p_window))
                                           * extract(epoch from p_window));
        v_hits int;
begin
  insert into public.rate_limits (key, window_start) values (p_key, v_start)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return v_hits <= p_max;
end $$;
revoke all on function public.rate_limit_check from public, anon, authenticated;
grant execute on function public.rate_limit_check to service_role;
