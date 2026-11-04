-- supabase/seed.sql: LOCAL AND STAGING ONLY. Never run in production: production gets its first Administrator
-- Manager through the one-off script in docs/ (see P1-03). Everything here uses example.test addresses.
--
-- Cast of seven people. The tests refer to them by name through the tests.people table, so a test never
-- carries a uuid. Each person exists so that at least one access-matrix cell needs them:
--   mia  Administrator Manager, active, terms accepted   (the manager in the matrix)
--   max  Administrator Manager, active, terms accepted   (second manager: the last-manager guard needs two)
--   tom  Administrator Manager, active, terms NOT accepted (the terms gate; a manager makes it a strong test)
--   abe  Administrator, active, terms accepted           (the Administrator in the matrix)
--   bea  Administrator, active, terms accepted           (a second Administrator: "other rows" cells need one)
--   ivy  Administrator, invited                          (may read only her own profile row and the terms)
--   dee  Administrator, deactivated, had accepted terms  (denied by status, not by the terms gate)

create schema if not exists tests;

-- Let the test runner assume supabase_auth_admin so the access-token-hook policy test
-- (30_functions_and_grants) can impersonate the auth service. LOCAL/TEST ONLY; wrapped so a
-- restricted role that may not grant this does not fail the seed (that one subtest then stays red).
do $$ begin grant supabase_auth_admin to postgres; exception when others then null; end $$;

create table tests.people (name text primary key, id uuid not null unique);
insert into tests.people (name, id) values
  ('mia', '00000000-0000-4000-8000-0000000000a1'),
  ('max', '00000000-0000-4000-8000-0000000000a2'),
  ('tom', '00000000-0000-4000-8000-0000000000a3'),
  ('abe', '00000000-0000-4000-8000-0000000000b1'),
  ('bea', '00000000-0000-4000-8000-0000000000b2'),
  ('ivy', '00000000-0000-4000-8000-0000000000c1'),
  ('dee', '00000000-0000-4000-8000-0000000000d1');

