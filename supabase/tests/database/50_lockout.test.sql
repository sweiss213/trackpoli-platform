-- Sign-in lockout (migration 010): 5 failures in 15 minutes pause sign-in; each further pause doubles, capped at 4 hours.
-- Attempts-remaining and the DB-owned threshold are migration 011 (ADR-0007).
begin;
select plan(27);

select is((select public.sign_in_paused_until('h1')), null, 'a never-seen address is not paused');
select is((select count(*)::int from (select public.record_sign_in_failure('h1') from generate_series(1, 4)) s), 4, 'four failures run');
select is((select public.sign_in_paused_until('h1')), null, 'four failures do not pause');
select is((select public.record_sign_in_failure('h1')), now() + interval '15 minutes', 'the fifth failure pauses for 15 minutes');
select is((select public.sign_in_paused_until('h1')), now() + interval '15 minutes', 'and sign_in_paused_until reports it');
select is((select public.record_sign_in_failure('h1')), now() + interval '15 minutes', 'a failure during a pause does not extend it');
select is((select strikes from public.sign_in_lockouts where email_hash = 'h1'), 1, 'one strike so far');

-- the pause ends, the next five failures double it
update public.sign_in_lockouts set locked_until = now() - interval '1 second' where email_hash = 'h1';
select is((select public.sign_in_paused_until('h1')), null, 'an expired pause no longer blocks');
select public.record_sign_in_failure('h1') from generate_series(1, 4);
select is((select public.record_sign_in_failure('h1')), now() + interval '30 minutes', 'the second pause is 30 minutes');
update public.sign_in_lockouts set locked_until = now() - interval '1 second' where email_hash = 'h1';
select public.record_sign_in_failure('h1') from generate_series(1, 4);
select is((select public.record_sign_in_failure('h1')), now() + interval '60 minutes', 'the third pause is 60 minutes');

-- the cap
update public.sign_in_lockouts set locked_until = now() - interval '1 second', strikes = 10 where email_hash = 'h1';
select public.record_sign_in_failure('h1') from generate_series(1, 4);
select is((select public.record_sign_in_failure('h1')), now() + interval '4 hours', 'the pause never exceeds 4 hours');

-- failures older than 15 minutes do not count
select public.record_sign_in_failure('h2') from generate_series(1, 4);
update public.sign_in_lockouts set window_start = now() - interval '16 minutes' where email_hash = 'h2';
select is((select public.record_sign_in_failure('h2')), null, 'a fifth failure after the window closed starts a new count');
select is((select failures from public.sign_in_lockouts where email_hash = 'h2'), 1, 'and the count restarts at one');

-- strikes are forgotten after a quiet day
update public.sign_in_lockouts set strikes = 3, updated_at = now() - interval '25 hours', window_start = now() - interval '25 hours' where email_hash = 'h2';
select public.record_sign_in_failure('h2') from generate_series(1, 4);
select is((select public.record_sign_in_failure('h2')), now() + interval '15 minutes', 'after 24 quiet hours the pause is back to 15 minutes');

-- clearing
select public.clear_sign_in_failures('h1');
select is((select count(*)::int from public.sign_in_lockouts where email_hash = 'h1'), 0, 'clear removes the row');
select is((select public.sign_in_paused_until('h1')), null, 'and the address is free');

-- attempts remaining is owned and computed by the DB from its own threshold (migration 011, ADR-0007)
select is((select public.sign_in_lock_threshold()), 5, 'the lockout threshold is five');
select is((select public.sign_in_attempts_remaining('h3')), 5, 'a never-seen address has all five attempts');
select public.record_sign_in_failure('h3') from generate_series(1, 2);
select is((select public.sign_in_attempts_remaining('h3')), 3, 'two failures leave three attempts');
select public.record_sign_in_failure('h3') from generate_series(1, 2);
select is((select public.sign_in_attempts_remaining('h3')), 1, 'four failures leave one attempt');

-- who may call
select is(tests.val(w, 'aal2', $$select public.record_sign_in_failure('x')::text$$), e, w || ' calling record_sign_in_failure')
from (values ('anon', 'err:42501'), ('abe', 'err:42501'), ('mia', 'err:42501'), ('service', 'val:null')) as t (w, e);
select is(tests.val(w, 'aal2', 'select count(*)::text from public.sign_in_lockouts'), 'err:42501', w || ' cannot read the lockout table')
from (values ('anon'), ('abe'), ('mia')) as t (w);

select * from finish();
rollback;
