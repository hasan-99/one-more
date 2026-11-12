create or replace view public.match_discovery with (security_invoker = true) as
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
  select jsonb_agg(
    jsonb_build_object('id', slot.id, 'position', slot.position_code)
    order by slot.created_at, slot.id
  ) as open_positions
  from (
    select candidate.id, candidate.position_code, candidate.created_at
    from public.match_position_slots candidate
    where candidate.match_id = m.id and candidate.status = 'open'
    order by candidate.created_at, candidate.id
    limit greatest(0, (2 * m.side_size) - m.reserved_guest_slots - coalesce(p.active_players, 0))
  ) slot
) s on true;

grant select on public.match_discovery to anon, authenticated;
