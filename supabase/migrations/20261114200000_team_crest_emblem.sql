-- Team crest emblem: an optional simple icon drawn on the crest instead of the initials.
alter table public.teams
  add column crest_emblem text not null default 'initials'
    check (crest_emblem in ('initials', 'ball', 'bolt', 'star', 'crown'));

-- Replace the 8-argument function: keeping both signatures would make calls ambiguous.
drop function public.create_team_with_design(text, uuid, uuid, text, text, text, smallint, boolean);

create function public.create_team_with_design(
  p_name text,
  p_city_id uuid,
  p_area_id uuid,
  p_crest_shape text,
  p_crest_color text,
  p_crest_pattern text,
  p_format smallint,
  p_open_to_players boolean,
  p_crest_emblem text default 'initials'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  team_id uuid;
  clean_name text := btrim(coalesce(p_name, ''));
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.profiles where id = auth.uid() and onboarding_complete
  ) then
    raise exception 'verified_profile_required' using errcode = '42501';
  end if;
  if char_length(clean_name) not between 2 and 24 then
    raise exception 'invalid_team_name' using errcode = '22023';
  end if;
  if not exists (select 1 from public.areas where id = p_area_id and city_id = p_city_id) then
    raise exception 'area_not_found' using errcode = '22023';
  end if;
  if p_crest_shape is null or p_crest_shape not in ('shield', 'round', 'hex') then
    raise exception 'invalid_crest_shape' using errcode = '22023';
  end if;
  if p_crest_color is null or p_crest_color not in ('#cfff4a', '#f2f5ec', '#ffa94d', '#5cc8ff', '#ff8fc0', '#b79cff') then
    raise exception 'invalid_crest_color' using errcode = '22023';
  end if;
  if p_crest_pattern is null or p_crest_pattern not in ('plain', 'stripes', 'half') then
    raise exception 'invalid_crest_pattern' using errcode = '22023';
  end if;
  if p_crest_emblem is null or p_crest_emblem not in ('initials', 'ball', 'bolt', 'star', 'crown') then
    raise exception 'invalid_crest_emblem' using errcode = '22023';
  end if;
  if p_format is null or p_format not in (5, 7, 8, 11) then
    raise exception 'invalid_team_format' using errcode = '22023';
  end if;
  if p_open_to_players is null then
    raise exception 'invalid_recruiting_preference' using errcode = '22023';
  end if;

  insert into public.teams (
    captain_id, name, city_id, home_area_id, crest_shape, crest_color,
    crest_pattern, crest_emblem, preferred_format, open_to_players
  ) values (
    auth.uid(), clean_name, p_city_id, p_area_id, p_crest_shape, p_crest_color,
    p_crest_pattern, p_crest_emblem, p_format, p_open_to_players
  ) returning id into team_id;

  insert into public.team_members (team_id, user_id, role, status)
    values (team_id, auth.uid(), 'captain', 'active');
  return team_id;
end;
$$;

revoke all on function public.create_team_with_design(text, uuid, uuid, text, text, text, smallint, boolean, text)
  from public, anon;
grant execute on function public.create_team_with_design(text, uuid, uuid, text, text, text, smallint, boolean, text)
  to authenticated;
