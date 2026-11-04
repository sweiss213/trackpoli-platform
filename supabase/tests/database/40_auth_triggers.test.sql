-- What happens in our tables when the auth service changes its own tables (migration 007).
-- Uses the reference triggers in tests/harness/007_auth_triggers_reference.sql until the real migration exists.
begin;
select plan(13);

update auth.users set last_sign_in_at = '2026-01-02 03:04:05+00' where id = tests.uid('abe');
select is((select last_sign_in_at from public.profiles where id = tests.uid('abe')), '2026-01-02 03:04:05+00'::timestamptz, 'a sign-in is copied to the profile');
select is((select count(*)::int from public.activity_events where action = 'auth.sign_in' and actor_id = tests.uid('abe')), 2, 'a sign-in writes an event (the seed already holds one)');
select is((select actor_name from public.activity_events where action = 'auth.sign_in' order by id desc limit 1), 'Abe Admin', 'the sign-in event holds the name');

-- the lockout counter is cleared by a successful sign-in
select public.record_sign_in_failure(encode(extensions.digest('abe@example.test', 'sha256'), 'hex'));
select is((select count(*)::int from public.sign_in_lockouts), 1, 'one failure is recorded');
update auth.users set last_sign_in_at = '2026-01-03 00:00:00+00' where id = tests.uid('abe');
select is((select count(*)::int from public.sign_in_lockouts), 0, 'a successful sign-in clears the failure counter');

-- an unrelated update of auth.users writes nothing
create temp table before_n as select count(*) n from public.activity_events;
update auth.users set raw_user_meta_data = '{"x":1}' where id = tests.uid('bea');
select is((select count(*) from public.activity_events), (select n from before_n), 'an update that is not a sign-in or password change writes no event');

-- password change
update auth.users set encrypted_password = 'new-hash' where id = tests.uid('bea');
select is((select count(*)::int from public.activity_events where action = 'auth.password_changed' and actor_id = tests.uid('bea')), 1, 'a password change writes an event');
select is((select count(*)::int from public.activity_events where details::text like '%new-hash%' or summary like '%new-hash%'), 0, 'the hash is never written to the log');

-- two-factor
insert into auth.mfa_factors (id, user_id, status) values (gen_random_uuid(), tests.uid('bea'), 'unverified');
select is((select count(*)::int from public.activity_events where action = 'auth.mfa_enrolled'), 0, 'an unverified factor is not an enrolment');
update auth.mfa_factors set status = 'verified' where user_id = tests.uid('bea');
select is((select count(*)::int from public.activity_events where action = 'auth.mfa_enrolled' and actor_id = tests.uid('bea')), 1, 'verifying a factor writes an enrolment event');
delete from auth.mfa_factors where user_id = tests.uid('bea');
select is((select count(*)::int from public.activity_events where action = 'auth.mfa_removed' and actor_id = tests.uid('bea')), 1, 'removing a factor writes a removal event');

-- the triggers never block the auth service: a failure inside is swallowed and logged
alter function public.log_event(uuid,text,text,text,text,jsonb,inet,uuid) rename to log_event_real;
create function public.log_event(uuid,text,text,text,text,jsonb default '{}', inet default null, uuid default null)
  returns bigint language plpgsql as $$ begin raise exception 'boom'; end $$;
select lives_ok($$update auth.users set last_sign_in_at = '2026-02-01+00' where id = tests.uid('bea')$$, 'a failing log_event does not block sign-in');
select is((select count(*)::int from public.operational_events where component = 'on_auth_user_update'), 1, 'the failure is written to the operational log');

select * from finish();
rollback;
