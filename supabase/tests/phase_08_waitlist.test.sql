begin;
create extension if not exists pgtap with schema extensions;
create temporary table phase08_tap(result text);
grant insert on phase08_tap to anon, authenticated;
insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data) values
 ('00000000-0000-4000-8000-000000000201','authenticated','authenticated','phase8-organizer@example.invalid','',now(),'{}'),
 ('00000000-0000-4000-8000-000000000202','authenticated','authenticated','phase8-player-a@example.invalid','',now(),'{}'),
 ('00000000-0000-4000-8000-000000000203','authenticated','authenticated','phase8-player-b@example.invalid','',now(),'{}'),
 ('00000000-0000-4000-8000-000000000204','authenticated','authenticated','phase8-player-c@example.invalid','',now(),'{}'),
 ('00000000-0000-4000-8000-000000000205','authenticated','authenticated','phase8-player-d@example.invalid','',now(),'{}');
update public.profiles p set display_name=case p.id
  when '00000000-0000-4000-8000-000000000201' then 'Organizer'
  when '00000000-0000-4000-8000-000000000202' then 'Player A'
  when '00000000-0000-4000-8000-000000000203' then 'Player B'
  when '00000000-0000-4000-8000-000000000204' then 'Player C' else 'Player D' end,
  city_id=c.id,area_id=a.id,onboarding_complete=true
from public.cities c join public.areas a on a.city_id=c.id and a.slug='strovolos'
where c.slug='nicosia' and p.id::text like '00000000-0000-4000-8000-00000000020_';
insert into public.matches(id,organizer_id,title,side_size,city_id,area_id,venue_display_name,venue_address,starts_at,duration_minutes,reserved_guest_slots,event_status)
select '00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000201','Waitlist default',5,c.id,a.id,'Test field','Test address',now()+interval '4 days',90,9,'published'
from public.cities c join public.areas a on a.city_id=c.id and a.slug='strovolos' where c.slug='nicosia';
insert into public.match_participants(match_id,user_id,status)
values('00000000-0000-4000-8000-000000000211','00000000-0000-4000-8000-000000000202','active');
insert into public.matches(id,organizer_id,title,side_size,city_id,area_id,venue_display_name,venue_address,starts_at,duration_minutes,reserved_guest_slots,event_status,waitlist_offer_minutes)
select '00000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000201','Waitlist expiry',5,c.id,a.id,'Test field','Test address',now()+interval '5 days',90,9,'published',5
from public.cities c join public.areas a on a.city_id=c.id and a.slug='strovolos' where c.slug='nicosia';
insert into public.match_participants(match_id,user_id,status)
values('00000000-0000-4000-8000-000000000212','00000000-0000-4000-8000-000000000202','active');
select plan(30);
insert into phase08_tap select has_table('public','match_waitlist_entries','ordered waitlist table exists');
set local role anon;
insert into phase08_tap select throws_ok($$select * from public.match_waitlist_entries$$,'42501','permission denied for table match_waitlist_entries','anonymous cannot enumerate waitlist entries');
insert into phase08_tap select throws_ok($$select * from public.match_waitlist_offers$$,'42501','permission denied for table match_waitlist_offers','anonymous cannot enumerate private offers');
reset role;
insert into phase08_tap select is((select waitlist_offer_minutes from public.matches where id='00000000-0000-4000-8000-000000000211'),15::smallint,'default offer duration is fifteen minutes');
insert into phase08_tap select is((select waitlist_offer_minutes from public.matches where id='00000000-0000-4000-8000-000000000212'),5::smallint,'organizer can configure offer duration');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000203","role":"authenticated"}',true);
insert into phase08_tap select lives_ok($$select public.join_match_waitlist('00000000-0000-4000-8000-000000000211',null)$$,'player B can join a full match waitlist');
insert into phase08_tap select is(public.join_match_waitlist('00000000-0000-4000-8000-000000000211',null),
 public.join_match_waitlist('00000000-0000-4000-8000-000000000211',null),'duplicate join is idempotent');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000204","role":"authenticated"}',true);
