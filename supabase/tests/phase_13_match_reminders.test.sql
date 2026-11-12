begin;
create extension if not exists pgtap with schema extensions;
create temporary table phase13_tap(result text);
create temporary table phase13_ids(label text primary key, id uuid not null);
grant select, insert on phase13_tap, phase13_ids to anon, authenticated;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data) values
 ('00000000-0000-4000-8000-000000000701','authenticated','authenticated','phase13-organizer@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000702','authenticated','authenticated','phase13-player@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000703','authenticated','authenticated','phase13-late@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000000704','authenticated','authenticated','phase13-outsider@example.invalid','',now(),'{"provider":"email","providers":["email"]}');
update public.profiles profile set display_name=case profile.id
 when '00000000-0000-4000-8000-000000000701' then 'Reminder Organizer'
 when '00000000-0000-4000-8000-000000000702' then 'Reminder Player'
 when '00000000-0000-4000-8000-000000000703' then 'Late Reminder Player'
 else 'Reminder Outsider' end,city_id=city.id,area_id=area.id,onboarding_complete=true
from public.cities city join public.areas area on area.city_id=city.id and area.slug='strovolos'
where city.slug='nicosia' and profile.id in (
 '00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000702',
 '00000000-0000-4000-8000-000000000703','00000000-0000-4000-8000-000000000704');

insert into phase13_ids values
 ('main','00000000-0000-4000-8000-000000000713'),
 ('rescheduled','00000000-0000-4000-8000-000000000714'),
 ('leave','00000000-0000-4000-8000-000000000715'),
 ('late','00000000-0000-4000-8000-000000000716'),
 ('dst','00000000-0000-4000-8000-000000000717'),
 ('after_start','00000000-0000-4000-8000-000000000718');
insert into public.matches(id,organizer_id,title,side_size,city_id,area_id,venue_display_name,venue_address,starts_at,duration_minutes,event_status)
select ids.id,'00000000-0000-4000-8000-000000000701','Phase 13 reminder test',5,city.id,area.id,
 'Reminder test field','Strovolos, Nicosia',
 case ids.label
   when 'main' then now()+interval '30 hours'
   when 'rescheduled' then now()+interval '80 hours'
   when 'leave' then now()+interval '60 hours'
   when 'late' then now()+interval '20 hours'
   when 'dst' then '2027-03-28 01:30:00+00'::timestamptz
   else now()+interval '1 minute'
 end,90,'published'
from phase13_ids ids cross join public.cities city join public.areas area on area.city_id=city.id and area.slug='strovolos'
where city.slug='nicosia';
insert into public.match_participants(match_id,user_id,status)
select id,case when label='late' then '00000000-0000-4000-8000-000000000703'::uuid
               else '00000000-0000-4000-8000-000000000702'::uuid end,'active'
from phase13_ids where label in ('main','rescheduled','leave','late');

select plan(41);
insert into phase13_tap select has_table('public','match_reminders','match reminder table exists');
insert into phase13_tap select ok((select relrowsecurity from pg_class where oid='public.match_reminders'::regclass),'match reminder table has RLS enabled');
insert into phase13_tap select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='match_reminders' and policyname='match_reminders_no_client_access' and cmd='ALL'),'reminder schedules have an explicit deny policy for clients');
insert into phase13_tap select ok(to_regclass('public.match_reminders_due_idx') is not null,'scheduler has an index for pending due rows');
insert into phase13_tap select ok((select active from cron.job where jobname='one-more-process-match-reminders'),'minute reminder scheduler is active');
insert into phase13_tap select ok(not has_function_privilege('anon','private.process_due_match_reminders(timestamptz)','EXECUTE'),'anonymous users cannot run the reminder worker');
set local role anon;
insert into phase13_tap select throws_ok($$select * from public.match_reminders$$,'42501','permission denied for table match_reminders','anonymous users cannot inspect reminder schedules');
insert into phase13_tap select throws_ok($$insert into public.match_reminders(match_id,recipient_id,offset_minutes,scheduled_for) values('00000000-0000-4000-8000-000000000713','00000000-0000-4000-8000-000000000701',120,now())$$,'42501','permission denied for table match_reminders','anonymous users cannot create reminders');
reset role;

insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='main') and recipient_id='00000000-0000-4000-8000-000000000701' and status='pending'),2,'match creation schedules organizer 24-hour and 2-hour reminders');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='main') and recipient_id='00000000-0000-4000-8000-000000000702' and status='pending'),2,'accepted participant receives both reminder offsets');
insert into phase13_tap select is((select scheduled_for from public.match_reminders where match_id=(select id from phase13_ids where label='main') and recipient_id='00000000-0000-4000-8000-000000000702' and offset_minutes=1440),
 (select starts_at-interval '24 hours' from public.matches where id=(select id from phase13_ids where label='main')),'24-hour deadline is stored as a UTC instant 24 hours before kickoff');
insert into phase13_tap select is((select scheduled_for from public.match_reminders where match_id=(select id from phase13_ids where label='main') and recipient_id='00000000-0000-4000-8000-000000000702' and offset_minutes=120),
 (select starts_at-interval '2 hours' from public.matches where id=(select id from phase13_ids where label='main')),'2-hour deadline is stored as a UTC instant 2 hours before kickoff');
insert into phase13_tap select is(private.schedule_match_reminders((select id from phase13_ids where label='main'),'00000000-0000-4000-8000-000000000702',(select id from public.match_participants where match_id=(select id from phase13_ids where label='main') and user_id='00000000-0000-4000-8000-000000000702')),2,'repeating reminder generation is idempotent');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='main') and recipient_id='00000000-0000-4000-8000-000000000702'),2,'idempotent generation does not duplicate reminders');
insert into phase13_tap select is(private.process_due_match_reminders((select starts_at-interval '24 hours 1 minute' from public.matches where id=(select id from phase13_ids where label='main'))),0,'fake clock before T-24 hours queues no reminder');
insert into phase13_tap select is(private.process_due_match_reminders((select starts_at-interval '23 hours 59 minutes' from public.matches where id=(select id from phase13_ids where label='main'))),2,'fake clock at T-24 queues exactly one reminder for each recipient');
insert into phase13_tap select is((select count(*)::integer from public.notification_outbox where match_id=(select id from phase13_ids where label='main') and event_type='match_reminder_24h'),2,'T-24 outbox events are created once per recipient');
insert into phase13_tap select is(private.process_due_match_reminders((select starts_at-interval '23 hours 59 minutes' from public.matches where id=(select id from phase13_ids where label='main'))),0,'re-running the T-24 worker does not enqueue duplicates');
insert into phase13_tap select is((select count(*)::integer from public.notification_outbox where match_id=(select id from phase13_ids where label='main') and event_type='match_reminder_24h'),2,'repeated T-24 worker keeps exactly two events');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='late') and recipient_id='00000000-0000-4000-8000-000000000703' and status='pending'),1,'participant added within 24 hours receives only the future T-2 reminder');
insert into phase13_tap select is((select offset_minutes::integer from public.match_reminders where match_id=(select id from phase13_ids where label='late') and recipient_id='00000000-0000-4000-8000-000000000703'),120,'late participant reminder uses the 2-hour offset');
insert into phase13_tap select is(private.process_due_match_reminders((select starts_at-interval '1 hour 59 minutes' from public.matches where id=(select id from phase13_ids where label='main'))),2,'fake clock at T-2 queues exactly one reminder for each recipient');
insert into phase13_tap select is((select count(*)::integer from public.notification_outbox where match_id=(select id from phase13_ids where label='main') and event_type='match_reminder_2h'),2,'T-2 outbox events are created once per recipient');
insert into phase13_tap select is(private.process_due_match_reminders((select starts_at+interval '5 minutes' from public.matches where id=(select id from phase13_ids where label='main'))),0,'worker after kickoff does not send stale reminders');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='main') and status='pending'),0,'no pending reminders remain after the match starts');
insert into phase13_tap select is((select count(*)::integer from public.inbox_notifications where outbox_id in (select id from public.notification_outbox where match_id=(select id from phase13_ids where label='main') and event_type='match_reminder_24h')),2,'reminder outbox events create private inbox notifications');

