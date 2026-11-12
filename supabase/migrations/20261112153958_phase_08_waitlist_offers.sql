create extension if not exists pg_cron;

alter table public.matches
  add column waitlist_offer_minutes smallint not null default 15
    check (waitlist_offer_minutes between 5 and 60);
grant select (waitlist_offer_minutes) on public.matches to authenticated;

create table public.match_waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'offered', 'accepted', 'declined', 'expired', 'left', 'removed')),
  position_code text check (position_code is null or position_code in ('goalkeeper', 'defender', 'midfielder', 'forward', 'any')),
  queued_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index match_waitlist_one_open_entry
  on public.match_waitlist_entries(match_id, user_id) where status in ('waiting', 'offered');
create index match_waitlist_queue_order_idx
  on public.match_waitlist_entries(match_id, queued_at, id) where status = 'waiting';
create index match_waitlist_user_idx on public.match_waitlist_entries(user_id);
create trigger match_waitlist_entries_set_updated_at before update on public.match_waitlist_entries
  for each row execute function private.set_updated_at();

create table public.match_waitlist_offers (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  entry_id uuid not null references public.match_waitlist_entries(id) on delete cascade,
  status text not null default 'offered'
    check (status in ('offered', 'accepted', 'declined', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_participant_id uuid references public.match_participants(id) on delete set null
);
create unique index match_waitlist_one_offer_per_match
  on public.match_waitlist_offers(match_id) where status = 'offered';
create index match_waitlist_offers_expiry_idx
  on public.match_waitlist_offers(expires_at, match_id) where status = 'offered';
create index match_waitlist_offers_entry_idx on public.match_waitlist_offers(entry_id);
create index match_waitlist_offers_accepted_participant_idx
  on public.match_waitlist_offers(accepted_participant_id) where accepted_participant_id is not null;

alter table public.match_waitlist_entries enable row level security;
alter table public.match_waitlist_offers enable row level security;
revoke all on public.match_waitlist_entries, public.match_waitlist_offers from public, anon, authenticated;
create policy "Waitlist entries are server managed"
  on public.match_waitlist_entries for all to anon, authenticated using (false) with check (false);
create policy "Waitlist offers are server managed"
  on public.match_waitlist_offers for all to anon, authenticated using (false) with check (false);

alter table public.notification_outbox alter column participant_id drop not null;
alter table public.notification_outbox
  add column waitlist_offer_id uuid references public.match_waitlist_offers(id) on delete cascade;
alter table public.notification_outbox drop constraint notification_outbox_event_type_check;
alter table public.notification_outbox add constraint notification_outbox_event_type_check
  check (event_type in (
    'match_join_requested', 'match_join_approved', 'match_join_rejected',
    'match_waitlist_offer', 'match_waitlist_offer_accepted',
    'match_waitlist_offer_declined', 'match_waitlist_offer_expired',
    'match_waitlist_offer_cancelled'
  ));
create index notification_outbox_waitlist_offer_idx
  on public.notification_outbox(waitlist_offer_id) where waitlist_offer_id is not null;

create function private.match_waitlist_offer_counts()
returns table(match_id uuid, reserved_offers integer)
language sql stable security definer set search_path = ''
as $$
  select offer.match_id, count(*)::integer
  from public.match_waitlist_offers offer
  join public.matches match_row on match_row.id = offer.match_id
  where offer.status = 'offered' and offer.expires_at > now()
    and match_row.event_status = 'published' and match_row.starts_at > now()
  group by offer.match_id
$$;
revoke all on function private.match_waitlist_offer_counts() from public, anon, authenticated;
grant execute on function private.match_waitlist_offer_counts() to anon, authenticated;

create or replace view public.match_discovery with (security_invoker = true) as
select
  m.id, m.title, m.side_size, m.city_id, c.name_en as city_name_en, c.name_el as city_name_el,
  m.area_id, a.name_en as area_name_en, a.name_el as area_name_el, m.venue_id,
  m.venue_display_name, m.venue_address, m.starts_at, m.duration_minutes, m.skill_level,
  m.price_eur, m.reserved_guest_slots, 2 * m.side_size as capacity,
  coalesce(p.active_players, 0)::integer as active_players,
  greatest(0, (2 * m.side_size) - m.reserved_guest_slots - coalesce(p.active_players, 0)
    - coalesce(w.reserved_offers, 0))::integer as free_spots,
  coalesce(s.open_positions, '[]'::jsonb) as open_positions, m.created_at, m.notes,
  m.booking_status, private.is_match_organizer(m.id) as is_organizer
from public.matches m
join public.cities c on c.id = m.city_id
join public.areas a on a.id = m.area_id and a.city_id = m.city_id
left join private.match_active_player_counts() p on p.match_id = m.id
left join private.match_waitlist_offer_counts() w on w.match_id = m.id
left join lateral (
  select jsonb_agg(jsonb_build_object('id', slot.id, 'position', slot.position_code,
    'x_pct', slot.x_pct, 'y_pct', slot.y_pct) order by slot.created_at, slot.id) as open_positions
  from (
    select candidate.id, candidate.position_code, candidate.x_pct, candidate.y_pct, candidate.created_at
    from public.match_position_slots candidate
    where candidate.match_id = m.id and candidate.status = 'open'
    order by candidate.created_at, candidate.id
    limit greatest(0, (2 * m.side_size) - m.reserved_guest_slots - coalesce(p.active_players, 0)
      - coalesce(w.reserved_offers, 0))
  ) slot
) s on true
where m.event_status = 'published' and m.starts_at > now();

create or replace function private.guard_match_position_capacity()
returns trigger language plpgsql set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  active_count integer;
  offer_count integer;
  open_count integer;
begin
  select * into match_row from public.matches where id = new.match_id for update;
  if not found then raise exception 'match_not_found' using errcode = '23503'; end if;
  select count(*) into active_count from public.match_participants where match_id = new.match_id and status = 'active';
  select count(*) into offer_count from public.match_waitlist_offers
    where match_id = new.match_id and status = 'offered' and expires_at > now();
  select count(*) into open_count from public.match_position_slots
    where match_id = new.match_id and status = 'open' and (tg_op = 'INSERT' or id <> new.id);
  if new.status = 'open' and open_count + 1 >
      (2 * match_row.side_size - match_row.reserved_guest_slots - active_count - offer_count) then
    raise exception 'position_slots_exceed_free_spots' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_match_position_capacity() from public, anon, authenticated;

create function private.guard_match_waitlist_capacity()
returns trigger language plpgsql set search_path = ''
as $$
declare
  active_count integer;
  offer_count integer;
begin
  if tg_op <> 'UPDATE' then return new; end if;
  select count(*) into active_count from public.match_participants where match_id = old.id and status = 'active';
  select count(*) into offer_count from public.match_waitlist_offers
    where match_id = old.id and status = 'offered' and expires_at > now();
  if active_count + new.reserved_guest_slots + offer_count > 2 * new.side_size then
    raise exception 'reservations_and_waitlist_offers_exceed_capacity' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_match_waitlist_capacity() from public, anon, authenticated;
create trigger matches_waitlist_capacity_guard before update on public.matches
  for each row execute function private.guard_match_waitlist_capacity();

create function private.offer_next_waitlisted(p_match_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  entry_row public.match_waitlist_entries%rowtype;
  active_offer public.match_waitlist_offers%rowtype;
  active_count integer;
  offer_count integer;
  new_offer_id uuid;
begin
  select * into match_row from public.matches where id = p_match_id for update;
  if not found or match_row.event_status <> 'published' or match_row.starts_at <= now() then return null; end if;

  select * into active_offer from public.match_waitlist_offers
    where match_id = p_match_id and status = 'offered' order by created_at limit 1 for update;
  if found and active_offer.expires_at > now() then return active_offer.id; end if;
  if found then
    update public.match_waitlist_offers set status = 'expired' where id = active_offer.id;
    update public.match_waitlist_entries set status = 'expired' where id = active_offer.entry_id and status = 'offered';
    insert into public.notification_outbox(recipient_id, event_type, match_id, waitlist_offer_id)
      select entry.user_id, 'match_waitlist_offer_expired', p_match_id, active_offer.id
      from public.match_waitlist_entries entry where entry.id = active_offer.entry_id;
  end if;

  select count(*) into active_count from public.match_participants
    where match_id = p_match_id and status = 'active';
  select count(*) into offer_count from public.match_waitlist_offers
    where match_id = p_match_id and status = 'offered' and expires_at > now();
  if active_count + match_row.reserved_guest_slots + offer_count >= 2 * match_row.side_size then return null; end if;

  select * into entry_row from public.match_waitlist_entries
    where match_id = p_match_id and status = 'waiting'
    order by queued_at, id limit 1 for update skip locked;
  if not found then return null; end if;
  insert into public.match_waitlist_offers(match_id, entry_id, expires_at)
    values (p_match_id, entry_row.id, now() + make_interval(mins => match_row.waitlist_offer_minutes))
    returning id into new_offer_id;
  update public.match_waitlist_entries set status = 'offered' where id = entry_row.id;
  insert into public.notification_outbox(recipient_id, event_type, match_id, waitlist_offer_id, payload)
    values (entry_row.user_id, 'match_waitlist_offer', p_match_id, new_offer_id,
      jsonb_build_object('expires_at', now() + make_interval(mins => match_row.waitlist_offer_minutes)));
  return new_offer_id;
end;
$$;
revoke all on function private.offer_next_waitlisted(uuid) from public, anon, authenticated;

create or replace function public.request_match_join(p_match_id uuid, p_position_slot_id uuid default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  existing_request_id uuid;
  new_request_id uuid;
  active_count integer;
  offer_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode = '42501';
  end if;
  select * into match_row from public.matches where id = p_match_id for update;
  if not found or match_row.event_status <> 'published' or match_row.starts_at <= now() then
    raise exception 'match_not_open_for_requests' using errcode = '22023';
  end if;
  if match_row.organizer_id = auth.uid() then raise exception 'organizer_cannot_request' using errcode = '42501'; end if;
  if exists (select 1 from public.match_participants where match_id = p_match_id and user_id = auth.uid() and status = 'active') then
    raise exception 'already_joined' using errcode = '22023';
  end if;
  select id into existing_request_id from public.match_participants
    where match_id = p_match_id and user_id = auth.uid() and status = 'pending';
  if existing_request_id is not null then return existing_request_id; end if;
  select count(*) into active_count from public.match_participants where match_id = p_match_id and status = 'active';
  select count(*) into offer_count from public.match_waitlist_offers
    where match_id = p_match_id and status = 'offered' and expires_at > now();
  if active_count + match_row.reserved_guest_slots + offer_count >= 2 * match_row.side_size then
    raise exception 'match_full' using errcode = '23514';
  end if;
  if p_position_slot_id is not null and not exists (
    select 1 from public.match_position_slots where id = p_position_slot_id and match_id = p_match_id and status = 'open'
  ) then raise exception 'position_unavailable' using errcode = '22023'; end if;
  insert into public.match_participants(match_id, user_id, status, requested_position_slot_id)
    values (p_match_id, auth.uid(), 'pending', p_position_slot_id) returning id into new_request_id;
  insert into public.notification_outbox(recipient_id, event_type, match_id, participant_id)
    values (match_row.organizer_id, 'match_join_requested', p_match_id, new_request_id);
  return new_request_id;
end;
$$;

create or replace function public.review_match_join_request(p_match_id uuid, p_participant_id uuid, p_decision text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  request_row public.match_participants%rowtype;
  active_count integer;
  offer_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  select * into match_row from public.matches where id = p_match_id for update;
  if not found or match_row.organizer_id <> auth.uid() then raise exception 'match_not_owned' using errcode = '42501'; end if;
  select * into request_row from public.match_participants where id = p_participant_id and match_id = p_match_id for update;
  if not found then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  if (p_decision = 'approve' and request_row.status = 'active') or (p_decision = 'reject' and request_row.status = 'rejected') then return request_row.status; end if;
  if request_row.status <> 'pending' then raise exception 'request_not_pending' using errcode = '22023'; end if;
  if match_row.event_status <> 'published' or match_row.starts_at <= now() then raise exception 'match_not_open_for_requests' using errcode = '22023'; end if;
  if p_decision = 'approve' then
    select count(*) into active_count from public.match_participants where match_id = p_match_id and status = 'active';
    select count(*) into offer_count from public.match_waitlist_offers where match_id = p_match_id and status = 'offered' and expires_at > now();
    if active_count + match_row.reserved_guest_slots + offer_count >= 2 * match_row.side_size then raise exception 'match_full' using errcode = '23514'; end if;
    update public.match_participants set status = 'active' where id = p_participant_id;
    if request_row.requested_position_slot_id is not null then
      update public.match_position_slots set status = 'filled', assigned_participant_id = p_participant_id
      where id = request_row.requested_position_slot_id and match_id = p_match_id and status = 'open';
    end if;
    insert into public.notification_outbox(recipient_id, event_type, match_id, participant_id)
      values (request_row.user_id, 'match_join_approved', p_match_id, p_participant_id);
    return 'active';
  end if;
  update public.match_participants set status = 'rejected' where id = p_participant_id;
  insert into public.notification_outbox(recipient_id, event_type, match_id, participant_id)
    values (request_row.user_id, 'match_join_rejected', p_match_id, p_participant_id);
  return 'rejected';
end;
$$;

create function public.join_match_waitlist(p_match_id uuid, p_position_code text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  entry_id uuid;
  active_count integer;
  offer_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode = '42501';
  end if;
  if p_position_code is not null and p_position_code not in ('goalkeeper', 'defender', 'midfielder', 'forward', 'any') then
    raise exception 'invalid_position' using errcode = '22023';
  end if;
  select * into match_row from public.matches where id = p_match_id for update;
  if not found or match_row.event_status <> 'published' or match_row.starts_at <= now() then
    raise exception 'match_not_open_for_waitlist' using errcode = '22023';
  end if;
  if match_row.organizer_id = auth.uid() then raise exception 'organizer_cannot_waitlist' using errcode = '42501'; end if;
  if exists (select 1 from public.match_participants where match_id = p_match_id and user_id = auth.uid() and status in ('active','pending')) then
    raise exception 'existing_match_request' using errcode = '22023';
  end if;
  select id into entry_id from public.match_waitlist_entries
    where match_id = p_match_id and user_id = auth.uid() and status in ('waiting','offered');
  if entry_id is not null then return entry_id; end if;
  select count(*) into active_count from public.match_participants where match_id = p_match_id and status = 'active';
  select count(*) into offer_count from public.match_waitlist_offers where match_id = p_match_id and status = 'offered' and expires_at > now();
  if active_count + match_row.reserved_guest_slots + offer_count < 2 * match_row.side_size then
    raise exception 'place_available' using errcode = '22023';
  end if;
  insert into public.match_waitlist_entries(match_id,user_id,position_code)
    values (p_match_id,auth.uid(),p_position_code) returning id into entry_id;
  return entry_id;
end;
$$;

create function public.leave_match_waitlist(p_match_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  entry_row public.match_waitlist_entries%rowtype;
  offer_row public.match_waitlist_offers%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  perform 1 from public.matches where id = p_match_id for update;
  select * into entry_row from public.match_waitlist_entries
    where match_id = p_match_id and user_id = auth.uid() and status in ('waiting','offered') for update;
  if not found then raise exception 'waitlist_entry_not_found' using errcode = 'P0002'; end if;
  if entry_row.status = 'offered' then
    select * into offer_row from public.match_waitlist_offers where entry_id = entry_row.id and status = 'offered' for update;
    if found then
      update public.match_waitlist_offers set status = 'cancelled' where id = offer_row.id;
      insert into public.notification_outbox(recipient_id,event_type,match_id,waitlist_offer_id)
        values (auth.uid(),'match_waitlist_offer_cancelled',p_match_id,offer_row.id);
    end if;
  end if;
  update public.match_waitlist_entries set status = 'left' where id = entry_row.id;
  perform private.offer_next_waitlisted(p_match_id);
  return 'left';
end;
$$;

create function public.leave_match(p_match_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  participant_row public.match_participants%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  perform 1 from public.matches where id = p_match_id and starts_at > now() and event_status = 'published' for update;
  if not found then raise exception 'match_not_open_for_leave' using errcode = '22023'; end if;
  select * into participant_row from public.match_participants
    where match_id = p_match_id and user_id = auth.uid() and status = 'active' for update;
  if not found then raise exception 'participant_not_active' using errcode = '42501'; end if;
  update public.match_participants set status = 'left' where id = participant_row.id;
  update public.match_position_slots set status = 'open', assigned_participant_id = null
    where match_id = p_match_id and assigned_participant_id = participant_row.id and status = 'filled';
  perform private.offer_next_waitlisted(p_match_id);
  return 'left';
end;
$$;

create function public.accept_waitlist_offer(p_offer_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  offer_row public.match_waitlist_offers%rowtype;
  match_row public.matches%rowtype;
  entry_row public.match_waitlist_entries%rowtype;
  participant_id uuid;
  active_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select match_id into participant_id from public.match_waitlist_offers where id = p_offer_id;
  if participant_id is null then raise exception 'waitlist_offer_not_found' using errcode = 'P0002'; end if;
  select * into match_row from public.matches where id = participant_id for update;
  select * into offer_row from public.match_waitlist_offers where id = p_offer_id and match_id = participant_id for update;
  if offer_row.status = 'accepted' and offer_row.accepted_participant_id is not null then return offer_row.accepted_participant_id; end if;
  if not found or offer_row.status <> 'offered' then raise exception 'waitlist_offer_unavailable' using errcode = '22023'; end if;
  select * into entry_row from public.match_waitlist_entries
    where id = offer_row.entry_id and user_id = auth.uid() and status = 'offered' for update;
  if not found then raise exception 'waitlist_offer_not_owned' using errcode = '42501'; end if;
  if offer_row.expires_at <= now() then raise exception 'waitlist_offer_expired' using errcode = '22023'; end if;
  if match_row.event_status <> 'published' or match_row.starts_at <= now() then raise exception 'match_not_open_for_waitlist' using errcode = '22023'; end if;
  select count(*) into active_count from public.match_participants where match_id = participant_id and status = 'active';
  if active_count + match_row.reserved_guest_slots >= 2 * match_row.side_size then raise exception 'match_full' using errcode = '23514'; end if;
  insert into public.match_participants(match_id,user_id,status)
    values (participant_id,auth.uid(),'active') returning id into participant_id;
  if entry_row.position_code is not null then
    update public.match_position_slots set status = 'filled', assigned_participant_id = participant_id
    where id = (select slot.id from public.match_position_slots slot
      where slot.match_id = match_row.id and slot.position_code = entry_row.position_code and slot.status = 'open'
      order by slot.created_at,slot.id limit 1 for update);
  end if;
  update public.match_waitlist_offers set status = 'accepted', accepted_participant_id = participant_id where id = p_offer_id;
  update public.match_waitlist_entries set status = 'accepted' where id = entry_row.id;
  insert into public.notification_outbox(recipient_id,event_type,match_id,participant_id,waitlist_offer_id)
    values (match_row.organizer_id,'match_waitlist_offer_accepted',match_row.id,participant_id,p_offer_id);
  perform private.offer_next_waitlisted(match_row.id);
  return participant_id;
end;
$$;

create function public.decline_waitlist_offer(p_offer_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  match_id uuid;
  offer_row public.match_waitlist_offers%rowtype;
  entry_row public.match_waitlist_entries%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select o.match_id into match_id from public.match_waitlist_offers o where o.id = p_offer_id;
  if match_id is null then raise exception 'waitlist_offer_not_found' using errcode = 'P0002'; end if;
  perform 1 from public.matches where id = match_id for update;
  select * into offer_row from public.match_waitlist_offers where id = p_offer_id for update;
  select * into entry_row from public.match_waitlist_entries where id = offer_row.entry_id and user_id = auth.uid() for update;
  if not found then raise exception 'waitlist_offer_not_owned' using errcode = '42501'; end if;
  if offer_row.status = 'declined' then return 'declined'; end if;
  if offer_row.status <> 'offered' or offer_row.expires_at <= now() then raise exception 'waitlist_offer_unavailable' using errcode = '22023'; end if;
  update public.match_waitlist_offers set status = 'declined' where id = p_offer_id;
  update public.match_waitlist_entries set status = 'declined' where id = entry_row.id;
  insert into public.notification_outbox(recipient_id,event_type,match_id,waitlist_offer_id)
    values (auth.uid(),'match_waitlist_offer_declined',match_id,p_offer_id);
  perform private.offer_next_waitlisted(match_id);
  return 'declined';
end;
$$;

create function public.get_match_waitlist_state(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  entry_row public.match_waitlist_entries%rowtype;
  offer_row public.match_waitlist_offers%rowtype;
  queue_position integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.matches where id = p_match_id and event_status = 'published' and starts_at > now()) then
    raise exception 'match_not_open_for_waitlist' using errcode = '22023';
  end if;
  perform private.offer_next_waitlisted(p_match_id);
  select * into entry_row from public.match_waitlist_entries
    where match_id = p_match_id and user_id = auth.uid()
    order by case status when 'offered' then 0 when 'waiting' then 1 when 'accepted' then 2 else 3 end,
      queued_at desc, id desc limit 1;
  if not found then return null; end if;
  select * into offer_row from public.match_waitlist_offers
    where entry_id = entry_row.id and status = 'offered' and expires_at > now()
    order by created_at desc limit 1;
  if entry_row.status = 'waiting' then
    select count(*)::integer + 1 into queue_position from public.match_waitlist_entries queued
      where queued.match_id = p_match_id and queued.status = 'waiting'
        and (queued.queued_at,queued.id) < (entry_row.queued_at,entry_row.id);
  end if;
  return jsonb_build_object('entry_id',entry_row.id,'status',entry_row.status,
    'queue_position',queue_position,'offer_id',offer_row.id,'expires_at',offer_row.expires_at,
    'position_code',entry_row.position_code);
end;
$$;

create function public.process_expired_waitlist_offers()
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  match_id uuid;
  processed integer := 0;
begin
  for match_id in
    select distinct entry.match_id from public.match_waitlist_entries entry
    where entry.status in ('waiting','offered')
      and (entry.status = 'waiting' or exists (select 1 from public.match_waitlist_offers offer
        where offer.entry_id = entry.id and offer.status = 'offered' and offer.expires_at <= now()))
  loop
    perform private.offer_next_waitlisted(match_id);
    processed := processed + 1;
  end loop;
  return processed;
end;
$$;

create or replace function public.create_match_with_positions(
  p_match jsonb, p_positions jsonb, p_booking jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  created_match_id uuid;
  position_item jsonb;
  position_count integer;
  side_value smallint;
  reserved_value smallint;
  offer_minutes smallint;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode = '42501';
  end if;
  if jsonb_typeof(p_positions) <> 'array' then raise exception 'positions_must_be_array' using errcode = '22023'; end if;
  side_value := (p_match ->> 'side_size')::smallint;
  reserved_value := coalesce((p_match ->> 'reserved_guest_slots')::smallint, 0);
  offer_minutes := coalesce((p_match ->> 'waitlist_offer_minutes')::smallint, 15);
  if offer_minutes not between 5 and 60 then raise exception 'invalid_waitlist_offer_minutes' using errcode = '22023'; end if;
  select count(*)::integer into position_count from jsonb_array_elements(p_positions);
  if position_count > 2 * side_value - reserved_value then raise exception 'position_slots_exceed_free_spots' using errcode = '23514'; end if;
  insert into public.matches (
    organizer_id,title,side_size,city_id,area_id,venue_display_name,venue_address,starts_at,
    duration_minutes,skill_level,price_eur,reserved_guest_slots,event_status,notes,booking_status,waitlist_offer_minutes
  ) values (
    auth.uid(),btrim(p_match->>'title'),side_value,(p_match->>'city_id')::uuid,(p_match->>'area_id')::uuid,
    btrim(p_match->>'venue_display_name'),btrim(p_match->>'venue_address'),(p_match->>'starts_at')::timestamptz,
    (p_match->>'duration_minutes')::smallint,nullif(p_match->>'skill_level',''),
    coalesce(nullif(p_match->>'price_eur','')::numeric,0),reserved_value,coalesce(p_match->>'event_status','draft'),
    nullif(btrim(p_match->>'notes'),''),coalesce(p_match->>'booking_status','not_booked'),offer_minutes
  ) returning id into created_match_id;
  for position_item in select value from jsonb_array_elements(p_positions) loop
    if position_item->>'position' not in ('goalkeeper','defender','midfielder','forward','any') then
      raise exception 'invalid_position' using errcode = '22023';
    end if;
    insert into public.match_position_slots(match_id,position_code,x_pct,y_pct)
    values (created_match_id,position_item->>'position',coalesce((position_item->>'x_pct')::numeric,50),coalesce((position_item->>'y_pct')::numeric,50));
  end loop;
  if coalesce(nullif(btrim(p_booking->>'organizer_notes'),''),nullif(btrim(p_booking->>'reference'),'')) is not null then
    insert into public.match_booking_private_details(match_id,organizer_notes,reference,confirmed_at,reported_by)
    values (created_match_id,nullif(btrim(p_booking->>'organizer_notes'),''),nullif(btrim(p_booking->>'reference'),''),
      case when p_match->>'booking_status'='confirmed' then now() else null end,auth.uid());
  end if;
  return created_match_id;
end;
$$;

create or replace function public.update_match_with_positions(
  p_match_id uuid, p_match jsonb, p_positions jsonb, p_booking jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  position_item jsonb;
  position_count integer;
  side_value smallint;
  reserved_value smallint;
  offer_minutes smallint;
  active_count integer;
  offer_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode = '42501';
  end if;
  perform 1 from public.matches where id=p_match_id and organizer_id=auth.uid() for update;
  if not found then raise exception 'match_not_owned' using errcode = '42501'; end if;
  if jsonb_typeof(p_positions) <> 'array' then raise exception 'positions_must_be_array' using errcode = '22023'; end if;
  side_value := (p_match->>'side_size')::smallint;
  reserved_value := coalesce((p_match->>'reserved_guest_slots')::smallint,0);
  offer_minutes := coalesce((p_match->>'waitlist_offer_minutes')::smallint,15);
  if offer_minutes not between 5 and 60 then raise exception 'invalid_waitlist_offer_minutes' using errcode = '22023'; end if;
  select count(*) into active_count from public.match_participants where match_id=p_match_id and status='active';
  select count(*) into offer_count from public.match_waitlist_offers where match_id=p_match_id and status='offered' and expires_at>now();
  select count(*)::integer into position_count from jsonb_array_elements(p_positions);
  if position_count > 2*side_value-reserved_value-active_count-offer_count then
    raise exception 'position_slots_exceed_free_spots' using errcode = '23514';
  end if;
  delete from public.match_position_slots where match_id=p_match_id and status='open';
  update public.matches set title=btrim(p_match->>'title'),side_size=side_value,city_id=(p_match->>'city_id')::uuid,
    area_id=(p_match->>'area_id')::uuid,venue_display_name=btrim(p_match->>'venue_display_name'),
    venue_address=btrim(p_match->>'venue_address'),starts_at=(p_match->>'starts_at')::timestamptz,
    duration_minutes=(p_match->>'duration_minutes')::smallint,skill_level=nullif(p_match->>'skill_level',''),
    price_eur=coalesce(nullif(p_match->>'price_eur','')::numeric,0),reserved_guest_slots=reserved_value,
    event_status=coalesce(p_match->>'event_status','draft'),notes=nullif(btrim(p_match->>'notes'),''),
    booking_status=coalesce(p_match->>'booking_status','not_booked'),waitlist_offer_minutes=offer_minutes
    where id=p_match_id;
  for position_item in select value from jsonb_array_elements(p_positions) loop
    if position_item->>'position' not in ('goalkeeper','defender','midfielder','forward','any') then
      raise exception 'invalid_position' using errcode = '22023';
    end if;
    insert into public.match_position_slots(match_id,position_code,x_pct,y_pct)
    values (p_match_id,position_item->>'position',coalesce((position_item->>'x_pct')::numeric,50),coalesce((position_item->>'y_pct')::numeric,50));
  end loop;
  if coalesce(nullif(btrim(p_booking->>'organizer_notes'),''),nullif(btrim(p_booking->>'reference'),'')) is not null then
    insert into public.match_booking_private_details(match_id,organizer_notes,reference,confirmed_at,reported_by)
    values (p_match_id,nullif(btrim(p_booking->>'organizer_notes'),''),nullif(btrim(p_booking->>'reference'),''),
      case when p_match->>'booking_status'='confirmed' then now() else null end,auth.uid())
    on conflict(match_id) do update set organizer_notes=excluded.organizer_notes,reference=excluded.reference,
      confirmed_at=excluded.confirmed_at,reported_by=excluded.reported_by;
  else delete from public.match_booking_private_details where match_id=p_match_id;
  end if;
  return p_match_id;
end;
$$;

create or replace function public.cancel_match(p_match_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  update public.matches set event_status='cancelled' where id=p_match_id and organizer_id=auth.uid()
    and starts_at>now() and event_status in ('draft','published');
  if not found then raise exception 'match_not_owned_or_not_cancellable' using errcode='42501'; end if;
  update public.match_waitlist_offers set status='cancelled'
    where match_id=p_match_id and status='offered';
  update public.match_waitlist_entries set status='removed'
    where match_id=p_match_id and status in ('waiting','offered');
  update public.match_position_slots set status='removed' where match_id=p_match_id and status='open';
end;
$$;

revoke all on function public.join_match_waitlist(uuid,text) from public, anon, authenticated;
revoke all on function public.leave_match_waitlist(uuid) from public, anon, authenticated;
revoke all on function public.leave_match(uuid) from public, anon, authenticated;
revoke all on function public.accept_waitlist_offer(uuid) from public, anon, authenticated;
revoke all on function public.decline_waitlist_offer(uuid) from public, anon, authenticated;
revoke all on function public.get_match_waitlist_state(uuid) from public, anon, authenticated;
revoke all on function public.process_expired_waitlist_offers() from public, anon, authenticated;
grant execute on function public.join_match_waitlist(uuid,text) to authenticated;
grant execute on function public.leave_match_waitlist(uuid) to authenticated;
grant execute on function public.leave_match(uuid) to authenticated;
grant execute on function public.accept_waitlist_offer(uuid) to authenticated;
grant execute on function public.decline_waitlist_offer(uuid) to authenticated;
grant execute on function public.get_match_waitlist_state(uuid) to authenticated;

select cron.schedule('one-more-process-waitlist-offers', '* * * * *',
  'select public.process_expired_waitlist_offers()');
