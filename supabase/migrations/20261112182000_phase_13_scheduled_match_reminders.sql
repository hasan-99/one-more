alter table public.notification_outbox
  drop constraint notification_outbox_event_type_check,
  add constraint notification_outbox_event_type_check check (event_type in (
    'match_join_requested', 'match_join_approved', 'match_join_rejected',
    'match_waitlist_offer', 'match_waitlist_offer_accepted',
    'match_waitlist_offer_declined', 'match_waitlist_offer_expired',
    'match_waitlist_offer_cancelled', 'challenge_request_received',
    'challenge_request_accepted', 'challenge_request_rejected',
    'challenge_match_ready', 'challenge_cancelled',
    'match_reminder_24h', 'match_reminder_2h'
  ));

create table public.match_reminders (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  participant_id uuid references public.match_participants(id) on delete cascade,
  offset_minutes smallint not null check (offset_minutes in (120, 1440)),
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'queued', 'cancelled')),
  created_at timestamptz not null default now(),
  queued_at timestamptz,
  cancelled_at timestamptz,
  unique (match_id, recipient_id, offset_minutes, scheduled_for)
);
create index match_reminders_due_idx on public.match_reminders(scheduled_for, id) where status = 'pending';
create index match_reminders_match_idx on public.match_reminders(match_id, status, scheduled_for);
create index match_reminders_recipient_idx on public.match_reminders(recipient_id, scheduled_for desc);
create index match_reminders_participant_idx on public.match_reminders(participant_id) where participant_id is not null;
alter table public.match_reminders enable row level security;
revoke all on public.match_reminders from public, anon, authenticated;

create unique index notification_outbox_reminder_once_idx
  on public.notification_outbox ((payload ->> 'reminder_id'))
  where event_type in ('match_reminder_24h', 'match_reminder_2h');

create or replace function private.create_inbox_notification()
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
      ('challenge_cancelled', 'notificationChallengeCancelledTitle', 'notificationChallengeCancelledBody'),
      ('match_reminder_24h', 'notificationReminder24hTitle', 'notificationReminder24hBody'),
      ('match_reminder_2h', 'notificationReminder2hTitle', 'notificationReminder2hBody')
    ) as mapping(event_type, title_key, body_key)
    where mapping.event_type = new.event_type;
  if title_key_value is null then return new; end if;
  insert into public.inbox_notifications(recipient_id, outbox_id, event_type, title_key, body_key, href)
    values (new.recipient_id, new.id, new.event_type, title_key_value, body_key_value, target_href)
    on conflict (outbox_id) do nothing;
  return new;
end;
$$;

create function private.schedule_match_reminders(
  p_match_id uuid,
  p_recipient_id uuid,
  p_participant_id uuid default null,
  p_now timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_row public.matches%rowtype;
  offset_value smallint;
  due_at timestamptz;
  scheduled_count integer := 0;
begin
  select * into match_row from public.matches where id = p_match_id;
  if not found or match_row.event_status <> 'published' or match_row.starts_at <= p_now then return 0; end if;
  foreach offset_value in array array[1440::smallint, 120::smallint] loop
    due_at := match_row.starts_at - make_interval(mins => offset_value);
    if due_at > p_now then
      insert into public.match_reminders(match_id, recipient_id, participant_id, offset_minutes, scheduled_for)
        values (p_match_id, p_recipient_id, p_participant_id, offset_value, due_at)
        on conflict (match_id, recipient_id, offset_minutes, scheduled_for) do update
          set status = 'pending', queued_at = null, cancelled_at = null
          where public.match_reminders.status = 'cancelled';
      scheduled_count := scheduled_count + 1;
    end if;
  end loop;
  return scheduled_count;
end;
$$;
revoke all on function private.schedule_match_reminders(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;

create function private.sync_match_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  participant_row record;
  reminder_row record;
begin
  if tg_op = 'UPDATE'
     and old.starts_at is not distinct from new.starts_at
     and old.event_status is not distinct from new.event_status then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    for reminder_row in
      update public.match_reminders set status = 'cancelled', cancelled_at = now()
      where match_id = new.id and status in ('pending', 'queued')
      returning id
    loop
      update public.notification_outbox set email_status = 'suppressed',
        email_error_code = 'reminder_rescheduled', processed_at = coalesce(processed_at, now())
        where payload ->> 'reminder_id' = reminder_row.id::text
          and email_status in ('pending', 'failed');
    end loop;
  end if;

  if new.event_status = 'published' and new.starts_at > now() then
    perform private.schedule_match_reminders(new.id, new.organizer_id, null, now());
    for participant_row in
      select id, user_id from public.match_participants
      where match_id = new.id and status = 'active'
    loop
      perform private.schedule_match_reminders(new.id, participant_row.user_id, participant_row.id, now());
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_match_reminders() from public, anon, authenticated;
create trigger match_reminders_sync_match
  after insert or update on public.matches
  for each row execute function private.sync_match_reminders();

create function private.sync_participant_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder_row record;
begin
  if tg_op = 'INSERT' and new.status = 'active' then
    perform private.schedule_match_reminders(new.match_id, new.user_id, new.id, now());
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'active' then
      perform private.schedule_match_reminders(new.match_id, new.user_id, new.id, now());
    else
      for reminder_row in
        update public.match_reminders set status = 'cancelled', cancelled_at = now()
        where participant_id = new.id and status in ('pending', 'queued')
        returning id
      loop
        update public.notification_outbox set email_status = 'suppressed',
          email_error_code = 'participant_left', processed_at = coalesce(processed_at, now())
        where payload ->> 'reminder_id' = reminder_row.id::text
          and email_status in ('pending', 'failed');
      end loop;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.sync_participant_reminders() from public, anon, authenticated;
create trigger match_reminders_sync_participant
  after insert or update of status on public.match_participants
  for each row execute function private.sync_participant_reminders();

create function private.process_due_match_reminders(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder_row public.match_reminders%rowtype;
  match_row public.matches%rowtype;
  queued_count integer := 0;
begin
  for reminder_row in
    select * from public.match_reminders
    where status = 'pending' and scheduled_for <= p_now
    order by scheduled_for, id
    limit 100
    for update skip locked
  loop
    select * into match_row from public.matches where id = reminder_row.match_id for update;
    if not found or match_row.event_status <> 'published' or match_row.starts_at <= p_now
       or match_row.starts_at - make_interval(mins => reminder_row.offset_minutes) <> reminder_row.scheduled_for then
      update public.match_reminders set status = 'cancelled', cancelled_at = p_now where id = reminder_row.id;
      continue;
    end if;
    update public.match_reminders set status = 'queued', queued_at = p_now where id = reminder_row.id;
    insert into public.notification_outbox(recipient_id, event_type, match_id, participant_id, payload)
      values (
        reminder_row.recipient_id,
        case when reminder_row.offset_minutes = 1440 then 'match_reminder_24h' else 'match_reminder_2h' end,
        reminder_row.match_id,
        reminder_row.participant_id,
        jsonb_build_object(
          'reminder_id', reminder_row.id,
          'offset_minutes', reminder_row.offset_minutes,
          'scheduled_for', reminder_row.scheduled_for
        )
      )
      on conflict do nothing;
    queued_count := queued_count + 1;
  end loop;
  return queued_count;
end;
$$;
revoke all on function private.process_due_match_reminders(timestamptz) from public, anon, authenticated;

do $$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'one-more-process-match-reminders';
  if existing_job is not null then perform cron.unschedule(existing_job); end if;
  perform cron.schedule('one-more-process-match-reminders', '* * * * *',
    'select private.process_due_match_reminders(now())');
end;
$$;
