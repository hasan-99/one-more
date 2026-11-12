create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'cancelled')),
  requested_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint account_deletion_request_status_timestamp check (
    (status = 'requested' and cancelled_at is null) or
    (status = 'cancelled' and cancelled_at is not null)
  )
);

create unique index account_deletion_requests_one_active_per_user_idx
  on public.account_deletion_requests(user_id)
  where status = 'requested';

alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from public, anon, authenticated;
grant select (id, user_id, status, requested_at, cancelled_at)
  on public.account_deletion_requests to authenticated;
create policy "Users can read their own deletion requests"
  on public.account_deletion_requests for select to authenticated
  using (user_id = (select auth.uid()));

create function public.request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  request_id uuid;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  insert into public.account_deletion_requests(user_id)
  values (caller_id)
  on conflict (user_id) where status = 'requested' do nothing;

  select id into request_id
  from public.account_deletion_requests
  where user_id = caller_id and status = 'requested';

  return request_id;
end;
$$;
revoke all on function public.request_account_deletion() from public, anon, authenticated;
grant execute on function public.request_account_deletion() to authenticated;

create function public.cancel_account_deletion_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  update public.account_deletion_requests
  set status = 'cancelled', cancelled_at = now()
  where id = p_request_id and user_id = caller_id and status = 'requested';

  return found;
end;
$$;
revoke all on function public.cancel_account_deletion_request(uuid) from public, anon, authenticated;
grant execute on function public.cancel_account_deletion_request(uuid) to authenticated;
