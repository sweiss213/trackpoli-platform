create table public.sign_in_lockouts (
  email_hash   text primary key,                 -- SHA-256 of the lower-cased email, hex
  failures     integer not null default 0,
  window_start timestamptz not null default now(),
  strikes      integer not null default 0,       -- number of pauses so far
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
alter table public.sign_in_lockouts enable row level security;   -- no policies: service role only
revoke all on public.sign_in_lockouts from anon, authenticated;

-- Returns null when sign-in is allowed, otherwise the time the pause ends.
create function public.sign_in_paused_until(p_hash text) returns timestamptz
  language sql stable security definer set search_path = '' as $$
  select locked_until from public.sign_in_lockouts
  where email_hash = p_hash and locked_until > now() $$;

-- Records one failed attempt. Returns the end of a pause if one is now in force.
create function public.record_sign_in_failure(p_hash text) returns timestamptz
  language plpgsql security definer set search_path = '' as $$
declare r public.sign_in_lockouts;
begin
  insert into public.sign_in_lockouts (email_hash) values (p_hash) on conflict (email_hash) do nothing;
  select * into r from public.sign_in_lockouts where email_hash = p_hash for update;
  if r.locked_until is not null and r.locked_until > now() then
    return r.locked_until;                                    -- already paused: do not extend
  end if;
  if r.updated_at < now() - interval '24 hours' then r.strikes := 0; end if;
  if r.window_start < now() - interval '15 minutes' then r.failures := 0; r.window_start := now(); end if;
  r.failures := r.failures + 1;
  if r.failures >= 5 then
    r.strikes := r.strikes + 1;
    r.locked_until := now() + least(interval '15 minutes' * power(2, r.strikes - 1), interval '4 hours');
    r.failures := 0; r.window_start := now();
  end if;
  update public.sign_in_lockouts
     set failures = r.failures, window_start = r.window_start, strikes = r.strikes,
         locked_until = r.locked_until, updated_at = now()
   where email_hash = p_hash;
  return case when r.locked_until > now() then r.locked_until end;
end $$;

-- Called after a successful sign-in and after a completed password reset.
create function public.clear_sign_in_failures(p_hash text) returns void
  language sql security definer set search_path = '' as $$
  delete from public.sign_in_lockouts where email_hash = p_hash $$;

revoke all on function public.sign_in_paused_until, public.record_sign_in_failure,
  public.clear_sign_in_failures from public, anon, authenticated;
grant execute on function public.sign_in_paused_until, public.record_sign_in_failure,
  public.clear_sign_in_failures to service_role;
