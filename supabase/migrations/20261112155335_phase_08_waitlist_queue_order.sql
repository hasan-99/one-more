alter table public.match_waitlist_entries
  add column queue_number bigint generated always as identity;
drop index public.match_waitlist_queue_order_idx;
create index match_waitlist_queue_order_idx
  on public.match_waitlist_entries(match_id,queue_number,id) where status='waiting';

create or replace function private.offer_next_waitlisted(p_match_id uuid)
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
  select * into match_row from public.matches where id=p_match_id for update;
  if not found or match_row.event_status<>'published' or match_row.starts_at<=now() then return null; end if;
  select * into active_offer from public.match_waitlist_offers where match_id=p_match_id and status='offered'
    order by created_at limit 1 for update;
  if found and active_offer.expires_at>now() then return active_offer.id; end if;
  if found then
    update public.match_waitlist_offers set status='expired' where id=active_offer.id;
    update public.match_waitlist_entries set status='expired' where id=active_offer.entry_id and status='offered';
    insert into public.notification_outbox(recipient_id,event_type,match_id,waitlist_offer_id)
      select entry.user_id,'match_waitlist_offer_expired',p_match_id,active_offer.id
      from public.match_waitlist_entries entry where entry.id=active_offer.entry_id;
  end if;
  select count(*) into active_count from public.match_participants where match_id=p_match_id and status='active';
  select count(*) into offer_count from public.match_waitlist_offers where match_id=p_match_id and status='offered' and expires_at>now();
  if active_count+match_row.reserved_guest_slots+offer_count>=2*match_row.side_size then return null; end if;
  select * into entry_row from public.match_waitlist_entries where match_id=p_match_id and status='waiting'
    order by queue_number,id limit 1 for update skip locked;
  if not found then return null; end if;
  insert into public.match_waitlist_offers(match_id,entry_id,expires_at)
    values(p_match_id,entry_row.id,now()+make_interval(mins=>match_row.waitlist_offer_minutes)) returning id into new_offer_id;
  update public.match_waitlist_entries set status='offered' where id=entry_row.id;
  insert into public.notification_outbox(recipient_id,event_type,match_id,waitlist_offer_id,payload)
    values(entry_row.user_id,'match_waitlist_offer',p_match_id,new_offer_id,
      jsonb_build_object('expires_at',now()+make_interval(mins=>match_row.waitlist_offer_minutes)));
  return new_offer_id;
end;
$$;
revoke all on function private.offer_next_waitlisted(uuid) from public,anon,authenticated;

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
    order by case status when 'offered' then 0 when 'waiting' then 1 when 'accepted' then 2 else 3 end,queue_number desc,id desc
    limit 1;
  if not found then return null; end if;
  if entry_row.status='offered' or (entry_row.status='waiting' and not exists(
    select 1 from public.match_waitlist_entries earlier where earlier.match_id=p_match_id and earlier.status='waiting'
      and (earlier.queue_number,earlier.id)<(entry_row.queue_number,entry_row.id))) then
    perform private.offer_next_waitlisted(p_match_id);
    select * into entry_row from public.match_waitlist_entries where id=entry_row.id;
  end if;
  select * into offer_row from public.match_waitlist_offers where entry_id=entry_row.id and status='offered' and expires_at>now()
    order by created_at desc limit 1;
  if entry_row.status='waiting' then
    select count(*)::integer+1 into queue_position from public.match_waitlist_entries queued
      where queued.match_id=p_match_id and queued.status='waiting' and (queued.queue_number,queued.id)<(entry_row.queue_number,entry_row.id);
  end if;
  return jsonb_build_object('entry_id',entry_row.id,'status',entry_row.status,'queue_position',queue_position,
    'offer_id',offer_row.id,'expires_at',offer_row.expires_at,'position_code',entry_row.position_code);
end;
$$;
revoke all on function public.get_match_waitlist_state(uuid) from public,anon,authenticated;
grant execute on function public.get_match_waitlist_state(uuid) to authenticated;
