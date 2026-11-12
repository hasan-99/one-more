begin;
create extension if not exists pgtap with schema extensions;
select plan(32);
create temporary table phase07_tap(result text);
grant insert on phase07_tap to authenticated, anon;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data)
values
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'phase7-organizer@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'phase7-player-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'phase7-player-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000104', 'authenticated', 'authenticated', 'phase7-incomplete@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb);

update public.profiles profile set display_name = case profile.id
  when '00000000-0000-4000-8000-000000000101' then 'Organizer'
  when '00000000-0000-4000-8000-000000000102' then 'Player A'
  else 'Player B' end,
  city_id = city.id, area_id = area.id, onboarding_complete = profile.id <> '00000000-0000-4000-8000-000000000104'
from public.cities city join public.areas area on area.city_id = city.id and area.slug = 'strovolos'
where city.slug = 'nicosia' and profile.id in (
  '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000102',
  '00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000104'
);

insert into public.matches (id, organizer_id, title, side_size, city_id, area_id, venue_display_name,
  venue_address, starts_at, duration_minutes, reserved_guest_slots, event_status)
select '00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000101',
  'Phase 07 join fixture', 5, city.id, area.id, 'Join test field', 'Test address', now() + interval '4 days', 90, 1, 'published'
from public.cities city join public.areas area on area.city_id = city.id and area.slug = 'strovolos'
where city.slug = 'nicosia';

insert into public.match_position_slots(id, match_id, position_code, x_pct, y_pct)
values ('00000000-0000-4000-8000-000000000112', '00000000-0000-4000-8000-000000000111', 'defender', 50, 65);

insert into public.matches (id, organizer_id, title, side_size, city_id, area_id, venue_display_name,
  venue_address, starts_at, duration_minutes, reserved_guest_slots, event_status)
select '00000000-0000-4000-8000-000000000113', '00000000-0000-4000-8000-000000000101',
  'Phase 07 final seat fixture', 5, city.id, area.id, 'Capacity test field', 'Test address', now() + interval '5 days', 90, 9, 'published'
from public.cities city join public.areas area on area.city_id = city.id and area.slug = 'strovolos'
where city.slug = 'nicosia';

insert into phase07_tap select has_table('public', 'notification_outbox', 'outbox table exists');
set local role anon;
insert into phase07_tap select throws_ok($$select * from public.notification_outbox$$, '42501', 'permission denied for table notification_outbox', 'anonymous clients cannot read transactional outbox events');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}', true);
insert into phase07_tap select lives_ok($$select public.request_match_join('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000112')$$, 'player request is recorded once');
insert into phase07_tap select is((select status from public.match_participants where match_id = '00000000-0000-4000-8000-000000000111'), 'pending', 'new request remains pending');
insert into phase07_tap select is((select active_players from public.match_discovery where id = '00000000-0000-4000-8000-000000000111'), 0, 'pending request does not consume a place');
insert into phase07_tap select is(public.request_match_join('00000000-0000-4000-8000-000000000111', '00000000-0000-4000-8000-000000000112'),
  (select id from public.match_participants where match_id = '00000000-0000-4000-8000-000000000111' and user_id = '00000000-0000-4000-8000-000000000102'), 'repeated request returns the existing pending id');
insert into phase07_tap select is((select count(*)::integer from public.match_participants where match_id = '00000000-0000-4000-8000-000000000111' and user_id = '00000000-0000-4000-8000-000000000102' and status = 'pending'), 1, 'duplicate pending request is prevented');
insert into phase07_tap select is((select count(*)::integer from public.match_participants where user_id = '00000000-0000-4000-8000-000000000103'), 0, 'player cannot enumerate another player request');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000104","role":"authenticated"}', true);
insert into phase07_tap select throws_ok($$select public.request_match_join('00000000-0000-4000-8000-000000000111', null)$$, '42501', 'verified_profile_required', 'incomplete profile cannot request a place');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}', true);
insert into phase07_tap select throws_ok($$select * from public.get_match_join_requests('00000000-0000-4000-8000-000000000111')$$, '42501', 'match_not_owned', 'another signed-in user cannot read organizer request roster');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);
insert into phase07_tap select throws_ok($$select public.request_match_join('00000000-0000-4000-8000-000000000111', null)$$, '42501', 'organizer_cannot_request', 'organizer cannot request their own match');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}', true);
insert into phase07_tap select lives_ok($$select public.request_match_join('00000000-0000-4000-8000-000000000111', null)$$, 'second player can submit a pending request');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);
insert into phase07_tap select is((select count(*)::integer from public.get_match_join_requests('00000000-0000-4000-8000-000000000111') where status = 'pending'), 2, 'organizer can list pending requests');
insert into phase07_tap select is((select display_name from public.get_match_join_requests('00000000-0000-4000-8000-000000000111') where status = 'pending' and display_name = 'Player A'), 'Player A', 'organizer sees safe player display name');
insert into phase07_tap select is(public.review_match_join_request('00000000-0000-4000-8000-000000000111',
  (select participant_id from public.get_match_join_requests('00000000-0000-4000-8000-000000000111') where display_name = 'Player A'), 'approve'), 'active', 'organizer approval confirms player');
