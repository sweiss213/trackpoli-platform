-- The last-manager guard (migration 002) and the append-only rules (003, 009).
-- Run as the owner (the session's own role), because these are rules about the table, not about a caller;
-- the service-role cases use tests.run so they run as service_role.
begin;
select plan(46);

-- ============ last Administrator Manager guard ==========================================================
-- The seed has three active managers: mia, max and tom.
select lives_ok($$update public.profiles set role = 'admin' where id = tests.uid('tom')$$,
  'with three managers, one can be demoted');
select lives_ok($$update public.profiles set status = 'deactivated' where id = tests.uid('max')$$,
  'with two managers, one can be deactivated');
-- Mia is now the only active manager (tom is an Administrator, max is deactivated).
select throws_ok($$update public.profiles set role = 'admin' where id = tests.uid('mia')$$,
  'P0001', 'last_admin_manager', 'the only manager cannot be demoted');
select throws_ok($$update public.profiles set status = 'deactivated' where id = tests.uid('mia')$$,
  'P0001', 'last_admin_manager', 'the only manager cannot be deactivated');
select throws_ok($$update public.profiles set status = 'invited' where id = tests.uid('mia')$$,
  'P0001', 'last_admin_manager', 'the only manager cannot be moved to any other status');
select throws_ok($$delete from public.profiles where id = tests.uid('mia')$$,
  'P0001', 'last_admin_manager', 'the only manager cannot be deleted (this is what "recreate account" relies on)');
select lives_ok($$update public.profiles set display_name = 'Mia Renamed' where id = tests.uid('mia')$$,
  'the only manager can still change anything that is not role or status');
select lives_ok($$update public.profiles set role = 'admin_manager', status = 'active' where id = tests.uid('mia')$$,
  'setting the same role and status again is not a demotion');
select lives_ok($$delete from public.profiles where id = tests.uid('dee')$$,
  'a deactivated Administrator can be deleted');
-- a deactivated manager does not count as a manager
select is((select count(*)::int from public.profiles where role = 'admin_manager' and status = 'active'), 1,
  'max (deactivated manager) is not counted: exactly one active manager');
-- bring max back; now mia can be demoted, and then max is the last
select lives_ok($$update public.profiles set status = 'active' where id = tests.uid('max')$$, 'a deactivated manager can be reactivated');
select lives_ok($$update public.profiles set role = 'admin' where id = tests.uid('mia')$$, 'with two managers either can be demoted');
select throws_ok($$update public.profiles set role = 'admin' where id = tests.uid('max')$$,
  'P0001', 'last_admin_manager', 'and then the other one is the last');
-- the guard is an ordinary trigger: an Administrator cannot be affected by it
select lives_ok($$update public.profiles set role = 'admin_manager' where id = tests.uid('abe')$$, 'promoting an Administrator is allowed');

-- ============ activity_events is append only ==============================================================
-- Owner (the strongest ordinary role)
select throws_ok($$update public.activity_events set summary = 'x'$$,         'P0001', 'activity_events is append only', 'owner cannot update an event');
select throws_ok($$delete from public.activity_events$$,                         'P0001', 'activity_events is append only', 'owner cannot delete an event');
select throws_ok($$truncate public.activity_events$$,                            'P0001', 'activity_events is append only', 'owner cannot truncate the audit log');
-- Service role (bypasses row-level security, so only the trigger stands in the way)
select is(tests.run('service', 'aal2', $$update public.activity_events set summary = 'x'$$), 'err:P0001', 'service role cannot update an event');
select is(tests.run('service', 'aal2', 'delete from public.activity_events'),                 'err:P0001', 'service role cannot delete an event');
select is(tests.run('service', 'aal2', 'truncate public.activity_events'),                    'err:P0001', 'service role cannot truncate the audit log');
-- even with the purge switch on
select throws_ok($$select set_config('trackpoli.purge', 'on', true); delete from public.activity_events$$,
  'P0001', 'activity_events is append only', 'the purge switch does not open the audit log');
select is((select count(*)::int from public.activity_events where action <> 'profile.display_name_changed'), 5, 'the five seeded events are all still there');

-- ============ operational_events is append only, except the 90-day purge =====================================
insert into public.operational_events (occurred_at, severity, source, component, message)
values (now() - interval '100 days', 'error', 'job', 'old_a', 'old'),
       (now() - interval '91 days',  'error', 'job', 'old_b', 'old'),
       (now() - interval '89 days',  'error', 'job', 'young', 'young');
select throws_ok($$update public.operational_events set message = 'x'$$, 'P0001', 'operational_events is append only', 'owner cannot update an operational event');
select throws_ok($$delete from public.operational_events$$,              'P0001', 'operational_events is append only', 'owner cannot delete an operational event');
select throws_ok($$truncate public.operational_events$$,                 'P0001', 'operational_events is append only', 'owner cannot truncate the operational log');
select is(tests.run('service', 'aal2', $$update public.operational_events set message = 'x'$$), 'err:P0001', 'service role cannot update');
select is(tests.run('service', 'aal2', 'delete from public.operational_events'),                'err:P0001', 'service role cannot delete');
select is(tests.run('service', 'aal2', 'truncate public.operational_events'),                   'err:P0001', 'service role cannot truncate');
select throws_ok($$select set_config('trackpoli.purge', 'on', true); delete from public.operational_events where component = 'young'$$,
  'P0001', 'operational_events is append only', 'even with the purge switch on, a young row cannot be deleted');
select is(tests.val('service', 'aal2', 'select public.purge_operational_events()::text'), 'val:2', 'the purge would remove exactly the two rows older than 90 days');
select is((select public.purge_operational_events()), 2::bigint, 'the purge removes the two rows older than 90 days');
select is((select count(*)::int from public.operational_events where component in ('old_a', 'old_b')), 0, 'the old rows are gone');
select is((select count(*)::int from public.operational_events where component = 'young'), 1, 'the 89-day-old row is kept');
select is((select count(*)::int from public.operational_events where component = 'seed'), 2, 'the seeded rows are kept');
select is(tests.val('abe', 'aal2', 'select public.purge_operational_events()::text'), 'err:42501', 'an Administrator cannot run the purge');
select is(tests.val('mia', 'aal2', 'select public.purge_operational_events()::text'), 'err:42501', 'a manager cannot run the purge');

-- ============ policy_acceptances cannot be changed or deleted =================================================
select throws_ok($$update public.policy_acceptances set version = '9'$$, 'P0001', null, 'owner cannot update an acceptance');
select throws_ok($$delete from public.policy_acceptances$$,              'P0001', null, 'owner cannot delete an acceptance');
select is(tests.run('service', 'aal2', $$update public.policy_acceptances set version = '9'$$), 'err:P0001', 'service role cannot update an acceptance');
select is(tests.run('service', 'aal2', 'delete from public.policy_acceptances'),                 'err:P0001', 'service role cannot delete an acceptance');
select is(tests.run('service', 'aal2', 'truncate public.policy_acceptances'),                    'err:P0001', 'service role cannot truncate the acceptances');
select throws_ok($$truncate public.policy_acceptances$$, 'P0001', null, 'owner cannot truncate the acceptances');
select throws_ok($$select 1/0$$, '22012', null, 'sanity: the test harness reports an ordinary error as such');

-- Phase 3 (migration 019) lets one thing through: the sealing function filling in a new entry's chain columns. The flag that
-- allows it must not be enough to change an entry, and must not allow a delete or a truncate. (These pass before Phase 3 too.)
select is(tests.run('service', 'aal2', $$select set_config('trackpoli.seal', 'on', true); update public.activity_events set summary = 'x'$$), 'err:P0001', 'with the seal flag on, an entry''s content still cannot be changed');
select is(tests.run('service', 'aal2', $$select set_config('trackpoli.seal', 'on', true); delete from public.activity_events$$), 'err:P0001', 'with the seal flag on, an entry still cannot be deleted');
select is(tests.run('service', 'aal2', $$select set_config('trackpoli.seal', 'on', true); truncate public.activity_events$$), 'err:P0001', 'with the seal flag on, the table still cannot be truncated');

select * from finish();
rollback;
