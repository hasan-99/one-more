begin;
create extension if not exists pgtap with schema extensions;
create temporary table phase11_tap(result text);
create temporary table phase11_ids(label text primary key,id uuid not null);
grant select,insert on phase11_tap,phase11_ids to anon,authenticated;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data, raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000501','authenticated','authenticated','phase11-home@example.invalid','',now(),'{"provider":"email","providers":["email"]}', '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb),
 ('00000000-0000-4000-8000-000000000502','authenticated','authenticated','phase11-away@example.invalid','',now(),'{"provider":"email","providers":["email"]}', '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb),
 ('00000000-0000-4000-8000-000000000503','authenticated','authenticated','phase11-rival@example.invalid','',now(),'{"provider":"email","providers":["email"]}', '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb),
 ('00000000-0000-4000-8000-000000000504','authenticated','authenticated','phase11-member@example.invalid','',now(),'{"provider":"email","providers":["email"]}', '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb);
update public.profiles profile set display_name=case profile.id
 when '00000000-0000-4000-8000-000000000501' then 'Home Captain'
 when '00000000-0000-4000-8000-000000000502' then 'Away Captain'
 when '00000000-0000-4000-8000-000000000503' then 'Rival Captain'
 else 'Team Member' end,city_id=city.id,area_id=area.id,onboarding_complete=true
from public.cities city join public.areas area on area.city_id=city.id and area.slug='strovolos'
where city.slug='nicosia' and profile.id in ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000503','00000000-0000-4000-8000-000000000504');

select plan(41);
insert into phase11_tap select has_table('public','team_challenges','challenge table exists');
insert into phase11_tap select has_table('public','challenge_windows','challenge date windows table exists');
insert into phase11_tap select has_table('public','challenge_requests','opponent request table exists');
insert into phase11_tap select has_column('public','matches','challenge_id','match can link to a challenge');
insert into phase11_tap select ok((select relrowsecurity from pg_class where oid='public.challenge_requests'::regclass),'request table has RLS enabled');
set local role anon;
insert into phase11_tap select throws_ok($$select * from public.team_challenges$$,'42501','permission denied for table team_challenges','anonymous user cannot read private challenge rows');
insert into phase11_tap select throws_ok($$select * from public.challenge_windows$$,'42501','permission denied for table challenge_windows','anonymous user cannot read raw challenge windows');
insert into phase11_tap select throws_ok($$select * from public.challenge_requests$$,'42501','permission denied for table challenge_requests','anonymous user cannot read opponent requests');
insert into phase11_tap select is((select count(*)::integer from public.list_team_challenges()),0,'public list exposes only currently open challenges');
insert into phase11_tap select ok(not has_function_privilege('anon','public.create_team_challenge(uuid,smallint,uuid,uuid,text,text,jsonb)','EXECUTE'),'anonymous user cannot create a challenge');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
insert into phase11_ids select 'home_team',public.create_team('Home Eleven',(select id from public.cities where slug='nicosia'),null);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000502","role":"authenticated"}',true);
insert into phase11_ids select 'away_team',public.create_team('Away Eleven',(select id from public.cities where slug='nicosia'),null);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000503","role":"authenticated"}',true);
insert into phase11_ids select 'rival_team',public.create_team('Rival Eleven',(select id from public.cities where slug='nicosia'),null);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.create_team_challenge((select id from phase11_ids where label='away_team'),5::smallint,(select id from public.cities where slug='nicosia'),(select id from public.areas where slug='strovolos' limit 1),null,null,'[]'::jsonb)$$,'42501','team_not_owned','only the home captain can create a challenge for that team');
insert into phase11_ids select 'challenge_one',public.create_team_challenge(
 (select id from phase11_ids where label='home_team'),5::smallint,(select id from public.cities where slug='nicosia'),
 (select id from public.areas where slug='strovolos' limit 1),'intermediate','Friendly match',
 jsonb_build_array(jsonb_build_object('starts_at',now()+interval '10 days','ends_at',now()+interval '10 days 3 hours')));
insert into phase11_tap select is((select count(*)::integer from public.list_team_challenges((select id from public.cities where slug='nicosia'),5::smallint)),1,'open challenge appears with city and format filters');
insert into phase11_tap select is(jsonb_array_length((public.get_team_challenge_details((select id from phase11_ids where label='challenge_one')))->'windows'),1,'challenge returns its proposed date window');
insert into phase11_tap select throws_ok($$select public.create_team_challenge((select id from phase11_ids where label='home_team'),5::smallint,(select id from public.cities where slug='nicosia'),(select id from public.areas where slug='strovolos' limit 1),'intermediate',null,jsonb_build_array(jsonb_build_object('starts_at',now()-interval '1 day','ends_at',now()+interval '1 day')))$$,'22023','invalid_challenge_windows','past challenge windows are rejected');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000504","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.request_team_challenge((select id from phase11_ids where label='challenge_one'),(select id from phase11_ids where label='home_team'))$$,'42501','team_not_owned','non-captain member cannot challenge as a team');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000502","role":"authenticated"}',true);
insert into phase11_ids select 'request_away',public.request_team_challenge((select id from phase11_ids where label='challenge_one'),(select id from phase11_ids where label='away_team'));
insert into phase11_tap select throws_ok($$select public.request_team_challenge((select id from phase11_ids where label='challenge_one'),(select id from phase11_ids where label='away_team'))$$,'23505','challenge_request_already_active','same team cannot submit a duplicate active request');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000503","role":"authenticated"}',true);
insert into phase11_ids select 'request_rival',public.request_team_challenge((select id from phase11_ids where label='challenge_one'),(select id from phase11_ids where label='rival_team'));
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.request_team_challenge((select id from phase11_ids where label='challenge_one'),(select id from phase11_ids where label='home_team'))$$,'22023','cannot_challenge_own_team','home team cannot challenge itself');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000503","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.respond_to_challenge_request((select id from phase11_ids where label='request_away'),'accept')$$,'42501','team_not_owned','non-home team captain cannot approve an opponent');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
insert into phase11_tap select is(public.respond_to_challenge_request((select id from phase11_ids where label='request_away'),'accept'),'accepted','home captain accepts one opponent');
insert into phase11_tap select is((public.get_team_challenge_details((select id from phase11_ids where label='challenge_one')))->>'status','negotiating','accepted request moves challenge into slot negotiation');
insert into phase11_tap select is((select value->>'status' from jsonb_array_elements((public.get_team_challenge_details((select id from phase11_ids where label='challenge_one')))->'requests') value where value->>'id'=(select id::text from phase11_ids where label='request_rival')),'rejected','competing opponent is closed when another request is accepted');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000502","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.propose_challenge_match((select id from phase11_ids where label='challenge_one'),now()+interval '10 days',(select id from public.areas where slug='strovolos' limit 1),'Strovolos Field','Cyprus')$$,'42501','team_not_owned','away captain cannot propose the home team slot');
insert into phase11_tap select throws_ok($$select public.confirm_challenge_match((select id from phase11_ids where label='challenge_one'))$$,'22023','challenge_slot_not_proposed','away captain cannot confirm before the home team proposes a slot');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.confirm_challenge_match((select id from phase11_ids where label='challenge_one'))$$,'42501','team_not_owned','home team cannot confirm the away team response');
insert into phase11_tap select throws_ok($$select public.propose_challenge_match((select id from phase11_ids where label='challenge_one'),now()+interval '12 days',(select id from public.areas where slug='strovolos' limit 1),'Strovolos Field','Cyprus')$$,'22023','match_slot_outside_challenge_windows','exact match time must fit an offered window');
insert into phase11_tap select throws_ok($$select public.propose_challenge_match((select id from phase11_ids where label='challenge_one'),now()+interval '10 days',(select id from public.areas where slug='strovolos' limit 1),'','')$$,'22023','invalid_challenge_match_slot','exact slot requires a named field and address');
insert into phase11_tap select lives_ok($$select public.propose_challenge_match((select id from phase11_ids where label='challenge_one'),now()+interval '10 days',(select id from public.areas where slug='strovolos' limit 1),'Strovolos Field','Strovolos, Nicosia')$$,'home captain proposes a future exact time and field');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000502","role":"authenticated"}',true);
insert into phase11_ids select 'match_one',public.confirm_challenge_match((select id from phase11_ids where label='challenge_one'));
insert into phase11_tap select is((public.get_team_challenge_details((select id from phase11_ids where label='challenge_one')))->>'status','matched','away captain confirmation marks the challenge matched');
insert into phase11_tap select is((public.get_team_challenge_details((select id from phase11_ids where label='challenge_one')))->>'linked_match_id',(select id::text from phase11_ids where label='match_one'),'matched challenge returns its single linked match');
insert into phase11_tap select is(public.confirm_challenge_match((select id from phase11_ids where label='challenge_one')),(select id from phase11_ids where label='match_one'),'repeat confirmation is idempotent');
reset role;
insert into phase11_tap select is((select count(*)::integer from public.matches where challenge_id=(select id from phase11_ids where label='challenge_one')),1,'exactly one published match is linked');
insert into phase11_tap select is((select starts_at from public.matches where challenge_id=(select id from phase11_ids where label='challenge_one')),(select proposed_starts_at from public.team_challenges where id=(select id from phase11_ids where label='challenge_one')),'linked match uses the agreed exact kickoff');
insert into phase11_tap select is((select venue_display_name from public.matches where challenge_id=(select id from phase11_ids where label='challenge_one')),'Strovolos Field','linked match uses the agreed field');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000503","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.confirm_challenge_match((select id from phase11_ids where label='challenge_one'))$$,'42501','team_not_owned','unselected challenger cannot retrieve or confirm the linked match');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.cancel_team_challenge((select id from phase11_ids where label='challenge_one'))$$,'22023','challenge_unavailable','matched challenge cannot be cancelled through the open-challenge flow');
insert into phase11_ids select 'challenge_two',public.create_team_challenge(
 (select id from phase11_ids where label='home_team'),5::smallint,(select id from public.cities where slug='nicosia'),
 (select id from public.areas where slug='strovolos' limit 1),null,'Second challenge',
 jsonb_build_array(jsonb_build_object('starts_at',now()+interval '20 days','ends_at',now()+interval '20 days 3 hours')));
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000502","role":"authenticated"}',true);
insert into phase11_ids select 'request_two',public.request_team_challenge((select id from phase11_ids where label='challenge_two'),(select id from phase11_ids where label='away_team'));
insert into phase11_tap select is(public.withdraw_challenge_request((select id from phase11_ids where label='request_two')),'withdrawn','opponent captain can withdraw a pending request');
insert into phase11_ids select 'request_two_again',public.request_team_challenge((select id from phase11_ids where label='challenge_two'),(select id from phase11_ids where label='away_team'));
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000501","role":"authenticated"}',true);
insert into phase11_tap select is(public.respond_to_challenge_request((select id from phase11_ids where label='request_two_again'),'decline'),'rejected','home captain can decline an opponent request');
insert into phase11_tap select is((public.get_team_challenge_details((select id from phase11_ids where label='challenge_two')))->>'status','open','declining a request leaves challenge open to other teams');
insert into phase11_tap select is(public.cancel_team_challenge((select id from phase11_ids where label='challenge_two')),'cancelled','home captain cancels an unmatched challenge');
insert into phase11_tap select is((public.get_team_challenge_details((select id from phase11_ids where label='challenge_two')))->>'status','cancelled','cancelled challenge is no longer open');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000503","role":"authenticated"}',true);
insert into phase11_tap select throws_ok($$select public.request_team_challenge((select id from phase11_ids where label='challenge_two'),(select id from phase11_ids where label='rival_team'))$$,'22023','challenge_unavailable','cancelled challenge cannot receive another request');
reset role;
select * from finish();
select coalesce(jsonb_agg(result),'[]'::jsonb) from phase11_tap where result like '%not ok%';
rollback;
