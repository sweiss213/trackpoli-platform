-- Privileges, the helper functions and the access token hook (migrations 001 to 011).
begin;
select plan(83);

-- ============ every table has row-level security, and the API roles hold only the grants the plan gives them ============
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
          0, 'every table in public has row-level security on');

select set_eq($$select table_name::text, privilege_type::text from information_schema.role_table_grants
                where table_schema = 'public' and grantee = 'anon'$$,
              $$select 'none'::text as t, 'none'::text as p where false$$,
              'anon holds no privilege on any table in public');

select set_eq($$select table_name::text, privilege_type::text from information_schema.role_table_grants
                where table_schema = 'public' and grantee = 'authenticated'$$,
              $$values ('profiles', 'SELECT'),
                       ('activity_events', 'SELECT'),
                       ('operational_events', 'SELECT'),
                       ('policy_acceptances', 'SELECT'),
                       ('policy_versions', 'SELECT'),
                       ('notification_preferences', 'SELECT'), ('notification_preferences', 'INSERT'),
                       ('notification_preferences', 'UPDATE'), ('notification_preferences', 'DELETE')$$,
              -- Phase 2/3 table grants are parked in ../_phase2-3-parked/30_grants.phase2-3-additions.sql.txt (TP1-01, Option 3)
              'signed-in people hold exactly the table privileges the plan gives them (no TRUNCATE, REFERENCES or TRIGGER anywhere)');

select set_eq($$select table_name::text || '.' || column_name::text, privilege_type::text from information_schema.role_column_grants
                where table_schema = 'public' and grantee = 'authenticated' and privilege_type in ('INSERT', 'UPDATE')
                  and table_name = 'profiles'$$,
              $$values ('profiles.display_name', 'UPDATE')$$,
              'on profiles the only column a signed-in person may change is display_name');

select is((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace,
                lateral aclexplode(c.relacl) a
           where n.nspname = 'public' and c.relkind = 'S' and a.grantee in
                 (select oid from pg_roles where rolname in ('anon', 'authenticated'))),
          0, 'no sequence in public is open to anon or signed-in people');

-- ============ function privileges ==========================================================================
-- Service role only
select is(has_function_privilege(r, f, 'execute'), (r = 'service_role'), r || ' on ' || f)
from (values ('anon'), ('authenticated'), ('service_role')) as roles (r)
cross join (values
  ('public.log_event(uuid,text,text,text,text,jsonb,inet,uuid)'),
  ('public.rate_limit_check(text,integer,interval)'),
  ('public.revoke_user_sessions(uuid)'),
  ('public.purge_operational_events()'),
  ('public.sign_in_paused_until(text)'),
  ('public.record_sign_in_failure(text)'),
  ('public.clear_sign_in_failures(text)'),
  ('public.sign_in_lock_threshold()'),
  ('public.sign_in_attempts_remaining(text)')
) as fns (f);
select is(has_function_privilege(r, 'public.log_error(public.ops_severity,text,text,text,text,integer,integer,uuid,text,text,uuid,jsonb)', 'execute'),
          (r = 'service_role'), r || ' on log_error')
from (values ('anon'), ('authenticated'), ('service_role')) as roles (r);

-- The access token hook: only the auth service
select is(has_function_privilege(r, 'public.custom_access_token_hook(jsonb)', 'execute'), (r = 'supabase_auth_admin'), r || ' on the access token hook')
from (values ('anon'), ('authenticated'), ('service_role'), ('supabase_auth_admin')) as roles (r);

-- Functions that anon and signed-in people can call: only the four read-only helpers that row-level security needs.
select set_eq($$select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype
                  and has_function_privilege('authenticated', p.oid, 'execute')$$,
              $$values ('current_admin_role'), ('is_manager'), ('is_aal2'), ('has_accepted_current_policies')$$,
              -- Phase 2/3 application functions are parked in ../_phase2-3-parked/30_grants.phase2-3-additions.sql.txt (TP1-01, Option 3)
              'signed-in people can call only the four read-only helpers that row-level security needs (Phase 1)');
