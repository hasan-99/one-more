-- When a game is published, players in the same city who are free that day get an in-app
-- notification. In-app only: rows go straight into the inbox (no outbox row, so no email).
alter table public.inbox_notifications
  alter column outbox_id drop not null,
  add column details jsonb not null default '{}'::jsonb;

create index inbox_notifications_match_published_idx
  on public.inbox_notifications ((details ->> 'match_id'))
  where event_type = 'match_published';

create function private.notify_match_published(p_match_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  game public.matches%rowtype;
  game_day text;
  game_hour integer;
  area_en text;
  area_el text;
  notified integer := 0;
begin
  select * into game from public.matches where id = p_match_id;
  if not found or game.event_status <> 'published' or game.starts_at <= now() then
    return 0;
  end if;
  game_day := lower(to_char(game.starts_at at time zone 'Asia/Nicosia', 'dy'));
  game_hour := extract(hour from game.starts_at at time zone 'Asia/Nicosia')::integer;
  select area.name_en, area.name_el into area_en, area_el
    from public.areas area where area.id = game.area_id;

  insert into public.inbox_notifications(recipient_id, event_type, title_key, body_key, href, details)
  select profile.id, 'match_published', 'notificationMatchPublishedTitle',
    'notificationMatchPublishedBody', '/matches/' || game.id::text,
    jsonb_build_object(
      'match_id', game.id, 'title', game.title, 'side_size', game.side_size,
      'starts_at', game.starts_at, 'area_name_en', area_en, 'area_name_el', area_el,
      'price_eur', game.price_eur,
      'open', greatest(0, 2 * game.side_size - game.reserved_guest_slots))
  from public.profiles profile
  join public.user_preferences prefs on prefs.user_id = profile.id
  where profile.onboarding_complete
    and profile.city_id = game.city_id
    and profile.id <> game.organizer_id
    and (
      game_day = any(prefs.availability_slots)
      or (game_day in ('sat', 'sun') and 'weekend_evening' = any(prefs.availability_slots) and game_hour >= 17)
      or (game_day not in ('sat', 'sun') and 'weekday_evening' = any(prefs.availability_slots) and game_hour >= 17)
    )
    and (cardinality(prefs.preferred_formats) = 0 or game.side_size = any(prefs.preferred_formats))
    and coalesce((select np.in_app_enabled from public.notification_preferences np
      where np.user_id = profile.id), true)
    and not exists (
      select 1 from public.inbox_notifications existing
      where existing.recipient_id = profile.id and existing.event_type = 'match_published'
        and existing.details ->> 'match_id' = game.id::text)
  limit 200;
  get diagnostics notified = row_count;
  return notified;
end;
$$;
revoke all on function private.notify_match_published(uuid) from public, anon, authenticated;

create function private.matches_notify_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.event_status = 'published'
     and (tg_op = 'INSERT' or old.event_status is distinct from 'published') then
    perform private.notify_match_published(new.id);
  end if;
  return new;
end;
$$;
revoke all on function private.matches_notify_published() from public, anon, authenticated;

create trigger matches_notify_published
  after insert or update of event_status on public.matches
  for each row execute function private.matches_notify_published();

-- The organizer can see how many players were told about their game.
create function public.count_match_published_notifications(p_match_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when exists (select 1 from public.matches m where m.id = p_match_id and m.organizer_id = auth.uid())
    then (select count(*)::integer from public.inbox_notifications n
      where n.event_type = 'match_published' and n.details ->> 'match_id' = p_match_id::text)
    else 0 end
$$;
revoke all on function public.count_match_published_notifications(uuid) from public, anon;
grant execute on function public.count_match_published_notifications(uuid) to authenticated;
