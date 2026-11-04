create extension if not exists citext with schema extensions;

-- Supabase grants ALL on every new table and sequence in public to anon and authenticated. Turn that off first,
-- so each table below gets only the privileges it names (service_role keeps its defaults).
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

create type public.admin_role   as enum ('admin', 'admin_manager');
create type public.admin_status as enum ('invited', 'active', 'deactivated');

create table public.profiles (
  id               uuid primary key references auth.users (id) on delete restrict,
  email            extensions.citext not null unique,
  display_name     text not null check (char_length(display_name) between 1 and 120),
  role             public.admin_role   not null default 'admin',
  status           public.admin_status not null default 'invited',
  invited_by       uuid,
  invited_at       timestamptz,
  activated_at     timestamptz,
  deactivated_at   timestamptz,
  deactivated_by   uuid,
  last_sign_in_at  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
-- migration-safety:ignore=index-not-concurrent brand-new table, no readers yet
create index profiles_role_status_idx on public.profiles (role, status);

-- Helpers: security definer so policies can read profiles without recursion.
create function public.current_admin_role() returns public.admin_role
  language sql stable security definer set search_path = ''
  as $$ select role from public.profiles
        where id = auth.uid() and status = 'active' $$;

create function public.is_manager() returns boolean
  language sql stable security definer set search_path = ''
  as $$ select coalesce(public.current_admin_role() = 'admin_manager'::public.admin_role, false) $$;

create function public.is_aal2() returns boolean
  language sql stable set search_path = ''
  as $$ select coalesce(auth.jwt() ->> 'aal', '') = 'aal2' $$;

-- updated_at
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
