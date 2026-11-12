create or replace function public.confirm_challenge_match(p_challenge_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  challenge_row public.team_challenges%rowtype;
  request_row public.challenge_requests%rowtype;
  home_team public.teams%rowtype;
  away_team public.teams%rowtype;
  created_match_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into challenge_row from public.team_challenges where id=p_challenge_id for update;
  if not found then raise exception 'challenge_unavailable' using errcode='22023'; end if;
  select * into request_row from public.challenge_requests where challenge_id=p_challenge_id and status='accepted' for update;
  if not found or not exists(select 1 from public.team_members where team_id=request_row.away_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  if challenge_row.status='matched' then
    select id into created_match_id from public.matches where challenge_id=p_challenge_id;
    return created_match_id;
  end if;
  if challenge_row.status<>'negotiating' or challenge_row.home_proposed_at is null then
    raise exception 'challenge_slot_not_proposed' using errcode='22023';
  end if;
  if challenge_row.proposed_starts_at<=now() then raise exception 'invalid_challenge_match_slot' using errcode='22023'; end if;
  select * into home_team from public.teams where id=challenge_row.home_team_id;
  select * into away_team from public.teams where id=request_row.away_team_id;
  insert into public.matches(challenge_id,organizer_id,title,side_size,city_id,area_id,venue_display_name,
    venue_address,starts_at,duration_minutes,skill_level,event_status,notes)
  values(p_challenge_id,home_team.captain_id,left(home_team.name || ' vs ' || away_team.name,100),
    challenge_row.format,challenge_row.city_id,challenge_row.proposed_area_id,challenge_row.proposed_venue_name,
    challenge_row.proposed_venue_address,challenge_row.proposed_starts_at,90,challenge_row.skill_level,'published',challenge_row.note)
  returning id into created_match_id;
  update public.team_challenges set status='matched',agreed_starts_at=proposed_starts_at where id=p_challenge_id;
  return created_match_id;
end;
$$;
