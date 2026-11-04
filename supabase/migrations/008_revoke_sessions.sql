create function public.revoke_user_sessions(p_user uuid) returns void
  language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = p_user $$;
revoke all on function public.revoke_user_sessions from public, anon, authenticated;
grant execute on function public.revoke_user_sessions to service_role;
