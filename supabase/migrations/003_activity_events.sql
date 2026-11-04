create table public.activity_events (
  id            bigint generated always as identity primary key,
  occurred_at   timestamptz not null default now(),
  actor_id      uuid,                       -- no foreign key: the log must outlive profiles
  actor_role    public.admin_role,
  actor_name    text,                       -- snapshot of display_name when the event happened
  actor_email   text,                       -- snapshot of the email; null for anonymous events
  action        text not null check (action ~ '^[a-z_]+\.[a-z_]+$'),
  subject_type  text,
  subject_id    text,
  summary       text not null,
  details       jsonb not null default '{}'::jsonb,
  ip            inet,
  request_id    uuid
);
-- migration-safety:ignore=index-not-concurrent brand-new table, no readers yet
create index activity_events_time_idx    on public.activity_events (occurred_at desc);
-- migration-safety:ignore=index-not-concurrent brand-new table, no readers yet
create index activity_events_actor_idx   on public.activity_events (actor_id, occurred_at desc);
-- migration-safety:ignore=index-not-concurrent brand-new table, no readers yet
create index activity_events_subject_idx on public.activity_events (subject_type, subject_id, occurred_at desc);

alter table public.activity_events enable row level security;
revoke all on public.activity_events from anon, authenticated;
grant select on public.activity_events to authenticated;

-- Phase 3 (migration 019) replaces this trigger with one that also allows the one-time seal of an entry's chain columns.
create function public.activity_events_immutable() returns trigger
  language plpgsql as $$ begin raise exception '% is append only', tg_table_name; end $$;
create trigger activity_events_no_update before update or delete on public.activity_events
  for each row execute function public.activity_events_immutable();
-- migration-safety:ignore this defines a trigger that blocks TRUNCATE and does not truncate anything
create trigger activity_events_no_truncate before truncate on public.activity_events
  for each statement execute function public.activity_events_immutable();

create function public.log_event(
  p_actor uuid, p_action text, p_subject_type text, p_subject_id text,
  p_summary text, p_details jsonb default '{}', p_ip inet default null, p_request uuid default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint; v_role public.admin_role; v_name text; v_email text;
begin
  select role, display_name, email::text into v_role, v_name, v_email from public.profiles where id = p_actor;
  insert into public.activity_events
    (actor_id, actor_role, actor_name, actor_email, action, subject_type, subject_id, summary, details, ip, request_id)
  values (p_actor, v_role, v_name, v_email, p_action, p_subject_type, p_subject_id, p_summary,
          coalesce(p_details, '{}'::jsonb), p_ip, p_request)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.log_event from public, anon, authenticated;
grant execute on function public.log_event to service_role;
