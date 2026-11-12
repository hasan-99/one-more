create table public.teams (
  id uuid primary key default gen_random_uuid(),
  captain_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  city_id uuid not null references public.cities(id) on delete restrict,
  description text check (description is null or char_length(btrim(description)) <= 500),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index teams_city_status_idx on public.teams(city_id,status,name);
create index teams_captain_idx on public.teams(captain_id);
create trigger teams_set_updated_at before update on public.teams
  for each row execute function private.set_updated_at();

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('captain','member')),
  status text not null default 'active' check (status in ('active','left')),
  joined_at timestamptz not null default now(),
  unique(team_id,id)
);
create unique index team_members_one_active_user
  on public.team_members(team_id,user_id) where status='active';
create index team_members_user_active_idx on public.team_members(user_id,team_id) where status='active';
create index team_members_team_roster_idx on public.team_members(team_id,joined_at,id) where status='active';

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','revoked','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '7 days'),
  responded_at timestamptz,
  unique(team_id,id)
);
create unique index team_invites_one_pending_user
  on public.team_invites(team_id,invited_user_id) where status='pending';
create index team_invites_user_pending_idx on public.team_invites(invited_user_id,expires_at) where status='pending';
create index team_invites_team_status_idx on public.team_invites(team_id,status,created_at);

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
revoke all on public.teams,public.team_members,public.team_invites from public,anon,authenticated;
grant select(id,name,city_id,description,status,created_at) on public.teams to anon,authenticated;
grant select(id,team_id,user_id,role,status,joined_at) on public.team_members to authenticated;
create policy "Active teams are discoverable"
  on public.teams for select to anon,authenticated using(status='active');
create policy "Players see their own team membership rows"
  on public.team_members for select to authenticated using(user_id=(select auth.uid()));
create policy "Team invitations are server managed"
  on public.team_invites for all to public,anon,authenticated using(false) with check(false);

