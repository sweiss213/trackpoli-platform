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
