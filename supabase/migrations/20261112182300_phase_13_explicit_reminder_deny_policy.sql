create policy match_reminders_no_client_access
  on public.match_reminders
  for all
  to anon, authenticated
  using (false)
  with check (false);
