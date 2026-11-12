begin;
create extension if not exists pgtap with schema extensions;
create temporary table phase09_tap(result text);
create temporary table phase09_message_ids(label text primary key,id uuid not null);
create temporary table phase09_report_ids(id uuid not null);
grant select,insert on phase09_tap,phase09_message_ids,phase09_report_ids to anon,authenticated;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data) values
 ('00000000-0000-4000-8000-000000000301','authenticated','authenticated','phase9-organizer@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000302','authenticated','authenticated','phase9-player-a@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000303','authenticated','authenticated','phase9-pending@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000304','authenticated','authenticated','phase9-left@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000305','authenticated','authenticated','phase9-outsider@example.invalid','',now(),'{"provider":"email","providers":["email"]}');
update public.profiles p set display_name=case p.id
 when '00000000-0000-4000-8000-000000000301' then 'Chat Organizer'
 when '00000000-0000-4000-8000-000000000302' then 'Accepted Player'
 when '00000000-0000-4000-8000-000000000303' then 'Pending Player'
 else 'Former Player' end,city_id=c.id,area_id=a.id,onboarding_complete=true
from public.cities c join public.areas a on a.city_id=c.id and a.slug='strovolos'
where c.slug='nicosia' and p.id in ('00000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000304');
insert into public.matches(id,organizer_id,title,side_size,city_id,area_id,venue_display_name,venue_address,starts_at,duration_minutes,event_status)
select '00000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000301','Phase 09 private chat',5,c.id,a.id,'Chat test field','Test address',now()+interval '5 days',90,'published'
from public.cities c join public.areas a on a.city_id=c.id and a.slug='strovolos' where c.slug='nicosia';
insert into public.match_participants(match_id,user_id,status) values
 ('00000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000302','active'),
 ('00000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000303','pending'),
 ('00000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000304','left');
select plan(32);
insert into phase09_tap select has_table('public','match_messages','match message table exists');
insert into phase09_tap select ok(exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='match_messages'),'messages are included in the realtime publication');
set local role anon;
insert into phase09_tap select throws_ok($$select * from public.match_messages$$,'42501','permission denied for table match_messages','anonymous cannot read chat history');
insert into phase09_tap select throws_ok($$insert into public.match_messages(match_id,sender_id,body) values('00000000-0000-4000-8000-000000000311',auth.uid(),'hello')$$,'42501','permission denied for table match_messages','anonymous cannot write chat messages');
insert into phase09_tap select throws_ok($$select * from public.match_message_reports$$,'42501','permission denied for table match_message_reports','anonymous cannot read moderation reports');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000303","role":"authenticated"}',true);
insert into phase09_tap select is(public.get_match_chat_role('00000000-0000-4000-8000-000000000311'),null::text,'pending player has no chat role');
insert into phase09_tap select throws_ok($$select * from public.get_match_chat_messages('00000000-0000-4000-8000-000000000311')$$,'42501','match_chat_access_denied','pending player cannot fetch history');
insert into phase09_tap select throws_ok($$select public.send_match_message('00000000-0000-4000-8000-000000000311','hello')$$,'42501','match_chat_access_denied','pending player cannot send messages');
insert into phase09_tap select is((select count(*)::integer from public.match_messages where match_id='00000000-0000-4000-8000-000000000311'),0,'row policy hides chat messages from pending player');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000302","role":"authenticated"}',true);
insert into phase09_tap select is(public.get_match_chat_role('00000000-0000-4000-8000-000000000311'),'player','accepted player receives chat access');
insert into phase09_message_ids select 'player',public.send_match_message('00000000-0000-4000-8000-000000000311','<script>alert("safe text")</script>');
insert into phase09_tap select lives_ok($$select id from phase09_message_ids where label='player'$$,'accepted player sends an HTML-like string as plain text');
insert into phase09_tap select throws_ok($$select public.send_match_message('00000000-0000-4000-8000-000000000311','   ')$$,'22023','invalid_message_length','blank message is rejected');
insert into phase09_tap select throws_ok($$select public.send_match_message('00000000-0000-4000-8000-000000000311',repeat('x',1001))$$,'22023','invalid_message_length','message over 1000 characters is rejected');
insert into phase09_tap select is((select body from public.get_match_chat_messages('00000000-0000-4000-8000-000000000311') limit 1),'<script>alert("safe text")</script>','HTML-like input is retained as text without execution');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}',true);
insert into phase09_tap select is(public.get_match_chat_role('00000000-0000-4000-8000-000000000311'),'organizer','organizer receives chat access');
insert into phase09_message_ids select 'organizer',public.send_match_message('00000000-0000-4000-8000-000000000311','Meet at the north gate.');
insert into phase09_tap select is((select count(*)::integer from public.get_match_chat_messages('00000000-0000-4000-8000-000000000311')),2,'organizer sees accepted player and own messages');
insert into phase09_tap select lives_ok($$select public.moderate_match_message((select id from phase09_message_ids where label='player'))$$,'organizer can remove a reported or unsuitable message');
insert into phase09_tap select is((select status from public.get_match_chat_messages('00000000-0000-4000-8000-000000000311') where id=(select id from phase09_message_ids where label='player')),'removed','moderation marks the message removed');
insert into phase09_tap select is((select body from public.get_match_chat_messages('00000000-0000-4000-8000-000000000311') where id=(select id from phase09_message_ids where label='player')),'','moderated message body is redacted by the RPC');
insert into phase09_tap select throws_ok($$update public.match_messages set body='changed'$$,'42501','permission denied for table match_messages','clients cannot directly update messages');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000302","role":"authenticated"}',true);
insert into phase09_report_ids select public.report_match_message((select id from phase09_message_ids where label='organizer'),'spam',null);
insert into phase09_tap select lives_ok($$select public.report_match_message((select id from phase09_message_ids where label='organizer'),'spam',null)$$,'accepted player can report another member message');
insert into phase09_tap select is(public.report_match_message((select id from phase09_message_ids where label='organizer'),'harassment',null),
 (select id from phase09_report_ids limit 1),'repeat report remains idempotent');
