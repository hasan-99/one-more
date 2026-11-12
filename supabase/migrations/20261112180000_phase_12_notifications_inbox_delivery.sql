create extension if not exists pg_net;

alter table public.notification_outbox
  alter column match_id drop not null,
  drop constraint notification_outbox_event_type_check,
  add constraint notification_outbox_event_type_check check (event_type in (
    'match_join_requested', 'match_join_approved', 'match_join_rejected',
    'match_waitlist_offer', 'match_waitlist_offer_accepted',
    'match_waitlist_offer_declined', 'match_waitlist_offer_expired',
    'match_waitlist_offer_cancelled', 'challenge_request_received',
    'challenge_request_accepted', 'challenge_request_rejected',
    'challenge_match_ready', 'challenge_cancelled'
  )),
  add column email_status text not null default 'pending'
    check (email_status in ('pending', 'processing', 'sent', 'suppressed', 'failed')),
  add column email_attempts smallint not null default 0 check (email_attempts between 0 and 6),
  add column email_next_attempt_at timestamptz not null default now(),
  add column email_last_attempt_at timestamptz,
  add column email_sent_at timestamptz,
  add column email_error_code text;

-- Outbox rows created before this release remain visible in the inbox if replayed,
-- but are not unexpectedly sent as old email after the worker becomes available.
update public.notification_outbox set email_status = 'suppressed';

create index notification_outbox_email_pending_idx
  on public.notification_outbox(email_next_attempt_at, created_at, id)
  where email_status in ('pending', 'failed') and email_attempts < 6;

create table public.inbox_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  outbox_id uuid not null unique references public.notification_outbox(id) on delete cascade,
  event_type text not null,
  title_key text not null,
  body_key text not null,
  href text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index inbox_notifications_recipient_created_idx
  on public.inbox_notifications(recipient_id, created_at desc, id desc);
alter table public.inbox_notifications enable row level security;
revoke all on public.inbox_notifications from public, anon, authenticated;
grant select on public.inbox_notifications to authenticated;
create policy "Users read their own inbox notifications"
  on public.inbox_notifications for select to authenticated
  using ((select auth.uid()) = recipient_id);

create function private.create_inbox_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_href text;
  target_id uuid;
  title_key_value text;
  body_key_value text;
begin
  if not coalesce((select prefs.in_app_enabled from public.notification_preferences prefs
    where prefs.user_id = new.recipient_id), true) then
    return new;
  end if;
  target_id := case
    when new.payload ? 'challenge_id' then nullif(new.payload ->> 'challenge_id', '')::uuid
    else null
  end;
  if new.event_type like 'challenge_%' then
    target_href := case
      when new.event_type = 'challenge_match_ready' and new.match_id is not null
        then '/matches/' || new.match_id::text
      else '/challenges/' || coalesce(target_id::text, '')
    end;
  elsif new.match_id is not null then
    target_href := '/matches/' || new.match_id::text;
  else
    return new;
  end if;
  select mapping.title_key, mapping.body_key into title_key_value, body_key_value
    from (values
      ('match_join_requested', 'notificationJoinRequestedTitle', 'notificationJoinRequestedBody'),
      ('match_join_approved', 'notificationJoinApprovedTitle', 'notificationJoinApprovedBody'),
      ('match_join_rejected', 'notificationJoinRejectedTitle', 'notificationJoinRejectedBody'),
      ('match_waitlist_offer', 'notificationWaitlistOfferTitle', 'notificationWaitlistOfferBody'),
      ('match_waitlist_offer_accepted', 'notificationWaitlistAcceptedTitle', 'notificationWaitlistAcceptedBody'),
      ('match_waitlist_offer_declined', 'notificationWaitlistDeclinedTitle', 'notificationWaitlistDeclinedBody'),
      ('match_waitlist_offer_expired', 'notificationWaitlistExpiredTitle', 'notificationWaitlistExpiredBody'),
      ('match_waitlist_offer_cancelled', 'notificationWaitlistCancelledTitle', 'notificationWaitlistCancelledBody'),
      ('challenge_request_received', 'notificationChallengeRequestTitle', 'notificationChallengeRequestBody'),
      ('challenge_request_accepted', 'notificationChallengeAcceptedTitle', 'notificationChallengeAcceptedBody'),
      ('challenge_request_rejected', 'notificationChallengeDeclinedTitle', 'notificationChallengeDeclinedBody'),
      ('challenge_match_ready', 'notificationChallengeMatchTitle', 'notificationChallengeMatchBody'),
      ('challenge_cancelled', 'notificationChallengeCancelledTitle', 'notificationChallengeCancelledBody')
    ) as mapping(event_type, title_key, body_key)
    where mapping.event_type = new.event_type;
  if title_key_value is null then return new; end if;
  insert into public.inbox_notifications(recipient_id, outbox_id, event_type, title_key, body_key, href)
    values (new.recipient_id, new.id, new.event_type, title_key_value, body_key_value, target_href)
    on conflict (outbox_id) do nothing;
  return new;
