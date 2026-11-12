begin;
create extension if not exists pgtap with schema extensions;
create temporary table phase10_tap(result text);
create temporary table phase10_ids(label text primary key,id uuid not null);
grant select,insert on phase10_tap,phase10_ids to anon,authenticated;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data) values
 ('00000000-0000-4000-8000-000000000401','authenticated','authenticated','phase10-captain@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000402','authenticated','authenticated','phase10-player@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000403','authenticated','authenticated','phase10-second@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000404','authenticated','authenticated','phase10-outsider@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000405','authenticated','authenticated','phase10-unverified@example.invalid','',now(),'{"provider":"email","providers":["email"]}');
update public.profiles profile set display_name=case profile.id
 when '00000000-0000-4000-8000-000000000401' then 'Captain Alex'
 when '00000000-0000-4000-8000-000000000402' then 'Bobby Player'
 when '00000000-0000-4000-8000-000000000403' then 'Claire Second'
 when '00000000-0000-4000-8000-000000000404' then 'David Outsider'
 else 'Eve Unverified' end,city_id=city.id,area_id=area.id,
 onboarding_complete=(profile.id<>'00000000-0000-4000-8000-000000000405')
from public.cities city join public.areas area on area.city_id=city.id and area.slug='strovolos'
where city.slug='nicosia' and profile.id in ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000404','00000000-0000-4000-8000-000000000405');

