drop view public.match_discovery;
drop function public.match_active_player_counts();

create function private.match_active_player_counts()
returns table (match_id uuid, active_players integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.match_id, count(*)::integer
  from public.match_participants p
  join public.matches m on m.id = p.match_id
  where p.status = 'active'
    and m.event_status = 'published'
    and m.starts_at > now()
  group by p.match_id
$$;
revoke all on function private.match_active_player_counts() from public, anon, authenticated;
grant execute on function private.match_active_player_counts() to anon, authenticated;

revoke select (organizer_id) on public.matches from anon, authenticated;

create view public.match_discovery with (security_invoker = true) as
select
  m.id,
  m.title,
  m.side_size,
  m.city_id,
  c.name_en as city_name_en,
  c.name_el as city_name_el,
  m.area_id,
  a.name_en as area_name_en,
  a.name_el as area_name_el,
  m.venue_id,
  m.venue_display_name,
  m.venue_address,
  m.starts_at,
  m.duration_minutes,
  m.skill_level,
  m.price_eur,
  m.reserved_guest_slots,
  2 * m.side_size as capacity,
  coalesce(p.active_players, 0)::integer as active_players,
  greatest(0, (2 * m.side_size) - m.reserved_guest_slots - coalesce(p.active_players, 0))::integer as free_spots,
  coalesce(s.open_positions, '[]'::jsonb) as open_positions,
  m.created_at
from public.matches m
join public.cities c on c.id = m.city_id
join public.areas a on a.id = m.area_id and a.city_id = m.city_id
left join private.match_active_player_counts() p on p.match_id = m.id
left join lateral (
  select jsonb_agg(jsonb_build_object('id', slot.id, 'position', slot.position_code) order by slot.created_at, slot.id) as open_positions
  from public.match_position_slots slot where slot.match_id = m.id and slot.status = 'open'
) s on true;
grant select on public.match_discovery to anon, authenticated;
comment on view public.match_discovery is
  'Public, RLS-invoker discovery projection. Deliberately omits organizer identity and private notes.';

create index match_participants_user_idx on public.match_participants(user_id);
create index match_position_slots_assignee_idx on public.match_position_slots(match_id, assigned_participant_id);
create index matches_area_city_idx on public.matches(area_id, city_id);
create index matches_organizer_idx on public.matches(organizer_id);
create index matches_venue_idx on public.matches(venue_id);
create index venues_area_city_idx on public.venues(area_id, city_id);
create index venues_city_idx on public.venues(city_id);
create index venues_created_by_idx on public.venues(created_by);
