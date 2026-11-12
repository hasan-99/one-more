create function private.dispatch_new_notification_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.dispatch_notification_outbox(new.id);
  return new;
end;
$$;
revoke all on function private.dispatch_new_notification_outbox() from public, anon, authenticated;
create trigger notification_outbox_dispatch_immediately
  after insert on public.notification_outbox
  for each row execute function private.dispatch_new_notification_outbox();