create function public.list_team_directory()
returns table(team_id uuid,name text,city_id uuid,city_name_en text,city_name_el text,description text,member_count integer,created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select team.id,team.name,team.city_id,city.name_en,city.name_el,team.description,
    (select count(*)::integer from public.team_members member where member.team_id=team.id and member.status='active'),
    team.created_at
  from public.teams team join public.cities city on city.id=team.city_id
  where team.status='active'
  order by team.created_at desc,team.id
  limit 100
$$;

create function public.create_team(p_name text,p_city_id uuid,p_description text default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  team_id uuid;
  clean_name text := btrim(coalesce(p_name,''));
  clean_description text := nullif(btrim(coalesce(p_description,'')),'');
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode='42501';
  end if;
  if char_length(clean_name) not between 2 and 80 then raise exception 'invalid_team_name' using errcode='22023'; end if;
  if clean_description is not null and char_length(clean_description)>500 then raise exception 'team_description_too_long' using errcode='22023'; end if;
  if not exists(select 1 from public.cities where id=p_city_id) then raise exception 'city_not_found' using errcode='22023'; end if;
  insert into public.teams(captain_id,name,city_id,description) values(auth.uid(),clean_name,p_city_id,clean_description)
    returning id into team_id;
  insert into public.team_members(team_id,user_id,role,status) values(team_id,auth.uid(),'captain','active');
  return team_id;
end;
$$;

create function public.update_team(p_team_id uuid,p_name text,p_city_id uuid,p_description text default null)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  clean_name text := btrim(coalesce(p_name,''));
  clean_description text := nullif(btrim(coalesce(p_description,'')),'');
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if char_length(clean_name) not between 2 and 80 then raise exception 'invalid_team_name' using errcode='22023'; end if;
  if clean_description is not null and char_length(clean_description)>500 then raise exception 'team_description_too_long' using errcode='22023'; end if;
  if not exists(select 1 from public.cities where id=p_city_id) then raise exception 'city_not_found' using errcode='22023'; end if;
  update public.teams set name=clean_name,city_id=p_city_id,description=clean_description
    where id=p_team_id and captain_id=auth.uid() and status='active';
  if not found then raise exception 'team_not_owned' using errcode='42501'; end if;
end;
$$;

create function public.get_my_teams()
returns table(team_id uuid,name text,city_id uuid,city_name_en text,city_name_el text,description text,role text,member_count integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  return query select team.id,team.name,team.city_id,city.name_en,city.name_el,team.description,member.role,
    (select count(*)::integer from public.team_members active_member where active_member.team_id=team.id and active_member.status='active')
  from public.team_members member join public.teams team on team.id=member.team_id
    join public.cities city on city.id=team.city_id
  where member.user_id=auth.uid() and member.status='active' and team.status='active'
  order by team.name,team.id;
end;
$$;

create function public.get_my_team_invites()
returns table(invite_id uuid,team_id uuid,team_name text,city_name_en text,city_name_el text,invited_by_name text,expires_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  return query select invite.id,team.id,team.name,city.name_en,city.name_el,coalesce(profile.display_name,'Player'),invite.expires_at
  from public.team_invites invite join public.teams team on team.id=invite.team_id
    join public.cities city on city.id=team.city_id join public.profiles profile on profile.id=invite.invited_by
  where invite.invited_user_id=auth.uid() and invite.status='pending' and invite.expires_at>now() and team.status='active'
  order by invite.created_at,invite.id;
end;
$$;

create function public.respond_team_invite(p_invite_id uuid,p_decision text)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  invite_row public.team_invites%rowtype;
  team_row public.teams%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_decision not in('accept','decline') then raise exception 'invalid_invite_decision' using errcode='22023'; end if;
  select * into invite_row from public.team_invites where id=p_invite_id and invited_user_id=auth.uid() for update;
  if not found then raise exception 'team_invite_not_found' using errcode='P0002'; end if;
  if invite_row.status='accepted' and p_decision='accept' then return 'accepted'; end if;
  if invite_row.status='declined' and p_decision='decline' then return 'declined'; end if;
  if invite_row.status<>'pending' then raise exception 'team_invite_unavailable' using errcode='22023'; end if;
  select * into team_row from public.teams where id=invite_row.team_id for update;
  if team_row.status<>'active' then raise exception 'team_unavailable' using errcode='22023'; end if;
  if invite_row.expires_at<=now() then
    update public.team_invites set status='expired',responded_at=now() where id=p_invite_id;
    return 'expired';
  end if;
  if p_decision='decline' then
    update public.team_invites set status='declined',responded_at=now() where id=p_invite_id;
    return 'declined';
  end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and onboarding_complete) then
    raise exception 'verified_profile_required' using errcode='42501';
  end if;
  insert into public.team_members(team_id,user_id,role,status) values(team_row.id,auth.uid(),'member','active')
    on conflict(team_id,user_id) where status='active' do nothing;
  update public.team_invites set status='accepted',responded_at=now() where id=p_invite_id;
  return 'accepted';
end;
$$;

create function public.search_team_invite_candidates(p_team_id uuid,p_query text)
returns table(user_id uuid,display_name text)
language plpgsql stable security definer set search_path = ''
as $$
declare
  query_text text := btrim(coalesce(p_query,''));
  team_city uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if char_length(query_text)<3 then raise exception 'search_query_too_short' using errcode='22023'; end if;
  select city_id into team_city from public.teams where id=p_team_id and captain_id=auth.uid() and status='active';
  if not found then raise exception 'team_not_owned' using errcode='42501'; end if;
  return query select profile.id,profile.display_name
  from public.profiles profile
  where profile.onboarding_complete and profile.city_id=team_city and profile.id<>auth.uid()
    and position(lower(query_text) in lower(profile.display_name))>0
    and not exists(select 1 from public.team_members member where member.team_id=p_team_id
      and member.user_id=profile.id and member.status='active')
    and not exists(select 1 from public.team_invites invite where invite.team_id=p_team_id
      and invite.invited_user_id=profile.id and invite.status='pending' and invite.expires_at>now())
  order by profile.display_name,profile.id limit 15;
end;
$$;

create function public.invite_team_member(p_team_id uuid,p_invited_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  team_row public.teams%rowtype;
  invite_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into team_row from public.teams where id=p_team_id and status='active' and captain_id=auth.uid() for update;
  if not found then raise exception 'team_not_owned' using errcode='42501'; end if;
  if p_invited_user_id=auth.uid() then raise exception 'cannot_invite_self' using errcode='22023'; end if;
  if not exists(select 1 from public.profiles where id=p_invited_user_id and onboarding_complete) then
    raise exception 'team_candidate_unavailable' using errcode='22023';
  end if;
  if not exists(select 1 from public.profiles where id=p_invited_user_id and city_id=team_row.city_id) then
    raise exception 'team_candidate_unavailable' using errcode='22023';
  end if;
  if exists(select 1 from public.team_members where team_id=p_team_id and user_id=p_invited_user_id and status='active') then
    raise exception 'already_team_member' using errcode='22023';
  end if;
  update public.team_invites set status='expired',responded_at=now()
    where team_id=p_team_id and invited_user_id=p_invited_user_id and status='pending' and expires_at<=now();
  insert into public.team_invites(team_id,invited_user_id,invited_by)
    values(p_team_id,p_invited_user_id,auth.uid()) on conflict(team_id,invited_user_id) where status='pending' do nothing
    returning id into invite_id;
  if invite_id is null then select id into invite_id from public.team_invites
    where team_id=p_team_id and invited_user_id=p_invited_user_id and status='pending'; end if;
  return invite_id;
end;
$$;

create function public.get_team_details(p_team_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  team_row public.teams%rowtype;
  viewer_role text;
  member_list jsonb;
  invite_list jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select * into team_row from public.teams where id=p_team_id and status='active';
  if not found then return null; end if;
  select member.role into viewer_role from public.team_members member
    where member.team_id=p_team_id and member.user_id=auth.uid() and member.status='active';
  select coalesce(jsonb_agg(jsonb_build_object('id',member.id,'display_name',coalesce(profile.display_name,'Player'),
      'role',member.role,'joined_at',member.joined_at) order by case member.role when 'captain' then 0 else 1 end,member.joined_at,member.id),'[]'::jsonb)
    into member_list from public.team_members member join public.profiles profile on profile.id=member.user_id
    where member.team_id=p_team_id and member.status='active';
  if team_row.captain_id=auth.uid() then
    select coalesce(jsonb_agg(jsonb_build_object('id',invite.id,'display_name',coalesce(profile.display_name,'Player'),
        'expires_at',invite.expires_at) order by invite.created_at,invite.id),'[]'::jsonb)
      into invite_list from public.team_invites invite join public.profiles profile on profile.id=invite.invited_user_id
      where invite.team_id=p_team_id and invite.status='pending' and invite.expires_at>now();
  else invite_list := '[]'::jsonb;
  end if;
  return jsonb_build_object('id',team_row.id,'name',team_row.name,'city_id',team_row.city_id,
    'city_name_en',(select name_en from public.cities where id=team_row.city_id),
    'city_name_el',(select name_el from public.cities where id=team_row.city_id),
    'description',team_row.description,'viewer_role',viewer_role,'members',member_list,'invites',invite_list);
end;
$$;

create function public.remove_team_member(p_team_id uuid,p_member_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  member_row public.team_members%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  perform 1 from public.teams where id=p_team_id and captain_id=auth.uid() and status='active' for update;
  if not found then raise exception 'team_not_owned' using errcode='42501'; end if;
  select * into member_row from public.team_members where id=p_member_id and team_id=p_team_id and status='active' for update;
  if not found then raise exception 'team_member_not_found' using errcode='P0002'; end if;
  if member_row.role='captain' then raise exception 'captain_transfer_required' using errcode='22023'; end if;
  update public.team_members set status='left' where id=p_member_id;
  return 'removed';
end;
$$;

create function public.leave_team(p_team_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare
  member_row public.team_members%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  perform 1 from public.teams where id=p_team_id and status='active' for update;
  if not found then raise exception 'team_unavailable' using errcode='22023'; end if;
  select * into member_row from public.team_members where team_id=p_team_id and user_id=auth.uid() and status='active' for update;
  if not found then raise exception 'team_member_not_found' using errcode='P0002'; end if;
  if member_row.role='captain' then raise exception 'captain_transfer_required' using errcode='22023'; end if;
  update public.team_members set status='left' where id=member_row.id;
  return 'left';
end;
$$;

create function public.transfer_team_captain(p_team_id uuid,p_new_captain_user_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  old_member public.team_members%rowtype;
  next_member public.team_members%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  perform 1 from public.teams where id=p_team_id and captain_id=auth.uid() and status='active' for update;
  if not found then raise exception 'team_not_owned' using errcode='42501'; end if;
  select * into old_member from public.team_members where team_id=p_team_id and user_id=auth.uid() and role='captain' and status='active' for update;
  if old_member.id is null then raise exception 'captain_membership_missing' using errcode='42501'; end if;
  select * into next_member from public.team_members where team_id=p_team_id and user_id=p_new_captain_user_id and status='active' for update;
  if not found or next_member.id is null then raise exception 'captain_candidate_not_active_member' using errcode='22023'; end if;
  update public.team_members set role='member' where id=old_member.id;
  update public.team_members set role='captain' where id=next_member.id;
  update public.teams set captain_id=p_new_captain_user_id where id=p_team_id;
end;
$$;

create function public.revoke_team_invite(p_team_id uuid,p_invite_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.teams where id=p_team_id and captain_id=auth.uid() and status='active') then
    raise exception 'team_not_owned' using errcode='42501';
  end if;
  update public.team_invites set status='revoked',responded_at=now()
    where id=p_invite_id and team_id=p_team_id and status='pending';
  if not found then raise exception 'team_invite_not_found' using errcode='P0002'; end if;
  return 'revoked';
end;
$$;

revoke all on function public.list_team_directory() from public,anon,authenticated;
revoke all on function public.create_team(text,uuid,text) from public,anon,authenticated;
revoke all on function public.update_team(uuid,text,uuid,text) from public,anon,authenticated;
revoke all on function public.get_my_teams() from public,anon,authenticated;
revoke all on function public.get_my_team_invites() from public,anon,authenticated;
revoke all on function public.respond_team_invite(uuid,text) from public,anon,authenticated;
revoke all on function public.search_team_invite_candidates(uuid,text) from public,anon,authenticated;
revoke all on function public.invite_team_member(uuid,uuid) from public,anon,authenticated;
revoke all on function public.get_team_details(uuid) from public,anon,authenticated;
revoke all on function public.remove_team_member(uuid,uuid) from public,anon,authenticated;
revoke all on function public.leave_team(uuid) from public,anon,authenticated;
revoke all on function public.transfer_team_captain(uuid,uuid) from public,anon,authenticated;
revoke all on function public.revoke_team_invite(uuid,uuid) from public,anon,authenticated;
grant execute on function public.list_team_directory() to anon,authenticated;
grant execute on function public.create_team(text,uuid,text) to authenticated;
grant execute on function public.update_team(uuid,text,uuid,text) to authenticated;
grant execute on function public.get_my_teams() to authenticated;
grant execute on function public.get_my_team_invites() to authenticated;
grant execute on function public.respond_team_invite(uuid,text) to authenticated;
grant execute on function public.search_team_invite_candidates(uuid,text) to authenticated;
grant execute on function public.invite_team_member(uuid,uuid) to authenticated;
grant execute on function public.get_team_details(uuid) to authenticated;
grant execute on function public.remove_team_member(uuid,uuid) to authenticated;
grant execute on function public.leave_team(uuid) to authenticated;
grant execute on function public.transfer_team_captain(uuid,uuid) to authenticated;
grant execute on function public.revoke_team_invite(uuid,uuid) to authenticated;