select set_eq($$select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype
                  and has_function_privilege('anon', p.oid, 'execute')$$,
              $$values ('current_admin_role'), ('is_manager'), ('is_aal2'), ('has_accepted_current_policies')$$,
              'anon can call only the same four read-only helpers (harmless: they return null or false without a session)');
select is(tests.val('anon', 'aal1', 'select public.has_accepted_current_policies()::text'), 'val:false', 'for anon the terms helper says false');
select is(tests.val('anon', 'aal1', 'select public.is_manager()::text'),                  'val:false', 'for anon the manager helper says false');

-- ============ access token hook =====================================================================================
select is(public.custom_access_token_hook(jsonb_build_object('user_id', tests.uid(n), 'claims', '{"aal":"aal1","sub":"x"}'::jsonb))
            -> 'claims' ->> 'app_role', role_, n || ': app_role')
from (values ('mia', 'admin_manager'), ('abe', 'admin'), ('ivy', 'admin'), ('dee', 'admin')) as t (n, role_);
select is(public.custom_access_token_hook(jsonb_build_object('user_id', tests.uid(n), 'claims', '{"aal":"aal1"}'::jsonb))
            -> 'claims' ->> 'app_status', st, n || ': app_status')
from (values ('mia', 'active'), ('abe', 'active'), ('ivy', 'invited'), ('dee', 'deactivated')) as t (n, st);
select is(public.custom_access_token_hook(jsonb_build_object('user_id', gen_random_uuid(), 'claims', '{"aal":"aal1"}'::jsonb)) -> 'claims' ->> 'app_role',
          'none', 'an unknown user gets app_role none');
select is(public.custom_access_token_hook(jsonb_build_object('user_id', gen_random_uuid(), 'claims', '{"aal":"aal1"}'::jsonb)) -> 'claims' ->> 'app_status',
          'none', 'an unknown user gets app_status none');
select is(public.custom_access_token_hook(jsonb_build_object('user_id', tests.uid('abe'), 'claims', '{"aal":"aal2","sub":"keep"}'::jsonb)) -> 'claims' ->> 'sub',
          'keep', 'the hook keeps the claims it was given');
-- The auth service runs the hook as supabase_auth_admin and reads the profile via the explicit grant +
-- profiles_auth_admin_read policy (migration 006), not a security-definer bypass. On real Supabase the
-- test runner (postgres) may not assume supabase_auth_admin, so assert the behaviour (hook output) and
-- the configuration (grant + policy) rather than impersonating the role.
select is((select public.custom_access_token_hook(jsonb_build_object('user_id', tests.uid('dee')::text, 'claims', '{}'::jsonb)) -> 'claims' ->> 'app_status'),
          'deactivated', 'the access-token hook reads a deactivated profile and injects app_status=deactivated');
select ok(has_table_privilege('supabase_auth_admin', 'public.profiles', 'select'),
          'the auth service (supabase_auth_admin) is granted select on public.profiles');
select ok(exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_auth_admin_read'),
          'the profiles_auth_admin_read policy exists so the auth service reads a profile via RLS');

-- ============ rate_limit_check (fixed window; now() does not move inside this test, so one window) ====================
select is((select public.rate_limit_check('t1', 3, interval '1 hour')), true,  'call 1 of 3 is allowed');
select is((select public.rate_limit_check('t1', 3, interval '1 hour')), true,  'call 2 of 3 is allowed');
select is((select public.rate_limit_check('t1', 3, interval '1 hour')), true,  'call 3 of 3 is allowed');
select is((select public.rate_limit_check('t1', 3, interval '1 hour')), false, 'call 4 is refused');
select is((select public.rate_limit_check('t1', 3, interval '1 hour')), false, 'call 5 is still refused');
select is((select public.rate_limit_check('t2', 3, interval '1 hour')), true,  'another key has its own count');
select is((select hits from public.rate_limits where key = 't1'), 5, 'refused calls are still counted');
insert into public.rate_limits (key, window_start, hits) values ('stale', now() - interval '2 days', 9);
select public.rate_limit_check('t3', 3, interval '1 hour');
select is((select count(*)::int from public.rate_limits where key = 'stale'), 0, 'windows older than a day are cleaned up by the next call');
select is(tests.val('abe', 'aal2', $$select public.rate_limit_check('x', 3, interval '1 hour')::text$$), 'err:42501', 'an Administrator cannot call rate_limit_check');
select is(tests.val('service', 'aal2', $$select public.rate_limit_check('x', 3, interval '1 hour')::text$$), 'val:true', 'the service role can');

