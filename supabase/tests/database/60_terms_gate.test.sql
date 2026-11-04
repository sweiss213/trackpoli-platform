-- The terms gate over time: accepting unlocks, a new version locks again, and a half acceptance is not enough.
begin;
select plan(15);

select is(tests.val('tom', 'aal2', 'select count(*)::text from public.profiles'), 'val:1', 'before accepting, a manager sees only their own profile row');
select is(tests.val('tom', 'aal2', 'select count(*)::text from public.activity_events'), 'val:0', 'and no events');
select is(tests.val('tom', 'aal1', 'select count(*)::text from public.policy_versions'), 'val:2', 'but can read the policy versions, even before two-factor');

-- accept only one of the two documents: still gated
insert into public.policy_acceptances (admin_id, admin_email, document, version) values (tests.uid('tom'), 'tom@example.test', 'terms', '0');
select is(tests.val('tom', 'aal2', 'select public.has_accepted_current_policies()::text'), 'val:false', 'accepting only the terms is not enough');
select is(tests.val('tom', 'aal2', 'select count(*)::text from public.profiles'), 'val:1', 'so the gate stays shut');

-- accept the other
insert into public.policy_acceptances (admin_id, admin_email, document, version) values (tests.uid('tom'), 'tom@example.test', 'privacy', '0');
select is(tests.val('tom', 'aal2', 'select public.has_accepted_current_policies()::text'), 'val:true', 'accepting both opens the gate');
select is(tests.val('tom', 'aal2', 'select count(*)::text from public.profiles'), 'val:7', 'and the manager sees all seven profiles');
select is(tests.val('tom', 'aal2', 'select count(*)::text from public.operational_events'), 'val:2', 'and the operational log');

-- publish version 1 of the terms: everyone is gated again until they accept it
update public.policy_versions set current_version = '1' where document = 'terms';
select is(tests.val('mia', 'aal2', 'select public.has_accepted_current_policies()::text'), 'val:false', 'a new version closes the gate for people who accepted the old one');
select is(tests.val('mia', 'aal2', 'select count(*)::text from public.profiles'), 'val:1', 'a manager is back to their own row');
select is(tests.val('abe', 'aal2', 'select count(*)::text from public.notification_preferences'), 'val:0', 'preferences are hidden too');

insert into public.policy_acceptances (admin_id, admin_email, document, version) values (tests.uid('mia'), 'mia@example.test', 'terms', '1');
select is(tests.val('mia', 'aal2', 'select count(*)::text from public.profiles'), 'val:7', 'accepting the new version reopens it');
select is((select count(*)::int from public.policy_acceptances where admin_id = tests.uid('mia') and document = 'terms'), 2, 'the old acceptance is kept as history');

-- the check is per person
select is(tests.val('max', 'aal2', 'select count(*)::text from public.profiles'), 'val:1', 'another person is not opened by it');

-- anon has the helper but it says false
select is(tests.val('anon', 'aal1', 'select public.has_accepted_current_policies()::text'), 'val:false', 'anon has not accepted anything');

select * from finish();
rollback;
