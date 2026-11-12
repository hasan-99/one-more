alter table public.matches rename column private_notes to notes;
alter table public.matches
  add column booking_status text not null default 'not_booked'
    check (booking_status in ('not_booked', 'pending', 'confirmed')),
  add constraint matches_notes_length check (notes is null or char_length(notes) <= 1000);

alter table public.match_position_slots
  add column x_pct numeric(5,2) not null default 50,
  add column y_pct numeric(5,2) not null default 50,
  add constraint match_position_slots_coordinates check (
    x_pct between 0 and 100 and y_pct between 0 and 100
  );

with positions as (
  select id, position_code,
    row_number() over (partition by match_id, position_code order by created_at, id) as position_index,
    count(*) over (partition by match_id, position_code) as position_count
  from public.match_position_slots
)
update public.match_position_slots slot
set x_pct = 50 + (positions.position_index - (positions.position_count + 1) / 2.0) * 18,
    y_pct = case positions.position_code
      when 'forward' then 20 when 'midfielder' then 42 when 'defender' then 64
      when 'goalkeeper' then 86 else 50 end
from positions where positions.id = slot.id;

create table public.match_booking_private_details (
  match_id uuid primary key references public.matches(id) on delete cascade,
  organizer_notes text check (organizer_notes is null or char_length(organizer_notes) <= 1000),
  reference text check (reference is null or char_length(reference) <= 120),
  confirmed_at timestamptz,
  reported_by uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);
alter table public.match_booking_private_details enable row level security;
revoke all on public.match_booking_private_details from public, anon, authenticated;
grant select (match_id, organizer_notes, reference, confirmed_at, reported_by, updated_at)
  on public.match_booking_private_details to authenticated;
create policy "Only match organizers can read private booking details"
  on public.match_booking_private_details for select to authenticated
  using (exists (
    select 1 from public.matches match_row
    where match_row.id = match_id and match_row.organizer_id = (select auth.uid())
  ));
create trigger match_booking_private_details_set_updated_at
  before update on public.match_booking_private_details
  for each row execute function private.set_updated_at();

create policy "Organizers can read their own matches"
  on public.matches for select to authenticated
  using (organizer_id = (select auth.uid()));

create policy "Organizers can read every position on their own matches"
  on public.match_position_slots for select to authenticated
  using (exists (
    select 1 from public.matches match_row
    where match_row.id = match_id and match_row.organizer_id = (select auth.uid())
  ));

create function private.guard_match_edit_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  active_count integer := 0;
  open_count integer := 0;
begin
  if new.event_status = 'published' and new.starts_at <= now() then
    raise exception 'published_match_must_be_future' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    select count(*) into active_count from public.match_participants
      where match_id = old.id and status = 'active';
    select count(*) into open_count from public.match_position_slots
      where match_id = old.id and status = 'open';
  end if;
  if active_count + new.reserved_guest_slots > 2 * new.side_size then
    raise exception 'reservations_exceed_match_capacity' using errcode = '23514';
  end if;
  if open_count > 2 * new.side_size - new.reserved_guest_slots - active_count then
    raise exception 'position_slots_exceed_free_spots' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_match_edit_capacity() from public, anon, authenticated;
create trigger matches_edit_capacity_guard
  before insert or update on public.matches
  for each row execute function private.guard_match_edit_capacity();

create function private.is_match_organizer(p_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches match_row
    where match_row.id = p_match_id and match_row.organizer_id = auth.uid()
  )
$$;
revoke all on function private.is_match_organizer(uuid) from public, anon, authenticated;
grant execute on function private.is_match_organizer(uuid) to anon, authenticated;

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
  m.created_at,
  m.notes,
  m.booking_status,
  private.is_match_organizer(m.id) as is_organizer