insert into phase08_tap select lives_ok($$select public.join_match_waitlist('00000000-0000-4000-8000-000000000211',null)$$,'player C can join behind player B');
insert into phase08_tap select is((public.get_match_waitlist_state('00000000-0000-4000-8000-000000000211')->>'queue_position')::integer,2,'waitlist position follows queue timestamp order');
reset role;
insert into phase08_tap select is((select count(*)::integer from public.match_waitlist_offers where match_id='00000000-0000-4000-8000-000000000211' and status='offered'),0,'joining does not automatically confirm or offer a place while full');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}',true);
insert into phase08_tap select is(public.leave_match('00000000-0000-4000-8000-000000000211'),'left','active player can leave and free a place');
reset role;
insert into phase08_tap select is((select count(*)::integer from public.match_waitlist_offers where match_id='00000000-0000-4000-8000-000000000211' and status='offered'),1,'only one exclusive offer is active per match');
insert into phase08_tap select is((select status from public.match_waitlist_entries where match_id='00000000-0000-4000-8000-000000000211' and user_id='00000000-0000-4000-8000-000000000203'),'offered','earliest player receives first offer');
insert into phase08_tap select is((select active_players from public.match_discovery where id='00000000-0000-4000-8000-000000000211'),0,'offer reserves capacity but does not auto-confirm a player');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000203","role":"authenticated"}',true);
insert into phase08_tap select is(public.get_match_waitlist_state('00000000-0000-4000-8000-000000000211')->>'status','offered','offer state is private to its recipient');
insert into phase08_tap select lives_ok($$select public.accept_waitlist_offer((public.get_match_waitlist_state('00000000-0000-4000-8000-000000000211')->>'offer_id')::uuid)$$,'recipient can explicitly accept offer');
reset role;
insert into phase08_tap select is((select active_players from public.match_discovery where id='00000000-0000-4000-8000-000000000211'),1,'acceptance adds the player to the confirmed roster');
insert into phase08_tap select is((select status from public.match_waitlist_entries where match_id='00000000-0000-4000-8000-000000000211' and user_id='00000000-0000-4000-8000-000000000203'),'accepted','accepted entry is removed from waiting queue');
insert into phase08_tap select is((select count(*)::integer from public.notification_outbox where match_id='00000000-0000-4000-8000-000000000211' and event_type='match_waitlist_offer_accepted'),1,'acceptance notification is queued transactionally');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000203","role":"authenticated"}',true);
insert into phase08_tap select throws_ok($$select public.join_match_waitlist('00000000-0000-4000-8000-000000000211',null)$$,'22023','existing_match_request','already accepted player cannot queue for the same match');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000203","role":"authenticated"}',true);
insert into phase08_tap select lives_ok($$select public.join_match_waitlist('00000000-0000-4000-8000-000000000212',null)$$,'player B can queue on second match');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000204","role":"authenticated"}',true);
insert into phase08_tap select lives_ok($$select public.join_match_waitlist('00000000-0000-4000-8000-000000000212',null)$$,'player C queues behind B');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000205","role":"authenticated"}',true);
insert into phase08_tap select lives_ok($$select public.join_match_waitlist('00000000-0000-4000-8000-000000000212',null)$$,'player D queues behind C');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}',true);
insert into phase08_tap select is(public.leave_match('00000000-0000-4000-8000-000000000212'),'left','leaving a second match opens an offer');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000203","role":"authenticated"}',true);
insert into phase08_tap select is(public.decline_waitlist_offer((public.get_match_waitlist_state('00000000-0000-4000-8000-000000000212')->>'offer_id')::uuid),'declined','recipient can decline without occupying the place');
reset role;
insert into phase08_tap select is((select status from public.match_waitlist_entries where match_id='00000000-0000-4000-8000-000000000212' and user_id='00000000-0000-4000-8000-000000000204'),'offered','decline immediately passes offer to next player');
update public.match_waitlist_offers set expires_at=now()-interval '1 second' where match_id='00000000-0000-4000-8000-000000000212' and status='offered';
select public.process_expired_waitlist_offers();
insert into phase08_tap select is((select status from public.match_waitlist_entries where match_id='00000000-0000-4000-8000-000000000212' and user_id='00000000-0000-4000-8000-000000000204'),'expired','expired offer is recorded without confirmation');
insert into phase08_tap select is((select status from public.match_waitlist_entries where match_id='00000000-0000-4000-8000-000000000212' and user_id='00000000-0000-4000-8000-000000000205'),'offered','expiry passes offer to following player');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201","role":"authenticated"}',true);
select public.cancel_match('00000000-0000-4000-8000-000000000212');
reset role;
insert into phase08_tap select is((select count(*)::integer from public.match_waitlist_offers where match_id='00000000-0000-4000-8000-000000000212' and status='cancelled'),1,'match cancellation closes an outstanding offer');
insert into phase08_tap select is((select status from public.match_waitlist_entries where match_id='00000000-0000-4000-8000-000000000212' and user_id='00000000-0000-4000-8000-000000000205'),'removed','match cancellation closes active waitlist entry');
select * from finish();
select coalesce(jsonb_agg(result),'[]'::jsonb) from phase08_tap where result like '%not ok%';
rollback;
