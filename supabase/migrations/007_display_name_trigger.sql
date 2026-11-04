create function public.log_display_name_change() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.display_name is distinct from old.display_name then
    perform public.log_event(new.id, 'profile.display_name_changed', 'admin', new.id::text,
      'Display name changed', jsonb_build_object('from', old.display_name, 'to', new.display_name));
  end if;
  return new;
end $$;
create trigger profiles_log_name_change after update of display_name on public.profiles
  for each row execute function public.log_display_name_change();

-- Server-authoritative auth events (triggers on the auth tables). Kept small; they never raise (any
-- failure is swallowed and written to the operational log); a successful sign-in clears the lockout
-- counter. Triggers on auth.* are not covered by Supabase support guarantees (Phase 1 plan, section 2);
-- 40_auth_triggers.test.sql covers them.
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
