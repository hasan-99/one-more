create table public.team_challenges (
  id uuid primary key default gen_random_uuid(),
  home_team_id uuid not null references public.teams(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  format smallint not null check (format in (5,7,8,11)),
  city_id uuid not null references public.cities(id) on delete restrict,
  area_id uuid not null,
  skill_level text check (skill_level is null or skill_level in ('beginner','intermediate','advanced')),
  note text check (note is null or char_length(btrim(note)) <= 500),
  status text not null default 'open' check (status in ('open','negotiating','matched','cancelled','expired')),
  proposed_starts_at timestamptz,
  proposed_area_id uuid,
  proposed_venue_name text,
  proposed_venue_address text,
  home_proposed_at timestamptz,
  agreed_starts_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_challenges_area_city_fk foreign key (area_id,city_id) references public.areas(id,city_id),
  constraint team_challenges_proposed_field check (
    (proposed_venue_name is null and proposed_venue_address is null and proposed_area_id is null)
    or (proposed_venue_name is not null and char_length(btrim(proposed_venue_name)) between 2 and 120
      and proposed_venue_address is not null and char_length(btrim(proposed_venue_address)) between 2 and 240
      and proposed_area_id is not null)
  )
);
create index team_challenges_city_status_idx on public.team_challenges(city_id,status,created_at desc);
create index team_challenges_home_team_idx on public.team_challenges(home_team_id,status);
create index team_challenges_creator_idx on public.team_challenges(created_by);
create index team_challenges_area_city_idx on public.team_challenges(area_id,city_id);
create trigger team_challenges_set_updated_at before update on public.team_challenges
  for each row execute function private.set_updated_at();

create table public.challenge_windows (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.team_challenges(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index challenge_windows_challenge_start_idx on public.challenge_windows(challenge_id,starts_at);

create table public.challenge_requests (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.team_challenges(id) on delete cascade,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique(challenge_id,id)
);
create unique index challenge_requests_team_active_idx on public.challenge_requests(challenge_id,away_team_id)
  where status in ('pending','accepted');
create unique index challenge_requests_one_accepted_idx on public.challenge_requests(challenge_id)
  where status='accepted';
create index challenge_requests_challenge_idx on public.challenge_requests(challenge_id);
create index challenge_requests_away_status_idx on public.challenge_requests(away_team_id,status,created_at desc);
create index challenge_requests_requested_by_idx on public.challenge_requests(requested_by);

alter table public.matches add column challenge_id uuid references public.team_challenges(id) on delete restrict;
create unique index matches_one_per_challenge_idx on public.matches(challenge_id) where challenge_id is not null;

alter table public.team_challenges enable row level security;
alter table public.challenge_windows enable row level security;
alter table public.challenge_requests enable row level security;
revoke all on public.team_challenges,public.challenge_windows,public.challenge_requests from public,anon,authenticated;
create policy "Challenges are only accessed through scoped RPCs" on public.team_challenges
  for all to public,anon,authenticated using(false) with check(false);
create policy "Challenge windows are only accessed through scoped RPCs" on public.challenge_windows
  for all to public,anon,authenticated using(false) with check(false);
create policy "Challenge requests are only accessed through scoped RPCs" on public.challenge_requests
  for all to public,anon,authenticated using(false) with check(false);

create function public.list_team_challenges(p_city_id uuid default null,p_format smallint default null)
returns table(challenge_id uuid,home_team_id uuid,home_team_name text,format smallint,city_id uuid,
  city_name_en text,city_name_el text,area_name_en text,area_name_el text,skill_level text,note text,
  status text,windows jsonb,request_count integer,created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select challenge.id,challenge.home_team_id,home_team.name,challenge.format,challenge.city_id,
    city.name_en,city.name_el,area.name_en,area.name_el,challenge.skill_level,challenge.note,challenge.status,
    coalesce((select jsonb_agg(jsonb_build_object('starts_at',win.starts_at,'ends_at',win.ends_at)
      order by win.starts_at) from public.challenge_windows win
      where win.challenge_id=challenge.id and win.ends_at>now()),'[]'::jsonb),
    (select count(*)::integer from public.challenge_requests request
      where request.challenge_id=challenge.id and request.status in ('pending','accepted')),
    challenge.created_at
  from public.team_challenges challenge
  join public.teams home_team on home_team.id=challenge.home_team_id
  join public.cities city on city.id=challenge.city_id
  join public.areas area on area.id=challenge.area_id and area.city_id=challenge.city_id
  where challenge.status='open'
    and exists(select 1 from public.challenge_windows win where win.challenge_id=challenge.id and win.ends_at>now())
    and (p_city_id is null or challenge.city_id=p_city_id)
    and (p_format is null or challenge.format=p_format)
  order by challenge.created_at desc,challenge.id
  limit 100
$$;

create function public.create_team_challenge(p_home_team_id uuid,p_format smallint,p_city_id uuid,
  p_area_id uuid,p_skill_level text,p_note text,p_windows jsonb)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  challenge_id uuid;
  window_item jsonb;
  window_count integer;
  window_start timestamptz;
  window_end timestamptz;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode='42501';
  end if;
  if not exists(select 1 from public.team_members where team_id=p_home_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  if p_format not in (5,7,8,11) or p_skill_level not in ('beginner','intermediate','advanced') and p_skill_level is not null then
    raise exception 'invalid_challenge_format' using errcode='22023';
  end if;
  if char_length(btrim(coalesce(p_note,'')))>500 then raise exception 'challenge_note_too_long' using errcode='22023'; end if;
  if not exists(select 1 from public.teams where id=p_home_team_id and city_id=p_city_id and status='active') then
    raise exception 'invalid_challenge_city' using errcode='22023';
  end if;
  if not exists(select 1 from public.areas where id=p_area_id and city_id=p_city_id) then raise exception 'invalid_challenge_area' using errcode='22023'; end if;
  if jsonb_typeof(p_windows)<>'array' then raise exception 'invalid_challenge_windows' using errcode='22023'; end if;
  window_count:=jsonb_array_length(p_windows);
  if window_count<1 or window_count>5 then raise exception 'invalid_challenge_windows' using errcode='22023'; end if;
  insert into public.team_challenges(home_team_id,created_by,format,city_id,area_id,skill_level,note)
    values(p_home_team_id,auth.uid(),p_format,p_city_id,p_area_id,p_skill_level,nullif(btrim(coalesce(p_note,'')),''))
    returning id into challenge_id;
  for window_item in select value from jsonb_array_elements(p_windows) loop
    begin
      window_start:=(window_item->>'starts_at')::timestamptz;
      window_end:=(window_item->>'ends_at')::timestamptz;
    exception when others then raise exception 'invalid_challenge_windows' using errcode='22023';
    end;
    if window_start<=now() or window_end<=window_start or window_end-window_start>interval '14 days' then
      raise exception 'invalid_challenge_windows' using errcode='22023';
    end if;
    insert into public.challenge_windows(challenge_id,starts_at,ends_at) values(challenge_id,window_start,window_end);
  end loop;
  return challenge_id;
end;
$$;

create function public.request_team_challenge(p_challenge_id uuid,p_away_team_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  challenge_row public.team_challenges%rowtype;
  request_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.team_members where team_id=p_away_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  select * into challenge_row from public.team_challenges where id=p_challenge_id for update;
  if not found or challenge_row.status<>'open' then raise exception 'challenge_unavailable' using errcode='22023'; end if;
  if p_away_team_id=challenge_row.home_team_id then raise exception 'cannot_challenge_own_team' using errcode='22023'; end if;
  if not exists(select 1 from public.teams where id=p_away_team_id and city_id=challenge_row.city_id and status='active') then
    raise exception 'challenge_city_mismatch' using errcode='22023';
  end if;
  if not exists(select 1 from public.challenge_windows where challenge_id=p_challenge_id and ends_at>now()) then
    update public.team_challenges set status='expired' where id=p_challenge_id;
    raise exception 'challenge_expired' using errcode='22023';
  end if;
  insert into public.challenge_requests(challenge_id,away_team_id,requested_by)
    values(p_challenge_id,p_away_team_id,auth.uid()) returning id into request_id;
  return request_id;
exception when unique_violation then
  raise exception 'challenge_request_already_active' using errcode='23505';
end;
$$;

create function public.respond_to_challenge_request(p_request_id uuid,p_decision text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  request_row public.challenge_requests%rowtype;
  challenge_row public.team_challenges%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_decision not in ('accept','decline') then raise exception 'invalid_challenge_decision' using errcode='22023'; end if;
  select challenge.* into challenge_row from public.team_challenges challenge
    join public.challenge_requests request on request.challenge_id=challenge.id
    where request.id=p_request_id for update of challenge;
  if not found or challenge_row.status<>'open' then raise exception 'challenge_unavailable' using errcode='22023'; end if;
  if not exists(select 1 from public.team_members where team_id=challenge_row.home_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  select * into request_row from public.challenge_requests where id=p_request_id and status='pending' for update;
  if not found then raise exception 'challenge_request_unavailable' using errcode='22023'; end if;
  if p_decision='decline' then
    update public.challenge_requests set status='rejected',responded_at=now() where id=p_request_id;
    return 'rejected';
  end if;
  update public.challenge_requests set status='accepted',responded_at=now() where id=p_request_id;
  update public.challenge_requests set status='rejected',responded_at=now()
    where challenge_id=challenge_row.id and id<>p_request_id and status='pending';
  update public.team_challenges set status='negotiating' where id=challenge_row.id;
  return 'accepted';
end;
$$;

create function public.withdraw_challenge_request(p_request_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  request_row public.challenge_requests%rowtype;
  challenge_status text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into request_row from public.challenge_requests where id=p_request_id for update;
  if not found then raise exception 'challenge_request_unavailable' using errcode='P0002'; end if;
  if not exists(select 1 from public.team_members where team_id=request_row.away_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  if request_row.status<>'pending' then raise exception 'challenge_request_unavailable' using errcode='22023'; end if;
  update public.challenge_requests set status='withdrawn',responded_at=now() where id=p_request_id;
  select status into challenge_status from public.team_challenges where id=request_row.challenge_id;
  if challenge_status='negotiating' then update public.team_challenges set status='open' where id=request_row.challenge_id; end if;
  return 'withdrawn';
end;
$$;

create function public.propose_challenge_match(p_challenge_id uuid,p_starts_at timestamptz,
  p_area_id uuid,p_venue_name text,p_venue_address text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  challenge_row public.team_challenges%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into challenge_row from public.team_challenges where id=p_challenge_id for update;
  if not found or challenge_row.status<>'negotiating' then raise exception 'challenge_unavailable' using errcode='22023'; end if;
  if not exists(select 1 from public.team_members where team_id=challenge_row.home_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  if p_starts_at<=now() or char_length(btrim(coalesce(p_venue_name,''))) not between 2 and 120
     or char_length(btrim(coalesce(p_venue_address,''))) not between 2 and 240
     or not exists(select 1 from public.areas where id=p_area_id and city_id=challenge_row.city_id) then
    raise exception 'invalid_challenge_match_slot' using errcode='22023';
  end if;
  if not exists(select 1 from public.challenge_requests request join public.challenge_windows win on win.challenge_id=request.challenge_id
    where request.challenge_id=p_challenge_id and request.status='accepted' and p_starts_at>=win.starts_at
      and p_starts_at+interval '90 minutes'<=win.ends_at) then
    raise exception 'match_slot_outside_challenge_windows' using errcode='22023';
  end if;
  update public.team_challenges set proposed_starts_at=p_starts_at,proposed_area_id=p_area_id,
    proposed_venue_name=btrim(p_venue_name),proposed_venue_address=btrim(p_venue_address),home_proposed_at=now()
    where id=p_challenge_id;
end;
$$;

create function public.confirm_challenge_match(p_challenge_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  challenge_row public.team_challenges%rowtype;
  request_row public.challenge_requests%rowtype;
  home_team public.teams%rowtype;
  away_team public.teams%rowtype;
  created_match_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into challenge_row from public.team_challenges where id=p_challenge_id for update;
  if not found then raise exception 'challenge_unavailable' using errcode='22023'; end if;
  if challenge_row.status='matched' then
    select id into created_match_id from public.matches where challenge_id=p_challenge_id;
    return created_match_id;
  end if;
  if challenge_row.status<>'negotiating' or challenge_row.home_proposed_at is null then
    raise exception 'challenge_slot_not_proposed' using errcode='22023';
  end if;
  select * into request_row from public.challenge_requests where challenge_id=p_challenge_id and status='accepted' for update;
  if not found then raise exception 'challenge_request_unavailable' using errcode='22023'; end if;
  if not exists(select 1 from public.team_members where team_id=request_row.away_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  if challenge_row.proposed_starts_at<=now() then raise exception 'invalid_challenge_match_slot' using errcode='22023'; end if;
  select * into home_team from public.teams where id=challenge_row.home_team_id;
  select * into away_team from public.teams where id=request_row.away_team_id;
  insert into public.matches(challenge_id,organizer_id,title,side_size,city_id,area_id,venue_display_name,
    venue_address,starts_at,duration_minutes,skill_level,event_status,notes)
  values(p_challenge_id,home_team.captain_id,
    left(home_team.name || ' vs ' || away_team.name,100),challenge_row.format,challenge_row.city_id,
    challenge_row.proposed_area_id,challenge_row.proposed_venue_name,challenge_row.proposed_venue_address,
    challenge_row.proposed_starts_at,90,challenge_row.skill_level,'published',challenge_row.note)
  returning id into created_match_id;
  update public.team_challenges set status='matched',agreed_starts_at=proposed_starts_at where id=p_challenge_id;
  return created_match_id;
end;
$$;

create function public.cancel_team_challenge(p_challenge_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  challenge_row public.team_challenges%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into challenge_row from public.team_challenges where id=p_challenge_id for update;
  if not found or challenge_row.status not in ('open','negotiating') then raise exception 'challenge_unavailable' using errcode='22023'; end if;
  if not exists(select 1 from public.team_members where team_id=challenge_row.home_team_id and user_id=auth.uid() and role='captain' and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  update public.team_challenges set status='cancelled' where id=p_challenge_id;
  update public.challenge_requests set status='rejected',responded_at=now()
    where challenge_id=p_challenge_id and status='pending';
  return 'cancelled';
end;
$$;

create function public.get_team_challenge_details(p_challenge_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  challenge_row public.team_challenges%rowtype;
  home_team_name text;
  home_role text;
  away_team_name text;
  request_list jsonb;
  windows_list jsonb;
  linked_match_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into challenge_row from public.team_challenges where id=p_challenge_id;
  if not found then return null; end if;
  select name into home_team_name from public.teams where id=challenge_row.home_team_id;
  select member.role into home_role from public.team_members member
    where member.team_id=challenge_row.home_team_id and member.user_id=auth.uid() and member.status='active';
  select team.name into away_team_name from public.challenge_requests request join public.teams team on team.id=request.away_team_id
    join public.team_members member on member.team_id=team.id and member.user_id=auth.uid() and member.status='active'
    where request.challenge_id=p_challenge_id order by request.created_at desc limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('id',win.id,'starts_at',win.starts_at,'ends_at',win.ends_at)
    order by win.starts_at),'[]'::jsonb) into windows_list from public.challenge_windows win where win.challenge_id=p_challenge_id;
  if home_role='captain' then
    select coalesce(jsonb_agg(jsonb_build_object('id',request.id,'team_name',team.name,'status',request.status)
      order by request.created_at,request.id),'[]'::jsonb) into request_list
    from public.challenge_requests request join public.teams team on team.id=request.away_team_id where request.challenge_id=p_challenge_id;
  else request_list:='[]'::jsonb;
  end if;
  select id into linked_match_id from public.matches where challenge_id=p_challenge_id;
  return jsonb_build_object('id',challenge_row.id,'home_team_id',challenge_row.home_team_id,
    'home_team_name',home_team_name,'viewer_home_role',home_role,'my_team_name',away_team_name,
    'format',challenge_row.format,'city_id',challenge_row.city_id,'area_id',challenge_row.area_id,
    'city_name_en',(select name_en from public.cities where id=challenge_row.city_id),
    'city_name_el',(select name_el from public.cities where id=challenge_row.city_id),
    'area_name_en',(select name_en from public.areas where id=challenge_row.area_id),
    'area_name_el',(select name_el from public.areas where id=challenge_row.area_id),
    'skill_level',challenge_row.skill_level,'note',challenge_row.note,'status',challenge_row.status,
    'windows',windows_list,'requests',request_list,'proposed_starts_at',challenge_row.proposed_starts_at,
    'proposed_area_id',challenge_row.proposed_area_id,'proposed_venue_name',challenge_row.proposed_venue_name,
    'proposed_venue_address',challenge_row.proposed_venue_address,'linked_match_id',linked_match_id);
end;
$$;

revoke all on function public.list_team_challenges(uuid,smallint) from public,anon,authenticated;
revoke all on function public.create_team_challenge(uuid,smallint,uuid,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.request_team_challenge(uuid,uuid) from public,anon,authenticated;
revoke all on function public.respond_to_challenge_request(uuid,text) from public,anon,authenticated;
revoke all on function public.withdraw_challenge_request(uuid) from public,anon,authenticated;
revoke all on function public.propose_challenge_match(uuid,timestamptz,uuid,text,text) from public,anon,authenticated;
revoke all on function public.confirm_challenge_match(uuid) from public,anon,authenticated;
revoke all on function public.cancel_team_challenge(uuid) from public,anon,authenticated;
revoke all on function public.get_team_challenge_details(uuid) from public,anon,authenticated;
grant execute on function public.list_team_challenges(uuid,smallint) to anon,authenticated;
grant execute on function public.create_team_challenge(uuid,smallint,uuid,uuid,text,text,jsonb) to authenticated;
grant execute on function public.request_team_challenge(uuid,uuid) to authenticated;
grant execute on function public.respond_to_challenge_request(uuid,text) to authenticated;
grant execute on function public.withdraw_challenge_request(uuid) to authenticated;
grant execute on function public.propose_challenge_match(uuid,timestamptz,uuid,text,text) to authenticated;
grant execute on function public.confirm_challenge_match(uuid) to authenticated;
grant execute on function public.cancel_team_challenge(uuid) to authenticated;
grant execute on function public.get_team_challenge_details(uuid) to authenticated;
