create or replace function public.get_team_details(p_team_id uuid)
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
  select coalesce(jsonb_agg(jsonb_build_object('id',member.id,
      'user_id',case when team_row.captain_id=auth.uid() then member.user_id else null end,
      'display_name',coalesce(profile.display_name,'Player'),'role',member.role,'joined_at',member.joined_at)
      order by case member.role when 'captain' then 0 else 1 end,member.joined_at,member.id),'[]'::jsonb)
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
