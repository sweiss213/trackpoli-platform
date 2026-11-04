create function public.guard_last_manager() returns trigger
  language plpgsql set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('profiles_manager_guard'));
  if tg_op = 'DELETE' then
    if old.role = 'admin_manager' and old.status = 'active'
       and not exists (select 1 from public.profiles
                       where role = 'admin_manager' and status = 'active' and id <> old.id) then
      raise exception 'last_admin_manager' using errcode = 'P0001';
    end if;
    return old;
  end if;
  if old.role = 'admin_manager' and old.status = 'active'
     and (new.role <> 'admin_manager' or new.status <> 'active')
     and not exists (select 1 from public.profiles
                     where role = 'admin_manager' and status = 'active' and id <> old.id) then
    raise exception 'last_admin_manager' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger profiles_guard_last_manager
  before update or delete on public.profiles
  for each row execute function public.guard_last_manager();
