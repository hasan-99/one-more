create policy "Notification outbox is server only"
  on public.notification_outbox for all to anon, authenticated
  using (false)
  with check (false);
