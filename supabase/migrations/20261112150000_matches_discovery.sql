create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  city_id uuid not null references public.cities(id) on delete restrict,
  area_id uuid not null,
  address text not null check (char_length(btrim(address)) between 2 and 240),
  latitude double precision,
  longitude double precision,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint venues_area_city_fk foreign key (area_id, city_id)
    references public.areas(id, city_id) on delete restrict,
  constraint venues_coordinates_pair check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  )
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 100),
  side_size smallint not null check (side_size in (5, 7, 8, 11)),
  city_id uuid not null references public.cities(id) on delete restrict,
  area_id uuid not null,
  venue_id uuid references public.venues(id) on delete set null,
  venue_display_name text not null check (char_length(btrim(venue_display_name)) between 2 and 120),
  venue_address text not null check (char_length(btrim(venue_address)) between 2 and 240),
  starts_at timestamptz not null,
  duration_minutes smallint not null check (duration_minutes between 30 and 240),
  skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  price_eur numeric(8,2) not null default 0 check (price_eur >= 0),
  reserved_guest_slots smallint not null default 0 check (reserved_guest_slots >= 0),
  event_status text not null default 'draft' check (event_status in ('draft', 'published', 'cancelled')),
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_area_city_fk foreign key (area_id, city_id)
    references public.areas(id, city_id) on delete restrict,
  constraint matches_guest_reservations_fit check (reserved_guest_slots <= side_size * 2)
);

create table public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  joined_at timestamptz not null default now(),
  unique (match_id, id)
);

create unique index match_participants_one_active_user
  on public.match_participants(match_id, user_id) where status = 'active';

create table public.match_position_slots (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  position_code text not null check (position_code in ('goalkeeper', 'defender', 'midfielder', 'forward', 'any')),
  status text not null default 'open' check (status in ('open', 'filled', 'removed')),
  assigned_participant_id uuid,
  created_at timestamptz not null default now(),
  constraint position_slot_assignee_fk foreign key (match_id, assigned_participant_id)
    references public.match_participants(match_id, id) on delete set null (assigned_participant_id),
  constraint filled_slot_has_assignee check ((status = 'filled') = (assigned_participant_id is not null))
);

create index matches_city_start_status_idx on public.matches(city_id, starts_at, event_status, id);
create index matches_area_start_idx on public.matches(area_id, starts_at, id);
create index matches_format_start_idx on public.matches(side_size, starts_at, id);
create index matches_level_start_idx on public.matches(skill_level, starts_at, id);
create index match_position_slots_open_match_idx on public.match_position_slots(match_id, position_code)
  where status = 'open';
create index match_participants_match_status_idx on public.match_participants(match_id, status);
create index venues_area_idx on public.venues(area_id, name);

create trigger matches_set_updated_at before update on public.matches
for each row execute function private.set_updated_at();

create function public.guard_match_position_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  active_count integer;
  open_count integer;
begin
  select * into match_row from public.matches where id = new.match_id for update;
  if not found then raise exception 'match_not_found' using errcode = '23503'; end if;
  select count(*) into active_count from public.match_participants
    where match_id = new.match_id and status = 'active';
  select count(*) into open_count from public.match_position_slots
    where match_id = new.match_id and status = 'open'
      and (tg_op = 'INSERT' or id <> new.id);
  if new.status = 'open' and open_count + 1 >
     (2 * match_row.side_size - match_row.reserved_guest_slots - active_count) then
    raise exception 'position_slots_exceed_free_spots' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger match_position_capacity_guard
before insert or update on public.match_position_slots
for each row execute function public.guard_match_position_capacity();

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

alter table public.venues enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_position_slots enable row level security;

create policy "Published future matches are publicly discoverable"
on public.matches for select to anon, authenticated
using (event_status = 'published' and starts_at > now());

create policy "Participants see their own reservation records"
on public.match_participants for select to authenticated
using (user_id = (select auth.uid()));

create policy "Public can read positions on published future matches"
on public.match_position_slots for select to anon, authenticated
using (status = 'open' and exists (
  select 1 from public.matches m where m.id = match_id
    and m.event_status = 'published' and m.starts_at > now()
));

create policy "Public can read venues used by published future matches"
on public.venues for select to anon, authenticated
using (exists (
  select 1 from public.matches m where m.venue_id = id
    and m.event_status = 'published' and m.starts_at > now()
));

revoke all on public.venues, public.matches, public.match_participants, public.match_position_slots
  from anon, authenticated;
grant select (id, name, city_id, area_id, address, latitude, longitude) on public.venues to anon, authenticated;
grant select (
  id, title, side_size, city_id, area_id, venue_id, venue_display_name,
  venue_address, starts_at, duration_minutes, skill_level, price_eur, reserved_guest_slots,
  event_status, created_at, updated_at
) on public.matches to anon, authenticated;
grant select (id, match_id, user_id, status, joined_at) on public.match_participants to authenticated;
grant select (id, match_id, position_code, status, created_at) on public.match_position_slots to anon, authenticated;

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
