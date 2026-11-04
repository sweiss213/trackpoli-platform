-- SANDBOX ONLY. Stands in for the parts of a Supabase project that the Phase 1 migrations rely on, so the
-- tests can be run on a plain PostgreSQL 16 with pgTAP. Do not run this on a real Supabase project.
-- It is a close copy of what Supabase provides (roles, the auth schema, auth.uid() and auth.jwt(), the default
-- table and function privileges, the extensions schema); it is NOT the real thing, which is why the first
-- task of P1-03 is to run the same files on a real local Supabase stack.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon')                then create role anon                nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated')       then create role authenticated       nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')        then create role service_role        nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin nologin noinherit; end if;
end $$;
grant anon, authenticated, service_role to postgres;

create schema extensions;
create extension pgcrypto with schema extensions;
create extension citext   with schema extensions;
create extension pgtap    with schema extensions;
grant usage on schema extensions to anon, authenticated, service_role, supabase_auth_admin;

create schema auth;
create table auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, last_sign_in_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(), banned_until timestamptz
);
create table auth.sessions    (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users (id) on delete cascade, created_at timestamptz default now());
create table auth.mfa_factors (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users (id) on delete cascade, factor_type text, status text, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim', true), ''),
                  nullif(current_setting('request.jwt.claims', true), ''))::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role, supabase_auth_admin;
grant all on auth.users, auth.sessions, auth.mfa_factors to service_role, supabase_auth_admin;

-- Supabase's default privileges: every new table and function in public is open to the API roles until a
-- migration revokes it. The Phase 1 migrations rely on explicit revokes, so the sandbox must have this.
grant usage on schema public to anon, authenticated, service_role, supabase_auth_admin;
alter default privileges for role postgres in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