from public.matches m
join public.cities c on c.id = m.city_id
join public.areas a on a.id = m.area_id and a.city_id = m.city_id
left join private.match_active_player_counts() p on p.match_id = m.id
left join lateral (
  select jsonb_agg(
    jsonb_build_object('id', slot.id, 'position', slot.position_code,
      'x_pct', slot.x_pct, 'y_pct', slot.y_pct)
    order by slot.created_at, slot.id
  ) as open_positions
  from (
    select candidate.id, candidate.position_code, candidate.x_pct, candidate.y_pct, candidate.created_at
    from public.match_position_slots candidate
    where candidate.match_id = m.id and candidate.status = 'open'
    order by candidate.created_at, candidate.id
    limit greatest(0, (2 * m.side_size) - m.reserved_guest_slots - coalesce(p.active_players, 0))
  ) slot
) s on true
where m.event_status = 'published' and m.starts_at > now();
grant select on public.match_discovery to anon, authenticated;

create function public.create_match_with_positions(
  p_match jsonb,
  p_positions jsonb,
  p_booking jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_match_id uuid;
  position_item jsonb;
  position_count integer;
  side_value smallint;
  reserved_value smallint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.onboarding_complete
  ) then raise exception 'verified_profile_required' using errcode = '42501'; end if;
  if jsonb_typeof(p_positions) <> 'array' then
    raise exception 'positions_must_be_array' using errcode = '22023';
  end if;
  side_value := (p_match ->> 'side_size')::smallint;
  reserved_value := coalesce((p_match ->> 'reserved_guest_slots')::smallint, 0);
  select count(*)::integer into position_count from jsonb_array_elements(p_positions);
  if position_count > 2 * side_value - reserved_value then
    raise exception 'position_slots_exceed_free_spots' using errcode = '23514';
  end if;

  insert into public.matches (
    organizer_id, title, side_size, city_id, area_id, venue_display_name, venue_address,
    starts_at, duration_minutes, skill_level, price_eur, reserved_guest_slots,
    event_status, notes, booking_status
  ) values (
    auth.uid(), btrim(p_match ->> 'title'), side_value,
    (p_match ->> 'city_id')::uuid, (p_match ->> 'area_id')::uuid,
    btrim(p_match ->> 'venue_display_name'), btrim(p_match ->> 'venue_address'),
    (p_match ->> 'starts_at')::timestamptz,
    (p_match ->> 'duration_minutes')::smallint,
    nullif(p_match ->> 'skill_level', ''),
    coalesce(nullif(p_match ->> 'price_eur', '')::numeric, 0), reserved_value,
    coalesce(p_match ->> 'event_status', 'draft'),
    nullif(btrim(p_match ->> 'notes'), ''),
    coalesce(p_match ->> 'booking_status', 'not_booked')
  ) returning id into created_match_id;

  for position_item in select value from jsonb_array_elements(p_positions) loop
    if position_item ->> 'position' not in ('goalkeeper', 'defender', 'midfielder', 'forward', 'any') then
      raise exception 'invalid_position' using errcode = '22023';
    end if;
    insert into public.match_position_slots(match_id, position_code, x_pct, y_pct)
    values (
      created_match_id, position_item ->> 'position',
      coalesce((position_item ->> 'x_pct')::numeric, 50),
      coalesce((position_item ->> 'y_pct')::numeric, 50)
    );
  end loop;

  if coalesce(nullif(btrim(p_booking ->> 'organizer_notes'), ''),
      nullif(btrim(p_booking ->> 'reference'), '')) is not null then
    insert into public.match_booking_private_details(match_id, organizer_notes, reference, confirmed_at, reported_by)
    values (
      created_match_id,
      nullif(btrim(p_booking ->> 'organizer_notes'), ''),
      nullif(btrim(p_booking ->> 'reference'), ''),
      case when (p_match ->> 'booking_status') = 'confirmed' then now() else null end,
      auth.uid()
    );
  end if;
  return created_match_id;
end;
$$;

