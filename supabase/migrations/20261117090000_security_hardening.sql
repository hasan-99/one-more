-- Security hardening: server-side abuse limits and price bounds.
-- Everything here is enforced inside Postgres, so it cannot be bypassed by editing the app.

-- 1) Per-user rate limits ---------------------------------------------------------------------
-- A BEFORE INSERT trigger counts how many rows the signed-in user already created in the window.
-- When the limit is reached the insert is refused with SQLSTATE 'P0429' / message 'rate_limited'.
-- The refusal shows up in the Supabase Postgres logs, which is how abuse is monitored (see the
-- operations runbook). Server-side work (auth.uid() is null: service role, migrations, cron) is
-- never limited.
create or replace function private.enforce_insert_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_column text := tg_argv[0];
  max_rows integer := tg_argv[1]::integer;
  window_text text := tg_argv[2];
  time_column text := coalesce(tg_argv[3], 'created_at');
  owner_id uuid;
  recent integer;
begin
  if auth.uid() is null then
    return new;
  end if;
  owner_id := (to_jsonb(new) ->> owner_column)::uuid;
  if owner_id is null then
    return new;
  end if;
  execute format(
    'select count(*) from %I.%I where %I = $1 and %I > now() - $2::interval',
    tg_table_schema, tg_table_name, owner_column, time_column
  ) into recent using owner_id, window_text;
  if recent >= max_rows then
    raise exception 'rate_limited' using errcode = 'P0429',
      detail = format('%s.%s limit %s per %s', tg_table_name, owner_column, max_rows, window_text);
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_insert_rate_limit() from public, anon, authenticated;

drop trigger if exists rate_limit_matches on public.matches;
create trigger rate_limit_matches before insert on public.matches
  for each row execute function private.enforce_insert_rate_limit('organizer_id', '10', '1 hour');

drop trigger if exists rate_limit_match_messages on public.match_messages;
create trigger rate_limit_match_messages before insert on public.match_messages
  for each row execute function private.enforce_insert_rate_limit('sender_id', '20', '1 minute');

drop trigger if exists rate_limit_match_message_reports on public.match_message_reports;
create trigger rate_limit_match_message_reports before insert on public.match_message_reports
  for each row execute function private.enforce_insert_rate_limit('reporter_id', '20', '1 hour');

drop trigger if exists rate_limit_match_participants on public.match_participants;
create trigger rate_limit_match_participants before insert on public.match_participants
  for each row execute function private.enforce_insert_rate_limit('user_id', '40', '1 hour', 'joined_at');

drop trigger if exists rate_limit_teams on public.teams;
create trigger rate_limit_teams before insert on public.teams
  for each row execute function private.enforce_insert_rate_limit('captain_id', '5', '1 day');

drop trigger if exists rate_limit_team_invites on public.team_invites;
create trigger rate_limit_team_invites before insert on public.team_invites
  for each row execute function private.enforce_insert_rate_limit('invited_by', '40', '1 hour');

drop trigger if exists rate_limit_team_challenges on public.team_challenges;
create trigger rate_limit_team_challenges before insert on public.team_challenges
  for each row execute function private.enforce_insert_rate_limit('created_by', '10', '1 hour');

drop trigger if exists rate_limit_challenge_requests on public.challenge_requests;
create trigger rate_limit_challenge_requests before insert on public.challenge_requests
  for each row execute function private.enforce_insert_rate_limit('requested_by', '20', '1 hour');

-- 2) Price sanity -----------------------------------------------------------------------------
-- The match price is a number shown to players (there is no in-app payment). Reject absurd values
-- on the server so a tampered request cannot publish a EUR 99,999 game.
alter table public.matches drop constraint if exists matches_price_reasonable;
alter table public.matches
  add constraint matches_price_reasonable check (price_eur between 0 and 500) not valid;
alter table public.matches validate constraint matches_price_reasonable;
