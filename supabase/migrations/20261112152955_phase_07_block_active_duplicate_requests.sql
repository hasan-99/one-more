create or replace function public.request_match_join(p_match_id uuid, p_position_slot_id uuid default null)
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
  if exists (select 1 from public.match_participants where match_id = p_match_id and user_id = auth.uid() and status = 'active') then
    raise exception 'already_joined' using errcode = '22023';
  end if;
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
