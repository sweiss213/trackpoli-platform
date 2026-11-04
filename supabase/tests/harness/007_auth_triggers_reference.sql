-- REFERENCE implementation of the auth-table triggers that migration 007 describes in words but does not give as
-- SQL (sign-in, password change, two-factor enrolled and removed). Written so the tests for them could be run.
-- The developers write the real migration 007; if it differs, the tests in 40_auth_triggers.test.sql decide.
-- Rules from the plan: keep them small, never raise (swallow and log), clear the lockout counter on sign-in.
create function public.on_auth_user_update() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.last_sign_in_at is distinct from old.last_sign_in_at then
      update public.profiles set last_sign_in_at = new.last_sign_in_at where id = new.id;
      perform public.log_event(new.id, 'auth.sign_in', 'admin', new.id::text, 'Signed in');
      perform public.clear_sign_in_failures(encode(extensions.digest(lower(new.email), 'sha256'), 'hex'));
    end if;
    if new.encrypted_password is distinct from old.encrypted_password then
      perform public.log_event(new.id, 'auth.password_changed', 'admin', new.id::text, 'Password changed');
    end if;
  exception when others then
    perform public.log_error('error', 'auth_hook', 'on_auth_user_update', sqlstate, sqlerrm);
  end;
  return new;
end $$;
create trigger auth_users_events after update on auth.users
  for each row execute function public.on_auth_user_update();

create function public.on_auth_mfa_change() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  begin
    if tg_op = 'DELETE' then
      perform public.log_event(old.user_id, 'auth.mfa_removed', 'admin', old.user_id::text, 'Two-factor device removed');
    elsif new.status = 'verified' and (tg_op = 'INSERT' or old.status is distinct from 'verified') then
      perform public.log_event(new.user_id, 'auth.mfa_enrolled', 'admin', new.user_id::text, 'Two-factor device enrolled');
    end if;
  exception when others then
    perform public.log_error('error', 'auth_hook', 'on_auth_mfa_change', sqlstate, sqlerrm);
  end;
  return coalesce(new, old);
end $$;
create trigger auth_mfa_events after insert or update or delete on auth.mfa_factors
  for each row execute function public.on_auth_mfa_change();
