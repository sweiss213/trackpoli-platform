create function public.custom_access_token_hook(event jsonb) returns jsonb
  language plpgsql stable set search_path = '' as $$
declare v_claims jsonb := event -> 'claims'; v_role text; v_status text;
begin
  select role::text, status::text into v_role, v_status
  from public.profiles where id = (event ->> 'user_id')::uuid;
  v_claims := jsonb_set(v_claims, '{app_role}',   to_jsonb(coalesce(v_role, 'none')));
  v_claims := jsonb_set(v_claims, '{app_status}', to_jsonb(coalesce(v_status, 'none')));
  return jsonb_build_object('claims', v_claims);
end $$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, service_role, public;
grant select on public.profiles to supabase_auth_admin;
create policy profiles_auth_admin_read on public.profiles for select to supabase_auth_admin using (true);