-- Auth users. The local password is only for signing in by hand on a developer machine.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated',
       p.name || '@example.test', extensions.crypt('LocalOnly-Passw0rd!', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', '{}'
from tests.people p;

insert into public.profiles (id, email, display_name, role, status, invited_at, activated_at, deactivated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'mia@example.test', 'Mia Manager',   'admin_manager', 'active',      now(), now(), null),
  ('00000000-0000-4000-8000-0000000000a2', 'max@example.test', 'Max Manager',   'admin_manager', 'active',      now(), now(), null),
  ('00000000-0000-4000-8000-0000000000a3', 'tom@example.test', 'Tom Manager',   'admin_manager', 'active',      now(), now(), null),
  ('00000000-0000-4000-8000-0000000000b1', 'abe@example.test', 'Abe Admin',     'admin',         'active',      now(), now(), null),
  ('00000000-0000-4000-8000-0000000000b2', 'bea@example.test', 'Bea Admin',     'admin',         'active',      now(), now(), null),
  ('00000000-0000-4000-8000-0000000000c1', 'ivy@example.test', 'Ivy Invited',   'admin',         'invited',     now(), null,  null),
  ('00000000-0000-4000-8000-0000000000d1', 'dee@example.test', 'Dee Deactivated','admin',        'deactivated', now(), now(), now());

-- Terms accepted by everyone except tom and ivy. The current placeholder version is '0' (Q-1-22).
insert into public.policy_acceptances (admin_id, admin_email, document, version)
select p.id, p.name || '@example.test', d.document, '0'
from tests.people p cross join (values ('terms'), ('privacy')) d (document)
where p.name not in ('tom', 'ivy');

-- One preference row each, so "own rows" and "other rows" cells have something to find.
insert into public.notification_preferences (admin_id, key, value)
select id, 'theme', '"dark"'::jsonb from tests.people where name in ('mia', 'abe', 'bea', 'dee');

-- Five audit events: who they are by and about decides which matrix cells can see them.
select public.log_event((select id from tests.people where name = 'abe'), 'auth.sign_in',        'admin', (select id::text from tests.people where name = 'abe'), 'Abe signed in');
select public.log_event((select id from tests.people where name = 'mia'), 'admin.role_changed',  'admin', (select id::text from tests.people where name = 'abe'), 'Mia changed Abe''s role');
select public.log_event((select id from tests.people where name = 'bea'), 'auth.sign_in',        'admin', (select id::text from tests.people where name = 'bea'), 'Bea signed in');
select public.log_event((select id from tests.people where name = 'dee'), 'auth.sign_in',        'admin', (select id::text from tests.people where name = 'dee'), 'Dee signed in');
select public.log_event((select id from tests.people where name = 'mia'), 'admin.invited',       'admin', (select id::text from tests.people where name = 'ivy'), 'Mia invited Ivy');

-- Two operational events, so managers have something to read.
select public.log_error('warning', 'edge_function', 'seed', 'seed_1', 'seed event one');
select public.log_error('error',   'database',      'seed', 'seed_2', 'seed event two');

-- ---------------------------------------------------------------------------------------------------------
-- Test helpers. tests.run(who, aal, sql) runs one statement as a person, as anon or as the service role,
-- then ALWAYS rolls that statement back, so a test that finds a hole cannot spoil the next test. It returns
--   'ok:N'      the statement ran and touched or returned N rows
--   'err:CODE'  the statement failed with that SQLSTATE (42501 = permission denied or row-level security
--               refused a write; P0001 = a function or trigger of ours raised)
-- who is a person's name, or 'anon', 'service' (the service role) or 'auth_admin' (the role Supabase Auth uses to
-- run the access token hook).
-- tests.val(who, aal, sql) is the same for a statement that returns one value: it returns 'val:<value>'.
-- Call both as the owner (the pgTAP file's own session), never after switching role yourself.
-- Fills {me} (the person acting) and {mia} {max} {tom} {abe} {bea} {ivy} {dee} (uuids) into a statement, so the
-- statement can be written as a plain template and runs without any access to the tests schema.
create function tests.fill(p_who text, p_sql text) returns text language plpgsql stable as $$
declare r record; v text := p_sql;
begin
  for r in select name, id from tests.people loop
    v := replace(v, '{' || r.name || '}', r.id::text);
    if r.name = p_who then v := replace(v, '{me}', r.id::text); end if;
  end loop;
  return v;
end $$;

create function tests.run_as(p_mode text, p_who text, p_aal text, p_sql text) returns text
  language plpgsql as $$
declare v_role text; v_claims text; v_uid uuid; v_n bigint; v_val text; v_result text;
begin
  if p_who = 'anon' then
    v_role := 'anon';          v_claims := json_build_object('role', 'anon')::text;
  elsif p_who = 'service' then
    v_role := 'service_role';  v_claims := json_build_object('role', 'service_role')::text;
  elsif p_who = 'auth_admin' then
    v_role := 'supabase_auth_admin'; v_claims := '{}';
  else
    select id into v_uid from tests.people where name = p_who;
    if v_uid is null then raise exception 'tests.run_as: unknown person %', p_who; end if;
    v_role := 'authenticated';
    v_claims := json_build_object('sub', v_uid, 'role', 'authenticated', 'aal', p_aal,
                                  'email', p_who || '@example.test')::text;
  end if;
  p_sql := tests.fill(p_who, p_sql);
  begin
    perform set_config('request.jwt.claims', v_claims, true);
    perform set_config('role', v_role, true);
    if p_mode = 'val' then
      execute p_sql into v_val;
      v_result := 'val:' || coalesce(v_val, 'null');
    else
      execute p_sql;
      get diagnostics v_n = row_count;
      v_result := 'ok:' || v_n;
    end if;
    raise exception 'rollback' using errcode = 'TT999';
  exception when others then
    if sqlstate <> 'TT999' then v_result := 'err:' || sqlstate; end if;
  end;
  return v_result;
end $$;

create function tests.run(p_who text, p_aal text, p_sql text) returns text
  language sql as $$ select tests.run_as('count', p_who, p_aal, p_sql) $$;
create function tests.val(p_who text, p_aal text, p_sql text) returns text
  language sql as $$ select tests.run_as('val', p_who, p_aal, p_sql) $$;

-- Convenience: the uuid of a person, for building statements.
create function tests.uid(p_name text) returns uuid language sql stable as
  $$ select id from tests.people where name = p_name $$;

-- Phase 2/3 step/check helpers (tests.go, goval, step, ver, cl, q, subst, vars, zz_*) are parked in
-- supabase/tests/_phase2-3-parked/seed-helpers.phase2-3.sql.txt and restored here when those tests land (TP1-01, Option 3).