create function public.update_match_with_positions(
  p_match_id uuid,
  p_match jsonb,
  p_positions jsonb,
  p_booking jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  position_item jsonb;
  position_count integer;
  side_value smallint;
  reserved_value smallint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.profiles profile
    where profile.id = auth.uid() and profile.onboarding_complete
  ) then raise exception 'verified_profile_required' using errcode = '42501'; end if;
  perform 1 from public.matches where id = p_match_id and organizer_id = auth.uid() for update;
  if not found then raise exception 'match_not_owned' using errcode = '42501'; end if;
  if jsonb_typeof(p_positions) <> 'array' then
    raise exception 'positions_must_be_array' using errcode = '22023';
  end if;
  side_value := (p_match ->> 'side_size')::smallint;
  reserved_value := coalesce((p_match ->> 'reserved_guest_slots')::smallint, 0);
  select count(*)::integer into position_count from jsonb_array_elements(p_positions);
  if position_count > 2 * side_value - reserved_value - (
    select count(*) from public.match_participants where match_id = p_match_id and status = 'active'
  ) then
    raise exception 'position_slots_exceed_free_spots' using errcode = '23514';
  end if;

  delete from public.match_position_slots where match_id = p_match_id and status = 'open';
  update public.matches set
    title = btrim(p_match ->> 'title'),
    side_size = side_value,
    city_id = (p_match ->> 'city_id')::uuid,
    area_id = (p_match ->> 'area_id')::uuid,
    venue_display_name = btrim(p_match ->> 'venue_display_name'),
    venue_address = btrim(p_match ->> 'venue_address'),
    starts_at = (p_match ->> 'starts_at')::timestamptz,
    duration_minutes = (p_match ->> 'duration_minutes')::smallint,
    skill_level = nullif(p_match ->> 'skill_level', ''),
    price_eur = coalesce(nullif(p_match ->> 'price_eur', '')::numeric, 0),
    reserved_guest_slots = reserved_value,
    event_status = coalesce(p_match ->> 'event_status', 'draft'),
    notes = nullif(btrim(p_match ->> 'notes'), ''),
    booking_status = coalesce(p_match ->> 'booking_status', 'not_booked')
  where id = p_match_id;

  for position_item in select value from jsonb_array_elements(p_positions) loop
    if position_item ->> 'position' not in ('goalkeeper', 'defender', 'midfielder', 'forward', 'any') then
      raise exception 'invalid_position' using errcode = '22023';
    end if;
    insert into public.match_position_slots(match_id, position_code, x_pct, y_pct)
    values (
      p_match_id, position_item ->> 'position',
      coalesce((position_item ->> 'x_pct')::numeric, 50),
      coalesce((position_item ->> 'y_pct')::numeric, 50)
    );
  end loop;

  if coalesce(nullif(btrim(p_booking ->> 'organizer_notes'), ''),
      nullif(btrim(p_booking ->> 'reference'), '')) is not null then
    insert into public.match_booking_private_details(match_id, organizer_notes, reference, confirmed_at, reported_by)
    values (
      p_match_id,
      nullif(btrim(p_booking ->> 'organizer_notes'), ''),
      nullif(btrim(p_booking ->> 'reference'), ''),
      case when (p_match ->> 'booking_status') = 'confirmed' then now() else null end,
      auth.uid()
    ) on conflict (match_id) do update set
      organizer_notes = excluded.organizer_notes,
      reference = excluded.reference,
      confirmed_at = excluded.confirmed_at,
      reported_by = excluded.reported_by;
  else
    delete from public.match_booking_private_details where match_id = p_match_id;
  end if;
  return p_match_id;
end;
$$;

create function public.cancel_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.matches set event_status = 'cancelled'
  where id = p_match_id and organizer_id = auth.uid() and starts_at > now()
    and event_status in ('draft', 'published');
  if not found then raise exception 'match_not_owned_or_not_cancellable' using errcode = '42501'; end if;
  update public.match_position_slots set status = 'removed'
  where match_id = p_match_id and status = 'open';
end;
$$;

revoke all on function public.create_match_with_positions(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.update_match_with_positions(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.cancel_match(uuid) from public, anon, authenticated;
grant execute on function public.create_match_with_positions(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_match_with_positions(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.cancel_match(uuid) to authenticated;

revoke insert, update, delete on public.matches, public.match_position_slots from public, anon, authenticated;
grant select (
  id, title, side_size, city_id, area_id, venue_id, venue_display_name, venue_address,
  starts_at, duration_minutes, skill_level, price_eur, reserved_guest_slots, event_status,
  created_at, updated_at, notes, booking_status
) on public.matches to anon, authenticated;
grant select (id, match_id, position_code, status, created_at, x_pct, y_pct)
  on public.match_position_slots to anon, authenticated;
