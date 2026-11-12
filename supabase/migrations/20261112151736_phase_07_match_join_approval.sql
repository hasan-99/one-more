alter table public.match_participants
  drop constraint match_participants_status_check,
  add constraint match_participants_status_check
    check (status in ('pending', 'active', 'rejected', 'cancelled', 'left', 'removed')),
  add column requested_position_slot_id uuid references public.match_position_slots(id) on delete set null;

create unique index match_participants_one_pending_user
  on public.match_participants(match_id, user_id) where status = 'pending';
create index match_participants_pending_match_idx
  on public.match_participants(match_id, joined_at, id) where status in ('pending', 'active');

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('match_join_requested', 'match_join_approved', 'match_join_rejected')),
  match_id uuid not null references public.matches(id) on delete cascade,
  participant_id uuid not null references public.match_participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null default '{}'::jsonb
);
alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from public, anon, authenticated;
create index notification_outbox_unprocessed_idx
  on public.notification_outbox(created_at, id) where processed_at is null;

create function public.request_match_join(p_match_id uuid, p_position_slot_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  existing_request_id uuid;
  new_request_id uuid;
  active_count integer;
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
  select id into existing_request_id from public.match_participants
    where match_id = p_match_id and user_id = auth.uid() and status = 'pending';
  if existing_request_id is not null then return existing_request_id; end if;
  select count(*) into active_count from public.match_participants
    where match_id = p_match_id and status = 'active';
  if active_count + match_row.reserved_guest_slots >= 2 * match_row.side_size then
    raise exception 'match_full' using errcode = '23514';
  end if;
  if p_position_slot_id is not null and not exists (
    select 1 from public.match_position_slots
    where id = p_position_slot_id and match_id = p_match_id and status = 'open'
  ) then raise exception 'position_unavailable' using errcode = '22023'; end if;
  insert into public.match_participants(match_id, user_id, status, requested_position_slot_id)
    values (p_match_id, auth.uid(), 'pending', p_position_slot_id)
    returning id into new_request_id;
  insert into public.notification_outbox(recipient_id, event_type, match_id, participant_id)
    values (match_row.organizer_id, 'match_join_requested', p_match_id, new_request_id);
  return new_request_id;
end;
$$;

create function public.review_match_join_request(
  p_match_id uuid,
  p_participant_id uuid,
  p_decision text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  request_row public.match_participants%rowtype;
  active_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'invalid_decision' using errcode = '22023'; end if;
  select * into match_row from public.matches where id = p_match_id for update;
  if not found or match_row.organizer_id <> auth.uid() then raise exception 'match_not_owned' using errcode = '42501'; end if;
  select * into request_row from public.match_participants
    where id = p_participant_id and match_id = p_match_id for update;
  if not found then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  if (p_decision = 'approve' and request_row.status = 'active')
    or (p_decision = 'reject' and request_row.status = 'rejected') then return request_row.status; end if;
  if request_row.status <> 'pending' then raise exception 'request_not_pending' using errcode = '22023'; end if;
  if match_row.event_status <> 'published' or match_row.starts_at <= now() then
    raise exception 'match_not_open_for_requests' using errcode = '22023';
  end if;
  if p_decision = 'approve' then
    select count(*) into active_count from public.match_participants
      where match_id = p_match_id and status = 'active';
    if active_count + match_row.reserved_guest_slots >= 2 * match_row.side_size then
      raise exception 'match_full' using errcode = '23514';
    end if;
    update public.match_participants set status = 'active' where id = p_participant_id;
    if request_row.requested_position_slot_id is not null then
      update public.match_position_slots
        set status = 'filled', assigned_participant_id = p_participant_id
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

create function public.withdraw_match_join_request(p_match_id uuid, p_participant_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_row public.match_participants%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into request_row from public.match_participants
    where id = p_participant_id and match_id = p_match_id and user_id = auth.uid() for update;
  if not found then raise exception 'request_not_found' using errcode = '42501'; end if;
  if request_row.status = 'cancelled' then return request_row.status; end if;
  if request_row.status <> 'pending' then raise exception 'request_not_pending' using errcode = '22023'; end if;
  update public.match_participants set status = 'cancelled' where id = p_participant_id;
  return 'cancelled';
end;
$$;

create function public.get_match_join_requests(p_match_id uuid)
returns table(participant_id uuid, display_name text, status text, requested_at timestamptz, position_label text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if not exists (select 1 from public.matches where id = p_match_id and organizer_id = auth.uid()) then
    raise exception 'match_not_owned' using errcode = '42501';
  end if;
  return query
    select participant.id, profile.display_name, participant.status, participant.joined_at, slot.position_code
    from public.match_participants participant
    join public.profiles profile on profile.id = participant.user_id
    left join public.match_position_slots slot on slot.id = participant.requested_position_slot_id
    where participant.match_id = p_match_id and participant.status in ('pending', 'active')
    order by case participant.status when 'pending' then 0 else 1 end, participant.joined_at, participant.id;
end;
$$;

revoke all on function public.request_match_join(uuid, uuid) from public, anon, authenticated;
revoke all on function public.review_match_join_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.withdraw_match_join_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_match_join_requests(uuid) from public, anon, authenticated;
grant execute on function public.request_match_join(uuid, uuid) to authenticated;
grant execute on function public.review_match_join_request(uuid, uuid, text) to authenticated;
grant execute on function public.withdraw_match_join_request(uuid, uuid) to authenticated;
grant execute on function public.get_match_join_requests(uuid) to authenticated;
