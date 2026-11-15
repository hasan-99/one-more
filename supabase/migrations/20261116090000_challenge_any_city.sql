-- Challenges can be posted in any city, not only the home team's own city.
-- The area must still belong to the chosen city, and the team must be active.
-- Opponents can ask from any city too: the game is played where the challenge says.

create or replace function public.create_team_challenge(p_home_team_id uuid,p_format smallint,p_city_id uuid,
  p_area_id uuid,p_skill_level text,p_note text,p_windows jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  challenge_id uuid;
  window_item jsonb;
  window_count integer;
  window_start timestamptz;
  window_end timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode='42501';
  end if;
  if not exists(select 1 from public.team_members where team_id=p_home_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  if p_format not in (5,7,8,11) or p_skill_level not in ('beginner','intermediate','advanced') and p_skill_level is not null then
    raise exception 'invalid_challenge_format' using errcode='22023';
  end if;
  if char_length(btrim(coalesce(p_note,'')))>500 then raise exception 'challenge_note_too_long' using errcode='22023'; end if;
  if not exists(select 1 from public.teams where id=p_home_team_id and status='active')
     or not exists(select 1 from public.cities where id=p_city_id) then
    raise exception 'invalid_challenge_city' using errcode='22023';
  end if;
  if not exists(select 1 from public.areas where id=p_area_id and city_id=p_city_id) then raise exception 'invalid_challenge_area' using errcode='22023'; end if;
  if jsonb_typeof(p_windows)<>'array' then raise exception 'invalid_challenge_windows' using errcode='22023'; end if;
  window_count:=jsonb_array_length(p_windows);
  if window_count<1 or window_count>5 then raise exception 'invalid_challenge_windows' using errcode='22023'; end if;
  insert into public.team_challenges(home_team_id,created_by,format,city_id,area_id,skill_level,note)
    values(p_home_team_id,auth.uid(),p_format,p_city_id,p_area_id,p_skill_level,nullif(btrim(coalesce(p_note,'')),''))
    returning id into challenge_id;
  for window_item in select value from jsonb_array_elements(p_windows) loop
    begin
      window_start:=(window_item->>'starts_at')::timestamptz;
      window_end:=(window_item->>'ends_at')::timestamptz;
    exception when others then raise exception 'invalid_challenge_windows' using errcode='22023';
    end;
    if window_start<=now() or window_end<=window_start or window_end-window_start>interval '14 days' then
      raise exception 'invalid_challenge_windows' using errcode='22023';
    end if;
    insert into public.challenge_windows(challenge_id,starts_at,ends_at) values(challenge_id,window_start,window_end);
  end loop;
  return challenge_id;
end;
$$;

create or replace function public.request_team_challenge(p_challenge_id uuid,p_away_team_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  challenge_row public.team_challenges%rowtype;
  request_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.team_members where team_id=p_away_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  select * into challenge_row from public.team_challenges where id=p_challenge_id for update;
  if not found or challenge_row.status<>'open' then raise exception 'challenge_unavailable' using errcode='22023'; end if;
  if p_away_team_id=challenge_row.home_team_id then raise exception 'cannot_challenge_own_team' using errcode='22023'; end if;
  if not exists(select 1 from public.teams where id=p_away_team_id and status='active') then
    raise exception 'challenge_city_mismatch' using errcode='22023';
  end if;
  if not exists(select 1 from public.challenge_windows where challenge_id=p_challenge_id and ends_at>now()) then
    update public.team_challenges set status='expired' where id=p_challenge_id;
    raise exception 'challenge_expired' using errcode='22023';
  end if;
  insert into public.challenge_requests(challenge_id,away_team_id,requested_by)
    values(p_challenge_id,p_away_team_id,auth.uid()) returning id into request_id;
  return request_id;
exception when unique_violation then
  raise exception 'challenge_request_already_active' using errcode='23505';
end;
$$;
