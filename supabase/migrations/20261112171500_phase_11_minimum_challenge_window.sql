alter table public.challenge_windows add constraint challenge_windows_minimum_duration
  check (ends_at >= starts_at + interval '90 minutes');
