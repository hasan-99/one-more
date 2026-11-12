create or replace function private.dispatch_pending_notification_outbox()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.dispatch_notification_outbox(null);
  return 1;
end;
$$;
revoke all on function private.dispatch_pending_notification_outbox() from public, anon, authenticated;
