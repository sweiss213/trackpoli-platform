-- The lockout pause threshold is a single DB-owned fact. Before this, the edge function auth-event kept
-- its own copy (LOCK_THRESHOLD = 5) and re-read sign_in_lockouts.failures to show "N attempts remaining",
-- a second writer of a number migration 010's record_sign_in_failure already owns (it pauses at 5). If the
-- threshold were ever tuned, the enforced value and the displayed count would drift. This makes the DB the
-- sole owner: one function returns the threshold, record_sign_in_failure reads it (behaviour unchanged),
-- and a new read-only function computes attempts-remaining in the DB so the app holds no copy. Expand-only:
-- no DROP and no signature change (record_sign_in_failure still returns timestamptz), so migration 010's
-- pgTAP suite and the generated types stay valid. See ADR-0007.

-- The one owner of the pause threshold.
create function public.sign_in_lock_threshold() returns integer
  language sql immutable set search_path = '' as $$ select 5 $$;

-- record_sign_in_failure, behaviour unchanged, now reading the threshold from its single owner instead of a
-- literal. Same name, args and return type, so CREATE OR REPLACE is allowed and existing callers and the
-- migration-010 lockout tests are unaffected.
create or replace function public.record_sign_in_failure(p_hash text) returns timestamptz
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
  if r.failures >= public.sign_in_lock_threshold() then
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

-- Attempts remaining before a pause, computed in the DB from its own threshold and counter (the full
-- threshold when no row exists yet). The value depends only on the hash counter, identical for any email,
-- so surfacing it never reveals whether an account exists (ADR-0005). The server reads this instead of
-- keeping a copy of the threshold.
create function public.sign_in_attempts_remaining(p_hash text) returns integer
  language sql stable security definer set search_path = '' as $$
  select greatest(
    0,
    public.sign_in_lock_threshold()
      - coalesce((select failures from public.sign_in_lockouts where email_hash = p_hash), 0)
  ) $$;

-- Service role only (and revoke the implicit PUBLIC execute grant), matching migration 010's lockout
-- functions: these are called only by the TrackPoli server through the edge functions.
revoke all on function public.sign_in_lock_threshold(), public.sign_in_attempts_remaining(text)
  from public, anon, authenticated;
grant execute on function public.sign_in_lock_threshold(), public.sign_in_attempts_remaining(text)
  to service_role;