insert into phase07_tap select is((select active_players from public.match_discovery where id = '00000000-0000-4000-8000-000000000111'), 1, 'approved player increments active count once');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}', true);
insert into phase07_tap select throws_ok($$select public.request_match_join('00000000-0000-4000-8000-000000000111', null)$$, '22023', 'already_joined', 'active player cannot create a duplicate pending request');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);
insert into phase07_tap select is((select status from public.match_position_slots where id = '00000000-0000-4000-8000-000000000112'), 'filled', 'requested open role is assigned on approval');
insert into phase07_tap select is(public.review_match_join_request('00000000-0000-4000-8000-000000000111',
  (select participant_id from public.get_match_join_requests('00000000-0000-4000-8000-000000000111') where display_name = 'Player A'), 'approve'), 'active', 'repeated approval is idempotent');
insert into phase07_tap select is(public.review_match_join_request('00000000-0000-4000-8000-000000000111',
  (select participant_id from public.get_match_join_requests('00000000-0000-4000-8000-000000000111') where display_name = 'Player B' and status = 'pending'), 'reject'), 'rejected', 'organizer can reject a request');
insert into phase07_tap select is((select active_players from public.match_discovery where id = '00000000-0000-4000-8000-000000000111'), 1, 'rejected request never consumes a seat');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}', true);
insert into phase07_tap select lives_ok($$select public.request_match_join('00000000-0000-4000-8000-000000000111', null)$$, 'rejected player may submit a fresh request');
insert into phase07_tap select is((select count(*)::integer from public.match_participants where match_id = '00000000-0000-4000-8000-000000000111' and user_id = '00000000-0000-4000-8000-000000000103' and status = 'pending'), 1, 'new request is pending after rejection');
insert into phase07_tap select is(public.withdraw_match_join_request('00000000-0000-4000-8000-000000000111',
  (select id from public.match_participants where match_id = '00000000-0000-4000-8000-000000000111' and user_id = '00000000-0000-4000-8000-000000000103' and status = 'pending')), 'cancelled', 'player can withdraw a pending request');
insert into phase07_tap select is((select count(*)::integer from public.match_participants where match_id = '00000000-0000-4000-8000-000000000111' and status = 'pending'), 0, 'withdrawal removes request from pending organizer view');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}', true);
insert into phase07_tap select lives_ok($$select public.request_match_join('00000000-0000-4000-8000-000000000113', null)$$, 'first final-seat candidate can request');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}', true);
insert into phase07_tap select lives_ok($$select public.request_match_join('00000000-0000-4000-8000-000000000113', null)$$, 'second pending request does not reserve the final seat');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);
insert into phase07_tap select is(public.review_match_join_request('00000000-0000-4000-8000-000000000113',
  (select participant_id from public.get_match_join_requests('00000000-0000-4000-8000-000000000113' ) where display_name = 'Player A'), 'approve'), 'active', 'organizer can approve the final available place');
insert into phase07_tap select throws_ok($$select public.review_match_join_request('00000000-0000-4000-8000-000000000113',
  (select participant_id from public.get_match_join_requests('00000000-0000-4000-8000-000000000113') where display_name = 'Player B'), 'approve')$$,
  '23514', 'match_full', 'second approval is rejected when capacity is full');

reset role;
insert into phase07_tap select is((select count(*)::integer from public.notification_outbox where event_type = 'match_join_requested'), 5, 'request events enter the transactional notification outbox');
insert into phase07_tap select is((select count(*)::integer from public.notification_outbox where event_type = 'match_join_approved'), 2, 'approval events enter the transactional notification outbox');
insert into phase07_tap select is((select count(*)::integer from public.notification_outbox where event_type = 'match_join_rejected'), 1, 'rejection event enters the transactional notification outbox');
select * from finish();
select coalesce(jsonb_agg(result), '[]'::jsonb) from phase07_tap where result like '%not ok%';
rollback;