insert into phase09_message_ids select 'player-second',public.send_match_message('00000000-0000-4000-8000-000000000311','A second message for a self-report check.');
insert into phase09_tap select throws_ok($$select public.report_match_message((select id from phase09_message_ids where label='player-second'),'spam',null)$$,'22023','cannot_report_own_message','member cannot report their own message');
insert into phase09_tap select throws_ok($$select public.moderate_match_message((select id from phase09_message_ids where label='organizer'))$$,'42501','match_not_owned','accepted player cannot moderate chat messages');
insert into phase09_tap select throws_ok($$select * from public.get_match_chat_report_counts('00000000-0000-4000-8000-000000000311')$$,'42501','match_not_owned','accepted player cannot read organizer report counts');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}',true);
insert into phase09_tap select is((select report_count from public.get_match_chat_report_counts('00000000-0000-4000-8000-000000000311') where message_id=(select id from phase09_message_ids where label='organizer')),1,'organizer sees a safe open-report count');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000305","role":"authenticated"}',true);
insert into phase09_tap select throws_ok($$select * from public.get_match_chat_messages('00000000-0000-4000-8000-000000000311')$$,'42501','match_chat_access_denied','unrelated user cannot fetch chat');
insert into phase09_tap select throws_ok($$select public.send_match_message('00000000-0000-4000-8000-000000000311','outsider')$$,'42501','match_chat_access_denied','unrelated user cannot send chat');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000304","role":"authenticated"}',true);
insert into phase09_tap select throws_ok($$select public.send_match_message('00000000-0000-4000-8000-000000000311','former player')$$,'42501','match_chat_access_denied','former player cannot send after leaving');
reset role;
update public.match_participants set status='left' where match_id='00000000-0000-4000-8000-000000000311' and user_id='00000000-0000-4000-8000-000000000302';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000302","role":"authenticated"}',true);
insert into phase09_tap select is(public.get_match_chat_role('00000000-0000-4000-8000-000000000311'),null::text,'chat access is revoked when an accepted player leaves');
insert into phase09_tap select throws_ok($$select * from public.get_match_chat_messages('00000000-0000-4000-8000-000000000311')$$,'42501','match_chat_access_denied','left player cannot load stored history');
reset role;
update public.matches set event_status='cancelled' where id='00000000-0000-4000-8000-000000000311';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}',true);
insert into phase09_tap select is(public.get_match_chat_role('00000000-0000-4000-8000-000000000311'),null::text,'cancelling the match revokes organizer chat');
reset role;
select * from finish();
select coalesce(jsonb_agg(result),'[]'::jsonb) from phase09_tap where result like '%not ok%';
rollback;
