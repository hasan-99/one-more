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
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode='42501';
  end if;
  select * into match_row from public.matches where id=p_match_id for update;
  if not found or match_row.event_status<>'published' or match_row.starts_at<=now() then
    raise exception 'match_not_open_for_requests' using errcode='22023';
  end if;
  if match_row.organizer_id=auth.uid() then raise exception 'organizer_cannot_request' using errcode='42501'; end if;
  if exists(select 1 from public.match_participants where match_id=p_match_id and user_id=auth.uid() and status='active') then
    raise exception 'already_joined' using errcode='22023';
  end if;
  select id into existing_request_id from public.match_participants
    where match_id=p_match_id and user_id=auth.uid() and status='pending';
  if existing_request_id is not null then return existing_request_id; end if;
  perform private.offer_next_waitlisted(p_match_id);
  select count(*) into active_count from public.match_participants where match_id=p_match_id and status='active';
  select count(*) into offer_count from public.match_waitlist_offers where match_id=p_match_id and status='offered' and expires_at>now();
  if active_count+match_row.reserved_guest_slots+offer_count>=2*match_row.side_size then
    raise exception 'match_full' using errcode='23514';
  end if;
  if p_position_slot_id is not null and not exists(select 1 from public.match_position_slots
    where id=p_position_slot_id and match_id=p_match_id and status='open') then
    raise exception 'position_unavailable' using errcode='22023';
  end if;
  insert into public.match_participants(match_id,user_id,status,requested_position_slot_id)
    values(p_match_id,auth.uid(),'pending',p_position_slot_id) returning id into new_request_id;
  insert into public.notification_outbox(recipient_id,event_type,match_id,participant_id)
    values(match_row.organizer_id,'match_join_requested',p_match_id,new_request_id);
  return new_request_id;
end;
$$;

create or replace function public.review_match_join_request(p_match_id uuid,p_participant_id uuid,p_decision text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  request_row public.match_participants%rowtype;
  active_count integer;
  offer_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_decision not in('approve','reject') then raise exception 'invalid_decision' using errcode='22023'; end if;
  select * into match_row from public.matches where id=p_match_id for update;
  if not found or match_row.organizer_id<>auth.uid() then raise exception 'match_not_owned' using errcode='42501'; end if;
  select * into request_row from public.match_participants where id=p_participant_id and match_id=p_match_id for update;
  if not found then raise exception 'request_not_found' using errcode='P0002'; end if;
  if (p_decision='approve' and request_row.status='active') or (p_decision='reject' and request_row.status='rejected') then return request_row.status; end if;
  if request_row.status<>'pending' then raise exception 'request_not_pending' using errcode='22023'; end if;
  if match_row.event_status<>'published' or match_row.starts_at<=now() then raise exception 'match_not_open_for_requests' using errcode='22023'; end if;
  if p_decision='approve' then
    perform private.offer_next_waitlisted(p_match_id);
    select count(*) into active_count from public.match_participants where match_id=p_match_id and status='active';
    select count(*) into offer_count from public.match_waitlist_offers where match_id=p_match_id and status='offered' and expires_at>now();
    if active_count+match_row.reserved_guest_slots+offer_count>=2*match_row.side_size then raise exception 'match_full' using errcode='23514'; end if;
    update public.match_participants set status='active' where id=p_participant_id;
    if request_row.requested_position_slot_id is not null then
      update public.match_position_slots set status='filled',assigned_participant_id=p_participant_id
        where id=request_row.requested_position_slot_id and match_id=p_match_id and status='open';
    end if;
    insert into public.notification_outbox(recipient_id,event_type,match_id,participant_id)
      values(request_row.user_id,'match_join_approved',p_match_id,p_participant_id);
    return 'active';
  end if;
  update public.match_participants set status='rejected' where id=p_participant_id;
  insert into public.notification_outbox(recipient_id,event_type,match_id,participant_id)
    values(request_row.user_id,'match_join_rejected',p_match_id,p_participant_id);
  return 'rejected';
end;
$$;

create or replace function public.get_match_waitlist_state(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  entry_row public.match_waitlist_entries%rowtype;
  offer_row public.match_waitlist_offers%rowtype;
  queue_position integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.matches where id=p_match_id and event_status='published' and starts_at>now()) then
    raise exception 'match_not_open_for_waitlist' using errcode='22023';
  end if;
  select * into entry_row from public.match_waitlist_entries where match_id=p_match_id and user_id=auth.uid()
    order by case status when 'offered' then 0 when 'waiting' then 1 when 'accepted' then 2 else 3 end,queued_at desc,id desc
    limit 1;
  if not found then return null; end if;
  if entry_row.status='offered' or (entry_row.status='waiting' and not exists(
    select 1 from public.match_waitlist_entries earlier where earlier.match_id=p_match_id and earlier.status='waiting'
      and (earlier.queued_at,earlier.id)<(entry_row.queued_at,entry_row.id))) then
    perform private.offer_next_waitlisted(p_match_id);
    select * into entry_row from public.match_waitlist_entries where id=entry_row.id;
  end if;
  select * into offer_row from public.match_waitlist_offers where entry_id=entry_row.id and status='offered' and expires_at>now()
    order by created_at desc limit 1;
  if entry_row.status='waiting' then
    select count(*)::integer+1 into queue_position from public.match_waitlist_entries queued
      where queued.match_id=p_match_id and queued.status='waiting' and (queued.queued_at,queued.id)<(entry_row.queued_at,entry_row.id);
  end if;
  return jsonb_build_object('entry_id',entry_row.id,'status',entry_row.status,'queue_position',queue_position,
    'offer_id',offer_row.id,'expires_at',offer_row.expires_at,'position_code',entry_row.position_code);
end;
$$;

revoke all on function public.request_match_join(uuid,uuid) from public,anon,authenticated;
revoke all on function public.review_match_join_request(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.get_match_waitlist_state(uuid) from public,anon,authenticated;
grant execute on function public.request_match_join(uuid,uuid) to authenticated;
grant execute on function public.review_match_join_request(uuid,uuid,text) to authenticated;
grant execute on function public.get_match_waitlist_state(uuid) to authenticated;
