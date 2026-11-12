create function public.get_match_chat_role(p_match_id uuid)
returns text language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not private.can_access_match_chat(p_match_id) then return null; end if;
  if private.is_match_organizer(p_match_id) then return 'organizer'; end if;
  return 'player';
end;
$$;
revoke all on function public.get_match_chat_role(uuid) from public,anon,authenticated;
grant execute on function public.get_match_chat_role(uuid) to authenticated;
