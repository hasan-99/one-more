-- The team lists (directory and "my teams") also return each team's crest design so the app can
-- draw the real crest on the cards. crest_emblem is read through to_jsonb so this still works on a
-- database that has not got the emblem column yet.
drop function public.list_team_directory();
create function public.list_team_directory()
returns table(team_id uuid,name text,city_id uuid,city_name_en text,city_name_el text,description text,member_count integer,created_at timestamptz,
  crest_shape text,crest_color text,crest_pattern text,crest_emblem text)
language sql stable security definer set search_path = ''
as $$
  select team.id,team.name,team.city_id,city.name_en,city.name_el,team.description,
    (select count(*)::integer from public.team_members member where member.team_id=team.id and member.status='active'),
    team.created_at,
    team.crest_shape,team.crest_color,team.crest_pattern,coalesce(to_jsonb(team)->>'crest_emblem','initials')
  from public.teams team join public.cities city on city.id=team.city_id
  where team.status='active'
  order by team.created_at desc,team.id
  limit 100
$$;
revoke all on function public.list_team_directory() from public,anon,authenticated;
grant execute on function public.list_team_directory() to anon,authenticated;

drop function public.get_my_teams();
create function public.get_my_teams()
returns table(team_id uuid,name text,city_id uuid,city_name_en text,city_name_el text,description text,role text,member_count integer,
  crest_shape text,crest_color text,crest_pattern text,crest_emblem text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  return query select team.id,team.name,team.city_id,city.name_en,city.name_el,team.description,member.role,
    (select count(*)::integer from public.team_members active_member where active_member.team_id=team.id and active_member.status='active'),
    team.crest_shape,team.crest_color,team.crest_pattern,coalesce(to_jsonb(team)->>'crest_emblem','initials')
  from public.team_members member join public.teams team on team.id=member.team_id
    join public.cities city on city.id=team.city_id
  where member.user_id=auth.uid() and member.status='active' and team.status='active'
  order by team.name,team.id;
end;
$$;
revoke all on function public.get_my_teams() from public,anon,authenticated;
grant execute on function public.get_my_teams() to authenticated;
