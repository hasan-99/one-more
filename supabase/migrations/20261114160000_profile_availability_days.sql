-- Profile "When you can play" now records weekdays (mon..sun) as in the
-- player-profile design. Legacy day-part slots stay valid so existing rows
-- and the onboarding editor keep working.
alter table public.user_preferences
  drop constraint if exists user_preferences_availability_slots_check;

alter table public.user_preferences
  add constraint user_preferences_availability_slots_check
  check (availability_slots <@ array[
    'weekday_morning', 'weekday_afternoon', 'weekday_evening',
    'weekend_morning', 'weekend_afternoon', 'weekend_evening',
    'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'
  ]::text[]);
