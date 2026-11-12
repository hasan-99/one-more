create table public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible','removed')),
  created_at timestamptz not null default clock_timestamp()
);
create index match_messages_match_history_idx on public.match_messages(match_id,created_at desc,id desc);
create index match_messages_sender_idx on public.match_messages(sender_id);
alter table public.match_messages enable row level security;
revoke all on public.match_messages from public,anon,authenticated;
grant select on public.match_messages to authenticated;

create table public.match_message_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.match_messages(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','inappropriate')),
  details text check (details is null or char_length(btrim(details)) <= 500),
  status text not null default 'open' check (status in ('open','reviewed','dismissed')),
  created_at timestamptz not null default now(),
  unique(message_id,reporter_id)
);
create index match_message_reports_match_idx on public.match_message_reports(message_id,status,created_at);
alter table public.match_message_reports enable row level security;
revoke all on public.match_message_reports from public,anon,authenticated;
create policy "Message reports are server managed"
  on public.match_message_reports for all to public,anon,authenticated using(false) with check(false);

create function private.can_access_match_chat(p_match_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.matches match_row where match_row.id=p_match_id
      and match_row.event_status='published'
      and (match_row.organizer_id=auth.uid() or exists(
        select 1 from public.match_participants participant where participant.match_id=match_row.id
          and participant.user_id=auth.uid() and participant.status='active'
      ))
  )
$$;
revoke all on function private.can_access_match_chat(uuid) from public,anon,authenticated;
grant execute on function private.can_access_match_chat(uuid) to authenticated;
create policy "Active match chat members can read messages"
  on public.match_messages for select to authenticated
  using (private.can_access_match_chat(match_id));

create function public.get_match_chat_access(p_match_id uuid)
returns boolean language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  return private.can_access_match_chat(p_match_id);
end;
$$;

create function public.get_match_chat_messages(
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
      and (p_before_created_at is null or (message.created_at,message.id)<(p_before_created_at,p_before_id))
    order by message.created_at desc,message.id desc
    limit greatest(1,least(coalesce(p_limit,50),50));
end;
$$;

create function public.send_match_message(p_match_id uuid,p_body text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  message_id uuid;
  cleaned_body text := btrim(coalesce(p_body,''));
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not private.can_access_match_chat(p_match_id) then raise exception 'match_chat_access_denied' using errcode='42501'; end if;
  if char_length(cleaned_body) not between 1 and 1000 then raise exception 'invalid_message_length' using errcode='22023'; end if;
  insert into public.match_messages(match_id,sender_id,body)
    values(p_match_id,auth.uid(),cleaned_body) returning id into message_id;
  return message_id;
end;
$$;

create function public.report_match_message(p_message_id uuid,p_reason text,p_details text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  message_row public.match_messages%rowtype;
  report_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_reason not in ('spam','harassment','inappropriate') then raise exception 'invalid_report_reason' using errcode='22023'; end if;
  select * into message_row from public.match_messages where id=p_message_id for update;
  if not found or not private.can_access_match_chat(message_row.match_id) then
    raise exception 'match_chat_access_denied' using errcode='42501';
  end if;
  if message_row.sender_id=auth.uid() then raise exception 'cannot_report_own_message' using errcode='22023'; end if;
  if message_row.status<>'visible' then raise exception 'message_unavailable' using errcode='22023'; end if;
  if p_details is not null and char_length(btrim(p_details))>500 then raise exception 'report_details_too_long' using errcode='22023'; end if;
  insert into public.match_message_reports(message_id,reporter_id,reason,details)
    values(p_message_id,auth.uid(),p_reason,nullif(btrim(p_details),''))
    on conflict(message_id,reporter_id) do update set reason=excluded.reason,details=excluded.details
    returning id into report_id;
  return report_id;
end;
$$;

create function public.moderate_match_message(p_message_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  message_row public.match_messages%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into message_row from public.match_messages where id=p_message_id for update;
  if not found or not exists(select 1 from public.matches where id=message_row.match_id
    and organizer_id=auth.uid() and event_status='published') then
    raise exception 'match_not_owned' using errcode='42501';
  end if;
  update public.match_messages set status='removed',body='[removed]' where id=p_message_id and status='visible';
  update public.match_message_reports set status='reviewed' where message_id=p_message_id and status='open';
end;
$$;

revoke all on function public.get_match_chat_access(uuid) from public,anon,authenticated;
revoke all on function public.get_match_chat_messages(uuid,timestamptz,uuid,integer) from public,anon,authenticated;
revoke all on function public.send_match_message(uuid,text) from public,anon,authenticated;
revoke all on function public.report_match_message(uuid,text,text) from public,anon,authenticated;
revoke all on function public.moderate_match_message(uuid) from public,anon,authenticated;
grant execute on function public.get_match_chat_access(uuid) to authenticated;
grant execute on function public.get_match_chat_messages(uuid,timestamptz,uuid,integer) to authenticated;
grant execute on function public.send_match_message(uuid,text) to authenticated;
grant execute on function public.report_match_message(uuid,text,text) to authenticated;
grant execute on function public.moderate_match_message(uuid) to authenticated;

alter publication supabase_realtime add table public.match_messages;
