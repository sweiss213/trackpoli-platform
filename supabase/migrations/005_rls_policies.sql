alter table public.profiles enable row level security;

-- Two-factor for everyone (Q-1-01): every policy except profiles_select_own requires aal2.
-- Before a user has verified a code they can read only their own profile row.
-- profiles: read
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()) and status <> 'deactivated');
create policy profiles_select_manager on public.profiles for select to authenticated
  using ((select public.is_manager()) and (select public.is_aal2()));

-- profiles: a user may change only their own display name; everything else goes through Edge Functions
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
create policy profiles_update_own_name on public.profiles for update to authenticated
  using (id = (select auth.uid()) and status = 'active' and (select public.is_aal2()))
  with check (id = (select auth.uid()));

-- activity_events: managers read all; everyone reads events about or by themselves
create policy events_select_manager on public.activity_events for select to authenticated
  using ((select public.is_manager()) and (select public.is_aal2()));
create policy events_select_own on public.activity_events for select to authenticated
  using ((select public.is_aal2()) and (select public.current_admin_role()) is not null
         and (actor_id = (select auth.uid())
         or (subject_type = 'admin' and subject_id = (select auth.uid())::text)));

-- notification_preferences: own rows only, active users only
create policy prefs_own on public.notification_preferences for all to authenticated
  using (admin_id = (select auth.uid()) and (select public.is_aal2()) and (select public.current_admin_role()) is not null)
  with check (admin_id = (select auth.uid()) and (select public.is_aal2()) and (select public.current_admin_role()) is not null);
