create type public.ops_severity as enum ('warning', 'error', 'critical');

create table public.operational_events (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  severity     public.ops_severity not null,
  source       text not null check (source in ('edge_function', 'database', 'auth_hook', 'job')),
  component    text not null,                      -- function, trigger or job name
  error_code   text,                               -- API error code or Postgres SQLSTATE
  message      text not null check (char_length(message) <= 500),
  http_status  integer,
  duration_ms  integer,
  request_id   uuid,
  release      text,
  environment  text,
  actor_id     uuid,                               -- id only, never a name or email
  context      jsonb not null default '{}'::jsonb  -- allow-listed keys only (see log_error)
);
-- migration-safety:ignore=index-not-concurrent brand-new table, no readers yet
create index operational_events_time_idx      on public.operational_events (occurred_at desc);
-- migration-safety:ignore=index-not-concurrent brand-new table, no readers yet
create index operational_events_component_idx on public.operational_events (component, occurred_at desc);
-- migration-safety:ignore=index-not-concurrent brand-new table, no readers yet
create index operational_events_request_idx   on public.operational_events (request_id);

alter table public.operational_events enable row level security;
revoke all on public.operational_events from anon, authenticated;
grant select on public.operational_events to authenticated;
create policy ops_select_manager on public.operational_events for select to authenticated
  using ((select public.is_manager()) and (select public.is_aal2()));

-- Append only, except the retention purge.
create function public.operational_events_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE'
     and current_setting('trackpoli.purge', true) = 'on'
     and old.occurred_at < now() - interval '90 days' then
    return old;
  end if;
  raise exception 'operational_events is append only';
end $$;
create trigger operational_events_no_change before update or delete on public.operational_events
  for each row execute function public.operational_events_guard();
-- migration-safety:ignore this defines a trigger that blocks TRUNCATE and does not truncate anything
create trigger operational_events_no_truncate before truncate on public.operational_events
  for each statement execute function public.operational_events_guard();

create function public.log_error(
  p_severity public.ops_severity, p_source text, p_component text, p_error_code text,
  p_message text, p_http_status integer default null, p_duration_ms integer default null,
  p_request uuid default null, p_release text default null, p_environment text default null,
  p_actor uuid default null, p_context jsonb default '{}'
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint; v_ctx jsonb;
begin
  -- keep only allow-listed keys so personal data and secrets cannot slip in
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_ctx
  from jsonb_each(coalesce(p_context, '{}'::jsonb))
  where key in ('route', 'method', 'function', 'attempt', 'upstream', 'sqlstate', 'retry_after');
  insert into public.operational_events
    (severity, source, component, error_code, message, http_status, duration_ms,
     request_id, release, environment, actor_id, context)
  values (p_severity, p_source, p_component, p_error_code, left(p_message, 500), p_http_status,
          p_duration_ms, p_request, p_release, p_environment, p_actor, v_ctx)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.log_error from public, anon, authenticated;
grant execute on function public.log_error to service_role;

create function public.purge_operational_events() returns bigint
  language plpgsql security definer set search_path = '' as $$
declare v_count bigint;
begin
  perform set_config('trackpoli.purge', 'on', true);
  delete from public.operational_events where occurred_at < now() - interval '90 days';
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.purge_operational_events from public, anon, authenticated;
grant execute on function public.purge_operational_events to service_role;
-- create extension if not exists pg_cron;
-- select cron.schedule('purge-operational-events', '17 3 * * *', 'select public.purge_operational_events()');

-- Terms and privacy acceptance (Q-1-20). Version '0' is a placeholder until the approved text exists (Q-1-22).
create table public.policy_versions (
  document        text primary key check (document in ('terms', 'privacy')),
  current_version text not null,
  published_at    timestamptz not null default now()
);
insert into public.policy_versions (document, current_version) values ('terms', '0'), ('privacy', '0');

create table public.policy_acceptances (
  id           bigint generated always as identity primary key,
  admin_id     uuid not null,          -- no foreign key: acceptances outlive the account
  admin_email  text not null,          -- snapshot
  document     text not null check (document in ('terms', 'privacy')),
  version      text not null,
  accepted_at  timestamptz not null default now(),
  ip           inet,
  request_id   uuid,
  unique (admin_id, document, version)
);
alter table public.policy_versions enable row level security;
alter table public.policy_acceptances enable row level security;
revoke all on public.policy_versions, public.policy_acceptances from anon, authenticated;
grant select on public.policy_versions, public.policy_acceptances to authenticated;
create policy versions_select on public.policy_versions for select to authenticated using (true);
create policy acceptances_select_own on public.policy_acceptances for select to authenticated
  using (admin_id = (select auth.uid()) and (select public.is_aal2()) and (select public.current_admin_role()) is not null);
create policy acceptances_select_manager on public.policy_acceptances for select to authenticated
  using ((select public.is_manager()) and (select public.is_aal2()));
create trigger policy_acceptances_no_change before update or delete on public.policy_acceptances
  for each row execute function public.activity_events_immutable();

-- migration-safety:ignore this defines a trigger that blocks TRUNCATE and does not truncate anything
create trigger policy_acceptances_no_truncate before truncate on public.policy_acceptances
  for each statement execute function public.activity_events_immutable();

create function public.has_accepted_current_policies() returns boolean
  language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.policy_versions v
    where not exists (select 1 from public.policy_acceptances a
                      where a.admin_id = auth.uid() and a.document = v.document
                        and a.version = v.current_version)) $$;

-- policy_versions stays readable at aal1 because the terms screen comes before the two-factor code.
-- Terms gate: without acceptance a signed-in user can read only their own profile row.
create policy require_policies_profiles on public.profiles as restrictive for select to authenticated
  using (id = (select auth.uid()) or (select public.has_accepted_current_policies()));
create policy require_policies_events on public.activity_events as restrictive for select to authenticated
  using ((select public.has_accepted_current_policies()));
create policy require_policies_ops on public.operational_events as restrictive for select to authenticated
  using ((select public.has_accepted_current_policies()));
create policy require_policies_acceptances on public.policy_acceptances as restrictive for select to authenticated
  using (admin_id = (select auth.uid()) or (select public.has_accepted_current_policies()));
create policy require_policies_prefs on public.notification_preferences as restrictive for all to authenticated
  using ((select public.has_accepted_current_policies()))
  with check ((select public.has_accepted_current_policies()));
