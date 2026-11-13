begin;
create extension if not exists pgtap with schema extensions;
create temporary table phase12_tap(result text);
create temporary table phase12_ids(label text primary key, id uuid not null);
grant select, insert on phase12_tap, phase12_ids to anon, authenticated;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data, raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000601','authenticated','authenticated','phase12-home@example.invalid','',now(),'{"provider":"email","providers":["email"]}', '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb),
 ('00000000-0000-4000-8000-000000000602','authenticated','authenticated','phase12-away@example.invalid','',now(),'{"provider":"email","providers":["email"]}', '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb),
 ('00000000-0000-4000-8000-000000000603','authenticated','authenticated','phase12-outsider@example.invalid','',now(),'{"provider":"email","providers":["email"]}', '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb);
update public.profiles profile set display_name=case profile.id
 when '00000000-0000-4000-8000-000000000601' then 'Home Notification Captain'
 when '00000000-0000-4000-8000-000000000602' then 'Away Notification Captain'
 else 'Notification Outsider' end,city_id=city.id,area_id=area.id,onboarding_complete=true
from public.cities city join public.areas area on area.city_id=city.id and area.slug='strovolos'
where city.slug='nicosia' and profile.id in (
 '00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000602','00000000-0000-4000-8000-000000000603');

select plan(25);
insert into phase12_tap select has_table('public','inbox_notifications','in-app inbox table exists');
insert into phase12_tap select ok((select relrowsecurity from pg_class where oid='public.inbox_notifications'::regclass),'inbox notifications have RLS enabled');
insert into phase12_tap select has_column('public','notification_outbox','email_status','outbox tracks email delivery');
set local role anon;
insert into phase12_tap select throws_ok($$select * from public.inbox_notifications$$,'42501','permission denied for table inbox_notifications','anonymous users cannot read inbox notifications');
insert into phase12_tap select throws_ok($$insert into public.inbox_notifications(recipient_id,outbox_id,event_type,title_key,body_key,href) values('00000000-0000-4000-8000-000000000601',gen_random_uuid(),'challenge_cancelled','x','y','/notifications')$$,'42501','permission denied for table inbox_notifications','anonymous users cannot create inbox notifications');
insert into phase12_tap select ok(not has_function_privilege('anon','public.mark_inbox_notification_read(uuid)','EXECUTE'),'anonymous users cannot mark inbox notifications read');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated"}',true);
insert into phase12_ids select 'home_team',public.create_team('Home Notification Team',(select id from public.cities where slug='nicosia'),null);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000602","role":"authenticated"}',true);
insert into phase12_ids select 'away_team',public.create_team('Away Notification Team',(select id from public.cities where slug='nicosia'),null);
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated"}',true);
insert into phase12_ids select 'challenge',public.create_team_challenge(
 (select id from phase12_ids where label='home_team'),5::smallint,(select id from public.cities where slug='nicosia'),
 (select id from public.areas where slug='strovolos' limit 1),'intermediate','Notification test',
 jsonb_build_array(jsonb_build_object('starts_at',now()+interval '10 days','ends_at',now()+interval '10 days 3 hours')));
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000602","role":"authenticated"}',true);
insert into phase12_ids select 'request',public.request_team_challenge(
 (select id from phase12_ids where label='challenge'),(select id from phase12_ids where label='away_team'));
insert into phase12_tap select is((select count(*)::integer from public.inbox_notifications),0,'requesting team cannot see the home captain notification');
reset role;
insert into phase12_tap select is((select email_status from public.notification_outbox
 where recipient_id='00000000-0000-4000-8000-000000000601' limit 1),'pending','new notification is queued for email delivery');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated"}',true);
insert into phase12_tap select is((select count(*)::integer from public.inbox_notifications),1,'challenge request creates one notification for the home captain');
insert into phase12_tap select is((select event_type from public.inbox_notifications limit 1),'challenge_request_received','inbox keeps the event type for localization');
insert into phase12_tap select is((select title_key from public.inbox_notifications limit 1),'notificationChallengeRequestTitle','inbox stores a localization key rather than hard-coded copy');
insert into phase12_tap select is((select href from public.inbox_notifications limit 1),'/challenges/'||(select id::text from phase12_ids where label='challenge'),'challenge notification has a safe deep link');
insert into phase12_tap select is(public.mark_inbox_notification_read((select id from public.inbox_notifications limit 1)),true,'recipient can mark their own notification read');
insert into phase12_tap select ok((select read_at is not null from public.inbox_notifications limit 1),'mark read stores the read timestamp');
insert into phase12_tap select throws_ok($$update public.inbox_notifications set read_at=now()$$,'42501','permission denied for table inbox_notifications','users cannot directly change notification rows');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated"}',true);
insert into phase12_tap select is(public.respond_to_challenge_request((select id from phase12_ids where label='request'),'accept'),'accepted','home captain can accept the challenge request');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000602","role":"authenticated"}',true);
insert into phase12_tap select is((select count(*)::integer from public.inbox_notifications),1,'accepted request creates a notification for the away captain');
insert into phase12_tap select is((select event_type from public.inbox_notifications limit 1),'challenge_request_accepted','away captain receives the accepted event');
insert into phase12_tap select is((select mark_all_inbox_notifications_read()::integer),1,'recipient can mark all unread items read');
insert into phase12_tap select ok((select read_at is not null from public.inbox_notifications limit 1),'mark-all action timestamps the recipient notification');
insert into phase12_tap select ok(not has_function_privilege('authenticated','public.verify_notification_worker_token(text)','EXECUTE'),'authenticated users cannot validate worker tokens');
insert into phase12_tap select ok(has_function_privilege('service_role','public.verify_notification_worker_token(text)','EXECUTE'),'worker token validation is limited to the service role');
insert into phase12_tap select ok(not has_function_privilege('authenticated','public.claim_notification_outbox(uuid)','EXECUTE'),'authenticated users cannot claim email outbox rows');
insert into phase12_tap select ok(has_function_privilege('service_role','public.claim_notification_outbox(uuid)','EXECUTE'),'only server-side worker can claim email outbox rows');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated"}',true);
update public.notification_preferences set in_app_enabled=false where user_id=auth.uid();
reset role;
insert into public.notification_outbox(recipient_id,event_type,payload)
 values ('00000000-0000-4000-8000-000000000601','challenge_cancelled',jsonb_build_object('challenge_id',(select id from phase12_ids where label='challenge')));
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000601","role":"authenticated"}',true);
insert into phase12_tap select is((select count(*)::integer from public.inbox_notifications),1,'in-app opt-out suppresses future inbox rows');
reset role;

select * from finish();
select * from phase12_tap;
rollback;