insert into phase13_tap select is((select scheduled_for from public.match_reminders where match_id=(select id from phase13_ids where label='dst') and offset_minutes=1440),(select starts_at-interval '24 hours' from public.matches where id=(select id from phase13_ids where label='dst')),'DST-boundary reminder remains exactly 24 elapsed hours before kickoff');
insert into phase13_tap select ok((select extract(hour from scheduled_for at time zone 'Asia/Nicosia') <> extract(hour from match_row.starts_at at time zone 'Asia/Nicosia')
 from public.match_reminders reminder join public.matches match_row on match_row.id=reminder.match_id
 where reminder.match_id=(select id from phase13_ids where label='dst') and reminder.offset_minutes=1440),'Cyprus local rendering reflects the DST clock change while UTC instants remain stable');

update public.matches set starts_at=starts_at+interval '5 hours' where id=(select id from phase13_ids where label='rescheduled');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='rescheduled') and status='cancelled'),4,'rescheduling cancels all pending reminders at the former kickoff');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='rescheduled') and status='pending'),4,'rescheduling creates reminders for both recipients at the new kickoff');
insert into phase13_tap select ok(not exists(select 1 from public.match_reminders reminder join public.matches match_row on match_row.id=reminder.match_id
 where reminder.match_id=(select id from phase13_ids where label='rescheduled') and reminder.status='pending'
 and reminder.scheduled_for not in (match_row.starts_at-interval '24 hours',match_row.starts_at-interval '2 hours')),'rescheduled deadlines match the new UTC kickoff');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000701","role":"authenticated"}',true);
insert into phase13_tap select lives_ok($$select public.cancel_match((select id from phase13_ids where label='rescheduled'))$$,'organizer cancellation runs the reminder cancellation trigger');
reset role;
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='rescheduled') and status='pending'),0,'cancelled match has no pending reminders');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000702","role":"authenticated"}',true);
insert into phase13_tap select is(public.leave_match((select id from phase13_ids where label='leave')),'left','confirmed player can leave the upcoming match');
reset role;
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='leave') and recipient_id='00000000-0000-4000-8000-000000000702' and status='pending'),0,'leaving cancels that player’s pending reminders');
insert into phase13_tap select lives_ok($$insert into public.match_participants(match_id,user_id,status) values((select id from phase13_ids where label='leave'),'00000000-0000-4000-8000-000000000702','active')$$,'a returning player can rejoin the same match');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='leave') and recipient_id='00000000-0000-4000-8000-000000000702' and status='pending'),2,'rejoining reactivates both reminders');
insert into phase13_tap select ok(not exists(select 1 from public.match_reminders reminder where reminder.match_id=(select id from phase13_ids where label='leave') and reminder.recipient_id='00000000-0000-4000-8000-000000000702' and reminder.status='pending' and reminder.participant_id is distinct from (select id from public.match_participants where match_id=reminder.match_id and user_id=reminder.recipient_id and status='active')),'rejoined reminders belong to the current active participant row');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='leave') and recipient_id='00000000-0000-4000-8000-000000000701' and status='pending'),2,'leaving does not cancel the organizer’s reminders');
insert into phase13_tap select is((select count(*)::integer from public.match_reminders where match_id=(select id from phase13_ids where label='after_start')),0,'a match created inside the final two hours receives no expired reminder');
insert into phase13_tap select throws_ok($$insert into public.match_reminders(match_id,recipient_id,offset_minutes,scheduled_for) values('00000000-0000-4000-8000-000000000713','00000000-0000-4000-8000-000000000701',60,now())$$,'23514','new row for relation "match_reminders" violates check constraint "match_reminders_offset_minutes_check"','only the supported reminder offsets are accepted');

select * from finish();
select * from phase13_tap;
rollback;
