create or replace function public.get_team_challenge_details(p_challenge_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  challenge_row public.team_challenges%rowtype;
  home_team_name text;
  home_role text;
  away_team_name text;
  request_list jsonb;
  windows_list jsonb;
  linked_match_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into challenge_row from public.team_challenges where id=p_challenge_id;
  if not found then return null; end if;
  select name into home_team_name from public.teams where id=challenge_row.home_team_id;
  select member.role into home_role from public.team_members member
    where member.team_id=challenge_row.home_team_id and member.user_id=auth.uid() and member.status='active';
  select team.name into away_team_name from public.challenge_requests request join public.teams team on team.id=request.away_team_id
    join public.team_members member on member.team_id=team.id and member.user_id=auth.uid() and member.status='active'
    where request.challenge_id=p_challenge_id order by request.created_at desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('id',win.id,'starts_at',win.starts_at,'ends_at',win.ends_at)
    order by win.starts_at),'[]'::jsonb) into windows_list from public.challenge_windows win where win.challenge_id=p_challenge_id;
  if home_role='captain' then
    select coalesce(jsonb_agg(jsonb_build_object('id',request.id,'team_name',team.name,'status',request.status)
      order by request.created_at,request.id),'[]'::jsonb) into request_list
    from public.challenge_requests request join public.teams team on team.id=request.away_team_id where request.challenge_id=p_challenge_id;
  else request_list:='[]'::jsonb;
  end if;
  select id into linked_match_id from public.matches where challenge_id=p_challenge_id;
  return jsonb_build_object('id',challenge_row.id,'home_team_id',challenge_row.home_team_id,
    'home_team_name',home_team_name,'viewer_home_role',home_role,'my_team_name',away_team_name,
    'my_request_id',(select request.id from public.challenge_requests request join public.team_members member
      on member.team_id=request.away_team_id and member.user_id=auth.uid() and member.status='active'
      where request.challenge_id=p_challenge_id order by request.created_at desc limit 1),
    'my_request_status',(select request.status from public.challenge_requests request join public.team_members member
      on member.team_id=request.away_team_id and member.user_id=auth.uid() and member.status='active'
      where request.challenge_id=p_challenge_id order by request.created_at desc limit 1),
    'format',challenge_row.format,'city_id',challenge_row.city_id,'area_id',challenge_row.area_id,
    'city_name_en',(select name_en from public.cities where id=challenge_row.city_id),
    'city_name_el',(select name_el from public.cities where id=challenge_row.city_id),
    'area_name_en',(select name_en from public.areas where id=challenge_row.area_id),
    'area_name_el',(select name_el from public.areas where id=challenge_row.area_id),
    'skill_level',challenge_row.skill_level,'note',challenge_row.note,'status',challenge_row.status,
    'windows',windows_list,'requests',request_list,'proposed_starts_at',challenge_row.proposed_starts_at,
    'proposed_area_id',challenge_row.proposed_area_id,'proposed_venue_name',challenge_row.proposed_venue_name,
    'proposed_venue_address',challenge_row.proposed_venue_address,'linked_match_id',linked_match_id);
end;
$$;
