-- Access matrix: one assertion per cell of the matrix in section 2 of the Phase 1 plan.
--
-- HOW "DENY" IS ASSERTED (decision for the plan): every cell states the exact result, never "anything but allow".
--   err:42501  the role has no privilege, or a row-level security check refused a write.   (anonymous callers,
--              revoked columns, and writes that fail a policy's WITH CHECK)
--   ok:0       the statement ran and row-level security hid or skipped every row.          (reads and updates
--              by a signed-in person who is not allowed that row)
--   ok:N       allowed. N is the number of rows in the seed that this person may see or change.
-- A test passes only when the result is exactly what the cell says, so a statement that is "denied" because the
-- row never existed cannot pass: the seed always has the row (see supabase/seed.sql for the cast of seven).
-- Columns: anon; abe = Administrator; mia = Administrator Manager; "aal1" = signed in, code not yet verified;
-- dee = deactivated; ivy = invited; tom = Administrator Manager who has not accepted the current terms.
begin;
select plan(171);

-- ---- profiles: select own ------------------------------------------------------------------------------
select is(tests.run(who, aal, sql), expected, who || ' ' || aal || ': profiles select own')
from (values
  ('anon', 'aal1', $$select * from public.profiles where id = '{abe}'$$, 'err:42501'),
  ('abe',  'aal2', $$select * from public.profiles where id = '{me}'$$,  'ok:1'),
  ('abe',  'aal1', $$select * from public.profiles where id = '{me}'$$,  'ok:1'),
  ('mia',  'aal2', $$select * from public.profiles where id = '{me}'$$,  'ok:1'),
  ('mia',  'aal1', $$select * from public.profiles where id = '{me}'$$,  'ok:1'),
  ('ivy',  'aal1', $$select * from public.profiles where id = '{me}'$$,  'ok:1'),
  ('tom',  'aal2', $$select * from public.profiles where id = '{me}'$$,  'ok:1'),
  ('dee',  'aal2', $$select * from public.profiles where id = '{me}'$$,  'ok:0')
) as t (who, aal, sql, expected);

-- ---- profiles: select all (seven rows in the seed) ------------------------------------------------------
select is(tests.run(who, aal, 'select * from public.profiles'), expected, who || ' ' || aal || ': profiles select all')
from (values
  ('anon', 'aal1', 'err:42501'),
  ('abe',  'aal2', 'ok:1'),     -- an Administrator sees only the own row
  ('bea',  'aal2', 'ok:1'),
  ('abe',  'aal1', 'ok:1'),
  ('mia',  'aal2', 'ok:7'),     -- the manager sees everyone
  ('max',  'aal2', 'ok:7'),
  ('mia',  'aal1', 'ok:1'),     -- a manager whose code is not verified sees only the own row
  ('ivy',  'aal1', 'ok:1'),
  ('tom',  'aal2', 'ok:1'),     -- terms gate: a manager who has not accepted sees only the own row
  ('dee',  'aal2', 'ok:0')
) as t (who, aal, expected);

-- ---- profiles: update display_name, own row -------------------------------------------------------------
select is(tests.run(who, aal, sql), expected, who || ' ' || aal || ': ' || label)
from (values
  ('anon', 'aal1', $$update public.profiles set display_name = 'Changed' where id = '{abe}'$$, 'err:42501', 'update own name'),
  ('abe',  'aal2', $$update public.profiles set display_name = 'Changed' where id = '{me}'$$,  'ok:1',      'update own name'),
  ('abe',  'aal1', $$update public.profiles set display_name = 'Changed' where id = '{me}'$$,  'ok:0',      'update own name'),
  ('mia',  'aal2', $$update public.profiles set display_name = 'Changed' where id = '{me}'$$,  'ok:1',      'update own name'),
  ('mia',  'aal1', $$update public.profiles set display_name = 'Changed' where id = '{me}'$$,  'ok:0',      'update own name'),
  ('ivy',  'aal1', $$update public.profiles set display_name = 'Changed' where id = '{me}'$$,  'ok:0',      'update own name'),
  ('dee',  'aal2', $$update public.profiles set display_name = 'Changed' where id = '{me}'$$,  'ok:0',      'update own name'),
  -- the other person's row is never touched, whatever the role
  ('abe',  'aal2', $$update public.profiles set display_name = 'Changed' where id = '{bea}'$$, 'ok:0',      'update another person''s name'),
  ('mia',  'aal2', $$update public.profiles set display_name = 'Changed' where id = '{abe}'$$, 'ok:0',      'manager updates another person''s name')
) as t (who, aal, sql, expected, label);

-- ---- profiles: update role or status (column privilege is revoked, so the answer is a privilege error) ---
select is(tests.run(who, 'aal2', sql), 'err:42501', who || ': ' || label)
from (values
  ('anon', $$update public.profiles set role   = 'admin_manager' where id = '{abe}'$$, 'cannot set role'),
  ('abe',  $$update public.profiles set role   = 'admin_manager' where id = '{me}'$$,  'cannot promote self'),
  ('abe',  $$update public.profiles set status = 'active'        where id = '{me}'$$,  'cannot set status'),
  ('mia',  $$update public.profiles set role   = 'admin'         where id = '{me}'$$,  'manager cannot change own role'),
  ('mia',  $$update public.profiles set status = 'deactivated'   where id = '{abe}'$$, 'manager cannot deactivate directly'),
  ('mia',  $$update public.profiles set email  = 'x@example.test' where id = '{abe}'$$, 'manager cannot change an email directly'),
  ('dee',  $$update public.profiles set status = 'active'        where id = '{me}'$$,  'deactivated cannot reactivate self'),
  ('ivy',  $$update public.profiles set status = 'active'        where id = '{me}'$$,  'invited cannot activate self')
) as t (who, sql, label);

-- ---- profiles: insert, delete, truncate -----------------------------------------------------------------
select is(tests.run(who, 'aal2', sql), 'err:42501', who || ': ' || label)
from (values
  ('anon', $$insert into public.profiles (id, email, display_name) values (gen_random_uuid(), 'n@example.test', 'N')$$, 'insert'),
  ('abe',  $$insert into public.profiles (id, email, display_name) values (gen_random_uuid(), 'n@example.test', 'N')$$, 'insert'),
  ('mia',  $$insert into public.profiles (id, email, display_name) values (gen_random_uuid(), 'n@example.test', 'N')$$, 'insert'),
  ('anon', $$delete from public.profiles where id = '{abe}'$$, 'delete'),
  ('abe',  $$delete from public.profiles where id = '{me}'$$,  'delete own row'),
  ('mia',  $$delete from public.profiles where id = '{abe}'$$, 'delete'),
  ('anon', 'truncate public.profiles', 'truncate'),
  ('abe',  'truncate public.profiles', 'truncate'),
  ('mia',  'truncate public.profiles', 'truncate')
) as t (who, sql, label);

-- ---- activity_events: select all (five events in the seed) ----------------------------------------------
select is(tests.run(who, aal, 'select * from public.activity_events'), expected, who || ' ' || aal || ': events select all')
from (values
  ('anon', 'aal1', 'err:42501'),
  ('mia',  'aal2', 'ok:5'),     -- the manager reads everything
  ('mia',  'aal1', 'ok:0'),
  ('abe',  'aal2', 'ok:2'),     -- Abe: one event by him, one about him
  ('bea',  'aal2', 'ok:1'),
  ('abe',  'aal1', 'ok:0'),
  ('ivy',  'aal1', 'ok:0'),
  ('tom',  'aal2', 'ok:0'),     -- terms gate
  ('dee',  'aal2', 'ok:0')      -- deactivated: Dee has an event of her own in the seed, and still sees nothing
) as t (who, aal, expected);

-- ---- activity_events: select own (by or about me) -------------------------------------------------------
select is(tests.run(who, aal, $$select * from public.activity_events where actor_id = '{me}' or subject_id = '{me}'$$),
          expected, who || ' ' || aal || ': events select own')
from (values
  ('abe', 'aal2', 'ok:2'), ('abe', 'aal1', 'ok:0'),
  ('mia', 'aal2', 'ok:2'), ('mia', 'aal1', 'ok:0'),
  ('dee', 'aal2', 'ok:0'), ('ivy', 'aal1', 'ok:0')
) as t (who, aal, expected);

-- ---- activity_events: insert, update, delete, truncate by every API role ----------------------------------
select is(tests.run(who, 'aal2', sql), 'err:42501', who || ': events ' || label)
from (values
  ('anon', $$insert into public.activity_events (action, summary) values ('x.y', 'z')$$, 'insert'),
  ('abe',  $$insert into public.activity_events (action, summary) values ('x.y', 'z')$$, 'insert'),
  ('mia',  $$insert into public.activity_events (action, summary) values ('x.y', 'z')$$, 'insert'),
  ('abe',  $$update public.activity_events set summary = 'x'$$, 'update'),
  ('mia',  $$update public.activity_events set summary = 'x'$$, 'update'),
  ('abe',  'delete from public.activity_events', 'delete'),
  ('mia',  'delete from public.activity_events', 'delete'),
  ('mia',  'truncate public.activity_events',     'truncate')
) as t (who, sql, label);

-- ---- notification_preferences: own rows (one row each for mia, abe, bea, dee in the seed) ----------------
select is(tests.run(who, aal, sql), expected, who || ' ' || aal || ': ' || label)
from (values
  ('anon', 'aal1', $$select * from public.notification_preferences where admin_id = '{abe}'$$, 'err:42501', 'select own'),
  ('abe',  'aal2', $$select * from public.notification_preferences where admin_id = '{me}'$$,  'ok:1',      'select own'),
  ('abe',  'aal1', $$select * from public.notification_preferences where admin_id = '{me}'$$,  'ok:0',      'select own'),
  ('mia',  'aal2', $$select * from public.notification_preferences where admin_id = '{me}'$$,  'ok:1',      'select own'),
  ('mia',  'aal1', $$select * from public.notification_preferences where admin_id = '{me}'$$,  'ok:0',      'select own'),
  ('dee',  'aal2', $$select * from public.notification_preferences where admin_id = '{me}'$$,  'ok:0',      'select own (deactivated has a row)'),
  ('ivy',  'aal1', $$select * from public.notification_preferences where admin_id = '{me}'$$,  'ok:0',      'select own'),
  ('abe',  'aal2', 'select * from public.notification_preferences',                              'ok:1',      'select all sees only own'),
  ('mia',  'aal2', 'select * from public.notification_preferences',                              'ok:1',      'manager select all sees only own'),
  ('abe',  'aal2', $$insert into public.notification_preferences (admin_id, key, value) values ('{me}', 'lang', '"en"')$$, 'ok:1',      'insert own'),
  ('mia',  'aal2', $$insert into public.notification_preferences (admin_id, key, value) values ('{me}', 'lang', '"en"')$$, 'ok:1',      'insert own'),
  ('abe',  'aal1', $$insert into public.notification_preferences (admin_id, key, value) values ('{me}', 'lang', '"en"')$$, 'err:42501', 'insert own'),
  ('dee',  'aal2', $$insert into public.notification_preferences (admin_id, key, value) values ('{me}', 'lang', '"en"')$$, 'err:42501', 'insert own'),
  ('ivy',  'aal1', $$insert into public.notification_preferences (admin_id, key, value) values ('{me}', 'lang', '"en"')$$, 'err:42501', 'insert own'),
  ('tom',  'aal2', $$insert into public.notification_preferences (admin_id, key, value) values ('{me}', 'lang', '"en"')$$, 'err:42501', 'insert own (terms gate)'),
  ('anon', 'aal1', $$insert into public.notification_preferences (admin_id, key, value) values ('{abe}', 'lang', '"en"')$$, 'err:42501', 'insert'),
  ('abe',  'aal2', $$update public.notification_preferences set value = '"light"' where admin_id = '{me}'$$, 'ok:1', 'update own'),
  ('abe',  'aal1', $$update public.notification_preferences set value = '"light"' where admin_id = '{me}'$$, 'ok:0', 'update own'),
  ('dee',  'aal2', $$update public.notification_preferences set value = '"light"' where admin_id = '{me}'$$, 'ok:0', 'update own'),
  ('abe',  'aal2', $$delete from public.notification_preferences where admin_id = '{me}'$$, 'ok:1', 'delete own'),
  ('abe',  'aal1', $$delete from public.notification_preferences where admin_id = '{me}'$$, 'ok:0', 'delete own')
) as t (who, aal, sql, expected, label);

-- ---- notification_preferences: other people's rows -------------------------------------------------------
select is(tests.run(who, 'aal2', sql), expected, who || ': ' || label)
from (values
  ('abe', $$select * from public.notification_preferences where admin_id = '{bea}'$$,                    'ok:0',      'cannot read another person''s row'),
  ('mia', $$select * from public.notification_preferences where admin_id = '{abe}'$$,                    'ok:0',      'manager cannot read another person''s row'),
  ('abe', $$update public.notification_preferences set value = '"x"' where admin_id = '{bea}'$$,           'ok:0',      'cannot update another person''s row'),
  ('abe', $$delete from public.notification_preferences where admin_id = '{bea}'$$,                       'ok:0',      'cannot delete another person''s row'),
  ('abe', $$insert into public.notification_preferences (admin_id, key, value) values ('{bea}', 'x', '1')$$, 'err:42501', 'cannot insert for another person'),
  ('mia', $$insert into public.notification_preferences (admin_id, key, value) values ('{abe}', 'x', '1')$$, 'err:42501', 'manager cannot insert for another person')
) as t (who, sql, expected, label);

-- ---- rate_limits and sign_in_lockouts: no API role may do anything (service role only) --------------------
select is(tests.run(who, 'aal2', format(sql, tbl)), 'err:42501', who || ': ' || tbl || ' ' || label)
from (values ('anon'), ('abe'), ('mia'), ('dee')) as w (who)
cross join (values ('public.rate_limits'), ('public.sign_in_lockouts')) as x (tbl)
cross join (values
  ('select * from %s', 'select'),
  ('delete from %s',   'delete'),
  ('truncate %s',      'truncate')
) as o (sql, label);

select is(tests.run(who, 'aal2', sql), 'err:42501', who || ': ' || label)
from (values
  ('anon', $$insert into public.rate_limits (key, window_start) values ('k', now())$$,        'rate_limits insert'),
  ('abe',  $$insert into public.rate_limits (key, window_start) values ('k', now())$$,        'rate_limits insert'),
  ('mia',  $$update public.rate_limits set hits = 0$$,                                         'rate_limits update'),
  ('abe',  $$insert into public.sign_in_lockouts (email_hash) values ('h')$$,                 'sign_in_lockouts insert'),
  ('mia',  $$update public.sign_in_lockouts set failures = 0$$,                               'sign_in_lockouts update')
) as t (who, sql, label);

-- ---- operational_events (two events in the seed) ----------------------------------------------------------
select is(tests.run(who, aal, 'select * from public.operational_events'), expected, who || ' ' || aal || ': operational_events select')
from (values
  ('anon', 'aal1', 'err:42501'),
  ('mia',  'aal2', 'ok:2'),
  ('max',  'aal2', 'ok:2'),
  ('mia',  'aal1', 'ok:0'),
  ('abe',  'aal2', 'ok:0'),
  ('ivy',  'aal1', 'ok:0'),
  ('dee',  'aal2', 'ok:0'),
  ('tom',  'aal2', 'ok:0')      -- terms gate: the manager who has not accepted reads no errors either
) as t (who, aal, expected);

select is(tests.run(who, 'aal2', sql), 'err:42501', who || ': operational_events ' || label)
from (values
  ('anon', $$insert into public.operational_events (severity, source, component, message) values ('error', 'job', 'x', 'm')$$, 'insert'),
  ('abe',  $$insert into public.operational_events (severity, source, component, message) values ('error', 'job', 'x', 'm')$$, 'insert'),
  ('mia',  $$insert into public.operational_events (severity, source, component, message) values ('error', 'job', 'x', 'm')$$, 'insert'),
  ('mia',  $$update public.operational_events set message = 'x'$$, 'update'),
  ('mia',  'delete from public.operational_events',                  'delete'),
  ('mia',  'truncate public.operational_events',                     'truncate')
) as t (who, sql, label);

-- ---- policy_acceptances (ten rows in the seed: mia, max, abe, bea, dee accepted two documents each) --------
select is(tests.run(who, aal, sql), expected, who || ' ' || aal || ': ' || label)
from (values
  ('anon', 'aal1', $$select * from public.policy_acceptances where admin_id = '{abe}'$$, 'err:42501', 'select own'),
  ('abe',  'aal2', $$select * from public.policy_acceptances where admin_id = '{me}'$$,  'ok:2',      'select own'),
  ('abe',  'aal1', $$select * from public.policy_acceptances where admin_id = '{me}'$$,  'ok:0',      'select own'),
  ('mia',  'aal2', $$select * from public.policy_acceptances where admin_id = '{me}'$$,  'ok:2',      'select own'),
  ('dee',  'aal2', $$select * from public.policy_acceptances where admin_id = '{me}'$$,  'ok:0',      'select own (deactivated)'),
  ('ivy',  'aal1', $$select * from public.policy_acceptances where admin_id = '{me}'$$,  'ok:0',      'select own'),
  ('abe',  'aal2', 'select * from public.policy_acceptances',                             'ok:2',      'select all sees only own'),
  ('mia',  'aal2', 'select * from public.policy_acceptances',                             'ok:10',     'manager select all'),
  ('mia',  'aal1', 'select * from public.policy_acceptances',                             'ok:0',      'manager select all, code not verified'),
  ('tom',  'aal2', 'select * from public.policy_acceptances',                             'ok:0',      'manager select all, terms not accepted'),
  ('anon', 'aal1', $$insert into public.policy_acceptances (admin_id, admin_email, document, version) values ('{abe}', 'x', 'terms', '9')$$, 'err:42501', 'insert'),
  ('abe',  'aal2', $$insert into public.policy_acceptances (admin_id, admin_email, document, version) values ('{me}',  'x', 'terms', '9')$$, 'err:42501', 'insert'),
  ('mia',  'aal2', $$insert into public.policy_acceptances (admin_id, admin_email, document, version) values ('{me}',  'x', 'terms', '9')$$, 'err:42501', 'insert'),
  ('abe',  'aal2', $$update public.policy_acceptances set version = '9'$$,                'err:42501', 'update'),
  ('mia',  'aal2', 'delete from public.policy_acceptances',                               'err:42501', 'delete'),
  ('mia',  'aal2', 'truncate public.policy_acceptances',                                  'err:42501', 'truncate')
) as t (who, aal, sql, expected, label);

-- ---- policy_versions: readable by every signed-in person at any stage (the terms screen comes before the code) ---
select is(tests.run(who, aal, 'select * from public.policy_versions'), expected, who || ' ' || aal || ': policy_versions select')
from (values
  ('anon', 'aal1', 'err:42501'),
  ('abe',  'aal2', 'ok:2'), ('abe', 'aal1', 'ok:2'), ('mia', 'aal1', 'ok:2'),
  ('ivy',  'aal1', 'ok:2'), ('tom', 'aal2', 'ok:2'), ('dee', 'aal2', 'ok:2')
) as t (who, aal, expected);

select is(tests.run(who, 'aal2', sql), 'err:42501', who || ': policy_versions ' || label)
from (values
  ('anon', $$update public.policy_versions set current_version = '9'$$, 'update'),
  ('abe',  $$update public.policy_versions set current_version = '9'$$, 'update'),
  ('mia',  $$update public.policy_versions set current_version = '9'$$, 'update'),
  ('mia',  $$insert into public.policy_versions (document, current_version) values ('terms', '9')$$, 'insert'),
  ('mia',  'delete from public.policy_versions', 'delete')
) as t (who, sql, label);

-- ---- Terms gate: a signed-in person who has not accepted the current terms can read only the own profile row ---
select is(tests.run('tom', 'aal2', sql), expected, 'tom (manager, terms not accepted): ' || label)
from (values
  ('select * from public.profiles',                    'ok:1', 'profiles'),
  ('select * from public.activity_events',             'ok:0', 'activity_events'),
  ('select * from public.operational_events',          'ok:0', 'operational_events'),
  ('select * from public.policy_acceptances',          'ok:0', 'policy_acceptances'),
  ('select * from public.notification_preferences',    'ok:0', 'notification_preferences'),
  ('select * from public.policy_versions',             'ok:2', 'policy_versions (the terms screen needs it)')
) as t (sql, expected, label);

select * from finish();
rollback;