select plan(40);
insert into phase10_tap select has_table('public','teams','team table exists');
insert into phase10_tap select has_table('public','team_members','team memberships table exists');
insert into phase10_tap select has_table('public','team_invites','team invitation table exists');
insert into phase10_tap select ok((select relrowsecurity from pg_class where oid='public.teams'::regclass),'team table has RLS enabled');
set local role anon;
insert into phase10_tap select is((select count(*)::integer from public.list_team_directory()),0,'anonymous visitor can use the safe public directory');
insert into phase10_tap select throws_ok($$select user_id from public.team_members$$,'42501','permission denied for table team_members','anonymous visitor cannot read member records');
insert into phase10_tap select throws_ok($$select invited_user_id from public.team_invites$$,'42501','permission denied for table team_invites','anonymous visitor cannot read private invitations');
insert into phase10_tap select ok(not has_function_privilege('anon','public.create_team(text,uuid,text)','EXECUTE'),'anonymous visitor cannot create a team');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000405","role":"authenticated"}',true);
insert into phase10_tap select throws_ok($$select public.create_team('Unverified Team',(select id from public.cities limit 1),null)$$,'42501','verified_profile_required','incomplete profile cannot create a team');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated"}',true);
insert into phase10_ids select 'team_one',public.create_team('Nicosia Rovers',(select id from public.cities where slug='nicosia'),'First team');
insert into phase10_tap select is((select count(*)::integer from public.get_my_teams()),1,'captain sees the newly created team');
insert into phase10_tap select is((select role from public.get_my_teams() limit 1),'captain','creator is the team captain');
insert into phase10_tap select throws_ok($$select * from public.search_team_invite_candidates((select id from phase10_ids where label='team_one'),'Bo')$$,'22023','search_query_too_short','candidate search requires three characters');
insert into phase10_tap select is((select display_name from public.search_team_invite_candidates((select id from phase10_ids where label='team_one'),'Bob') limit 1),'Bobby Player','captain can find eligible local player');
insert into phase10_tap select lives_ok($$select public.invite_team_member((select id from phase10_ids where label='team_one'),'00000000-0000-4000-8000-000000000402')$$,'captain sends an invitation');
insert into phase10_tap select is((select count(*)::integer from public.search_team_invite_candidates((select id from phase10_ids where label='team_one'),'Bob')),0,'already invited player is hidden from candidate results');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000402","role":"authenticated"}',true);
insert into phase10_tap select is((select count(*)::integer from public.get_my_team_invites()),1,'only the invited player sees their pending invitation');
insert into phase10_tap select is(public.respond_team_invite((select invite_id from public.get_my_team_invites() where team_id=(select id from phase10_ids where label='team_one')),'accept'),'accepted','invite acceptance creates membership');
insert into phase10_tap select is((select count(*)::integer from public.get_my_teams()),1,'accepted player sees their membership');
insert into phase10_tap select is(public.get_team_details((select id from phase10_ids where label='team_one'))->'members'->0->>'user_id',null::text,'non-captain roster does not expose user identifiers');
insert into phase10_tap select throws_ok($$select public.update_team((select id from phase10_ids where label='team_one'),'Hijacked Team',(select id from public.cities limit 1),null)$$,'42501','team_not_owned','member cannot modify team details');
insert into phase10_tap select throws_ok($$select public.transfer_team_captain((select id from phase10_ids where label='team_one'),'00000000-0000-4000-8000-000000000402')$$,'42501','team_not_owned','member cannot transfer captaincy');
insert into phase10_tap select throws_ok($$select public.invite_team_member((select id from phase10_ids where label='team_one'),'00000000-0000-4000-8000-000000000403')$$,'42501','team_not_owned','member cannot invite players');
insert into phase10_tap select is(public.leave_team((select id from phase10_ids where label='team_one')),'left','member can leave the team');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated"}',true);
insert into phase10_tap select lives_ok($$select public.update_team((select id from phase10_ids where label='team_one'),'Nicosia Rovers Updated',(select id from public.cities where slug='nicosia'),'Updated description')$$,'captain edits their team');
insert into phase10_tap select lives_ok($$select public.invite_team_member((select id from phase10_ids where label='team_one'),'00000000-0000-4000-8000-000000000403')$$,'captain invites another player');
insert into phase10_ids select 'team_two',public.create_team('Second Squad',(select id from public.cities where slug='nicosia'),null);
select public.invite_team_member((select id from phase10_ids where label='team_one'),'00000000-0000-4000-8000-000000000402');
insert into phase10_tap select lives_ok($$select public.invite_team_member((select id from phase10_ids where label='team_two'),'00000000-0000-4000-8000-000000000402')$$,'captain invites a player to another team');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000402","role":"authenticated"}',true);
insert into phase10_tap select is(public.respond_team_invite((select invite_id from public.get_my_team_invites() where team_id=(select id from phase10_ids where label='team_one')),'accept'),'accepted','former member can accept a new invitation');
insert into phase10_tap select is((select count(*)::integer from public.get_my_teams()),1,'member can rejoin the same team after leaving');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated"}',true);
insert into phase10_tap select is(jsonb_array_length(public.get_team_details((select id from phase10_ids where label='team_one'))->'members'),2,'captain sees roster with their own captain controls');
insert into phase10_tap select is(public.get_team_details((select id from phase10_ids where label='team_one'))->'members'->1->>'user_id','00000000-0000-4000-8000-000000000402','captain receives the member identifier required for transfer');
insert into phase10_tap select throws_ok($$select public.remove_team_member((select id from phase10_ids where label='team_one'),((public.get_team_details((select id from phase10_ids where label='team_one'))->'members'->0->>'id')::uuid))$$,'22023','captain_transfer_required','captain cannot remove self');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000402","role":"authenticated"}',true);
insert into phase10_tap select is(public.respond_team_invite((select invite_id from public.get_my_team_invites() where team_id=(select id from phase10_ids where label='team_two')),'accept'),'accepted','same user may join a second team');
insert into phase10_tap select is((select count(*)::integer from public.get_my_teams()),2,'member can belong to two teams at once');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated"}',true);
insert into phase10_tap select lives_ok($$select public.transfer_team_captain((select id from phase10_ids where label='team_one'),'00000000-0000-4000-8000-000000000402')$$,'captain transfers leadership to active member');
reset role;
insert into phase10_tap select is((select captain_id from public.teams where id=(select id from phase10_ids where label='team_one')),'00000000-0000-4000-8000-000000000402'::uuid,'team ownership follows the transferred captain');
insert into phase10_tap select is((select role from public.team_members where team_id=(select id from phase10_ids where label='team_one') and user_id='00000000-0000-4000-8000-000000000401' and status='active'),'member','former captain remains a member');
insert into phase10_tap select is((select role from public.team_members where team_id=(select id from phase10_ids where label='team_one') and user_id='00000000-0000-4000-8000-000000000402' and status='active'),'captain','new captain receives captain role');
insert into phase10_ids select 'former_captain_member',id from public.team_members where team_id=(select id from phase10_ids where label='team_one') and user_id='00000000-0000-4000-8000-000000000401';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000401","role":"authenticated"}',true);
insert into phase10_tap select throws_ok($$select public.update_team((select id from phase10_ids where label='team_one'),'Unauthorized',(select id from public.cities limit 1),null)$$,'42501','team_not_owned','former captain cannot edit team');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000402","role":"authenticated"}',true);
insert into phase10_tap select lives_ok($$select public.remove_team_member((select id from phase10_ids where label='team_one'),(select id from phase10_ids where label='former_captain_member'))$$,'current captain can remove a team member');
insert into phase10_tap select throws_ok($$select public.leave_team((select id from phase10_ids where label='team_one'))$$,'22023','captain_transfer_required','captain must transfer ownership before leaving');
reset role;

select * from finish();
select coalesce(jsonb_agg(result),'[]'::jsonb) from phase10_tap where result like '%not ok%';
rollback;
