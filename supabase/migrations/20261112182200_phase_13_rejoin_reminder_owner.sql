create or replace function private.schedule_match_reminders(
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
          set participant_id = excluded.participant_id,
              status = 'pending', queued_at = null, cancelled_at = null
          where public.match_reminders.status = 'cancelled';
      scheduled_count := scheduled_count + 1;
    end if;
  end loop;
  return scheduled_count;
end;
$$;
revoke all on function private.schedule_match_reminders(uuid, uuid, uuid, timestamptz) from public, anon, authenticated;