-- ============ log_event keeps a snapshot of who acted =================================================================
select public.log_event(tests.uid('abe'), 'test.snapshot', 'admin', tests.uid('abe')::text, 'snapshot test');
select is((select actor_name from public.activity_events where action = 'test.snapshot'), 'Abe Admin', 'the event holds the name at the time');
select is((select actor_email from public.activity_events where action = 'test.snapshot'), 'abe@example.test', 'the event holds the email at the time');
select is((select actor_role::text from public.activity_events where action = 'test.snapshot'), 'admin', 'the event holds the role at the time');
update public.profiles set display_name = 'Abe Renamed' where id = tests.uid('abe');
select is((select actor_name from public.activity_events where action = 'test.snapshot'), 'Abe Admin', 'renaming the person does not change an old event');
select lives_ok($$select public.log_event(null, 'test.anonymous', null, null, 'no actor')$$, 'an event with no actor (a failed sign-in) can be written');
select is((select actor_email from public.activity_events where action = 'test.anonymous'), null, 'an anonymous event holds no email');
select lives_ok($$select public.log_event(gen_random_uuid(), 'test.ghost', 'admin', 'x', 'actor with no profile')$$, 'an actor with no profile (an already deleted person) is written with empty snapshots');
select throws_ok($$select public.log_event(null, 'Bad Action', null, null, 'x')$$, '23514', null, 'an action name must look like area.name');
select throws_ok($$select public.log_event(null, 'test.no_summary', null, null, null)$$, '23502', null, 'a summary is required');

-- ============ log_error (the operational log writer) ===================================================================
select public.log_error('error', 'job', 'c1', 'E1', 'm', null, null, null, null, null, null,
                        '{"route":"/x","method":"GET","email":"a@b.c","token":"t","body":"b","retry_after":3}'::jsonb);
select is((select context from public.operational_events where component = 'c1'),
          '{"route":"/x","method":"GET","retry_after":3}'::jsonb, 'log_error keeps only allow-listed context keys');
select public.log_error('error', 'job', 'c2', 'E2', repeat('x', 900));
select is((select char_length(message) from public.operational_events where component = 'c2'), 500, 'log_error cuts a long message to 500 characters');
select throws_ok($$select public.log_error('error', 'somewhere_else', 'c3', 'E3', 'm')$$, '23514', null, 'the source must be one of the four allowed');

-- ============ revoke_user_sessions ====================================================================================
insert into auth.sessions (id, user_id, created_at, updated_at) values
  (gen_random_uuid(), tests.uid('abe'), now(), now()),
  (gen_random_uuid(), tests.uid('abe'), now(), now()),
  (gen_random_uuid(), tests.uid('bea'), now(), now());
select is(tests.val('abe', 'aal2', format('select public.revoke_user_sessions(%L)::text', tests.uid('abe'))), 'err:42501', 'an Administrator cannot revoke sessions');
select public.revoke_user_sessions(tests.uid('abe'));
select is((select count(*)::int from auth.sessions where user_id = tests.uid('abe')), 0, 'the target''s sessions are gone');
select is((select count(*)::int from auth.sessions where user_id = tests.uid('bea')), 1, 'other people''s sessions are untouched');

-- ============ updated_at ==============================================================================================
select is((select updated_at from public.profiles where id = tests.uid('bea')) >= (select created_at from public.profiles where id = tests.uid('bea')), true, 'updated_at is not before created_at');

select * from finish();
rollback;