end;
$$;
revoke all on function private.create_inbox_notification() from public, anon, authenticated;

create trigger notification_outbox_create_inbox
  after insert on public.notification_outbox
  for each row execute function private.create_inbox_notification();

create function public.mark_inbox_notification_read(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.inbox_notifications set read_at = coalesce(read_at, now())
    where id = p_notification_id and recipient_id = auth.uid();
  return found;
end;
$$;
revoke all on function public.mark_inbox_notification_read(uuid) from public, anon, authenticated;
grant execute on function public.mark_inbox_notification_read(uuid) to authenticated;

create function public.mark_all_inbox_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare updated_count integer;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  update public.inbox_notifications set read_at = now()
    where recipient_id = auth.uid() and read_at is null;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;
revoke all on function public.mark_all_inbox_notifications_read() from public, anon, authenticated;
grant execute on function public.mark_all_inbox_notifications_read() to authenticated;

create function private.notify_challenge_request_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare home_captain uuid;
begin
  if tg_op = 'INSERT' then
    select team.captain_id into home_captain
      from public.team_challenges challenge
      join public.teams team on team.id = challenge.home_team_id
      where challenge.id = new.challenge_id;
    if home_captain is not null then
      insert into public.notification_outbox(recipient_id, event_type, payload)
        values (home_captain, 'challenge_request_received', jsonb_build_object('challenge_id', new.challenge_id));
    end if;
  elsif old.status = 'pending' and new.status in ('accepted', 'rejected') then
    insert into public.notification_outbox(recipient_id, event_type, payload)
      values (new.requested_by,
        case when new.status = 'accepted' then 'challenge_request_accepted' else 'challenge_request_rejected' end,
        jsonb_build_object('challenge_id', new.challenge_id));
  end if;
  return new;
end;
$$;
revoke all on function private.notify_challenge_request_changes() from public, anon, authenticated;
create trigger challenge_request_notify_insert
  after insert on public.challenge_requests
  for each row execute function private.notify_challenge_request_changes();
create trigger challenge_request_notify_response
  after update of status on public.challenge_requests
  for each row execute function private.notify_challenge_request_changes();

create function private.notify_challenge_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  away_captain uuid;
  linked_match_id uuid;
begin
  if old.status = new.status then return new; end if;
  select away.captain_id into away_captain
    from public.challenge_requests request
    join public.teams away on away.id = request.away_team_id
    where request.challenge_id = new.id and request.status = 'accepted';
  if new.status = 'matched' then
    select id into linked_match_id from public.matches where challenge_id = new.id limit 1;
    if linked_match_id is not null then
      insert into public.notification_outbox(recipient_id, event_type, match_id, payload)
        select captain_id, 'challenge_match_ready', linked_match_id, jsonb_build_object('challenge_id', new.id)
        from public.teams where id in (new.home_team_id,
          (select away_team_id from public.challenge_requests
            where challenge_id = new.id and status = 'accepted' limit 1));
    end if;
  elsif new.status = 'cancelled' and away_captain is not null then
    insert into public.notification_outbox(recipient_id, event_type, payload)
      values (away_captain, 'challenge_cancelled', jsonb_build_object('challenge_id', new.id));
  end if;
  return new;
end;
$$;
revoke all on function private.notify_challenge_lifecycle() from public, anon, authenticated;
create trigger team_challenge_notify_status
  after update of status on public.team_challenges
  for each row execute function private.notify_challenge_lifecycle();

select vault.create_secret(encode(gen_random_bytes(32), 'hex'),
  'one_more_notification_worker_token', 'Internal bearer for the notification outbox worker')
where not exists (select 1 from vault.decrypted_secrets where name = 'one_more_notification_worker_token');

create function private.dispatch_notification_outbox(p_outbox_id uuid default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare worker_token text; request_id bigint;
begin
  select decrypted_secret into worker_token from vault.decrypted_secrets
    where name = 'one_more_notification_worker_token' limit 1;
  if worker_token is null then raise exception 'notification_worker_token_missing'; end if;
  select net.http_post(
    url := 'https://ejlyaerurkjgsylrsthl.supabase.co/functions/v1/notification-outbox-worker',
    body := jsonb_build_object('outbox_id', p_outbox_id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || worker_token),
    timeout_milliseconds := 5000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function private.dispatch_notification_outbox(uuid) from public, anon, authenticated;

create function private.dispatch_pending_notification_outbox()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare item record; queued_count integer := 0;
begin
  for item in
    select id from public.notification_outbox
    where email_status in ('pending', 'failed') and email_attempts < 6
      and email_next_attempt_at <= now()
    order by created_at, id limit 20
  loop
    perform private.dispatch_notification_outbox(item.id);
    queued_count := queued_count + 1;
  end loop;
  return queued_count;
end;
$$;
revoke all on function private.dispatch_pending_notification_outbox() from public, anon, authenticated;

create function public.verify_notification_worker_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_token is not null and exists (
    select 1 from vault.decrypted_secrets
    where name = 'one_more_notification_worker_token' and decrypted_secret = p_token
  )
$$;
revoke all on function public.verify_notification_worker_token(text) from public, anon, authenticated;
grant execute on function public.verify_notification_worker_token(text) to service_role;

create function public.claim_notification_outbox(p_outbox_id uuid)
returns setof public.notification_outbox
language sql
security definer
set search_path = ''
as $$
  update public.notification_outbox as outbox set
    email_status = 'processing',
    email_attempts = email_attempts + 1,
    email_last_attempt_at = now(),
    email_error_code = null
  where outbox.id = p_outbox_id
    and outbox.email_status in ('pending', 'failed')
    and outbox.email_attempts < 6
    and outbox.email_next_attempt_at <= now()
  returning outbox.*
$$;
revoke all on function public.claim_notification_outbox(uuid) from public, anon, authenticated;
grant execute on function public.claim_notification_outbox(uuid) to service_role;

create function public.finish_notification_email(p_outbox_id uuid, p_status text, p_error_code text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('sent', 'suppressed', 'failed') then
    raise exception 'invalid_email_status' using errcode = '22023';
  end if;
  update public.notification_outbox set
    email_status = p_status,
    email_sent_at = case when p_status = 'sent' then now() else null end,
    email_error_code = case when p_status = 'failed' then left(coalesce(p_error_code, 'delivery_failed'), 64) else null end,
    email_next_attempt_at = case when p_status = 'failed'
      then now() + make_interval(mins => least(60, 2 ^ least(email_attempts, 6)::integer))
      else email_next_attempt_at end
  where id = p_outbox_id and email_status = 'processing';
  return found;
end;
$$;
revoke all on function public.finish_notification_email(uuid, text, text) from public, anon, authenticated;
grant execute on function public.finish_notification_email(uuid, text, text) to service_role;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'one-more-dispatch-notifications';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('one-more-dispatch-notifications', '* * * * *',
    'select private.dispatch_pending_notification_outbox()');
end;
$$;
