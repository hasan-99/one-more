-- Block abusive users (App Store 1.2 / Google Play UGC policy). A blocked player's chat messages are
-- hidden from the blocker on the server, so they never reach the blocker's device.
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks(blocked_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public, anon, authenticated;
grant select on public.user_blocks to authenticated;
drop policy if exists "Users can read their own blocks" on public.user_blocks;
create policy "Users can read their own blocks"
  on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create or replace function public.block_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_user_id is null or p_user_id = auth.uid() then raise exception 'invalid_block_target' using errcode = '22023'; end if;
  insert into public.user_blocks(blocker_id, blocked_id) values (auth.uid(), p_user_id)
  on conflict do nothing;
end;
$$;

create or replace function public.unblock_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_user_id;
end;
$$;

create or replace function public.get_my_blocked_users()
returns table(user_id uuid, display_name text, blocked_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  return query
    select b.blocked_id, coalesce(p.display_name, 'Player'), b.created_at
    from public.user_blocks b
    left join public.profiles p on p.id = b.blocked_id
    where b.blocker_id = auth.uid()
    order by b.created_at desc;
end;
$$;

revoke all on function public.block_user(uuid), public.unblock_user(uuid), public.get_my_blocked_users()
  from public, anon, authenticated;
grant execute on function public.block_user(uuid), public.unblock_user(uuid), public.get_my_blocked_users()
  to authenticated;

-- Same function as before, now without messages from players the caller has blocked.
create or replace function public.get_match_chat_messages(
  p_match_id uuid,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 50
)
returns table(id uuid,match_id uuid,sender_id uuid,sender_name text,body text,status text,created_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not private.can_access_match_chat(p_match_id) then raise exception 'match_chat_access_denied' using errcode='42501'; end if;
  return query
    select message.id,message.match_id,message.sender_id,coalesce(profile.display_name,'Player'),
      case when message.status='removed' then '' else message.body end,message.status,message.created_at
    from public.match_messages message
    join public.profiles profile on profile.id=message.sender_id
    where message.match_id=p_match_id
      and not exists (select 1 from public.user_blocks block
                      where block.blocker_id = auth.uid() and block.blocked_id = message.sender_id)
      and (p_before_created_at is null or (message.created_at,message.id)<(p_before_created_at,p_before_id))
    order by message.created_at desc,message.id desc
    limit greatest(1,least(coalesce(p_limit,50),50));
end;
$$;
