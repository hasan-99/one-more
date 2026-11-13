begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-4000-8000-000000000051', 'authenticated', 'authenticated', 'phase5-organizer@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb),
  ('00000000-0000-4000-8000-000000000052', 'authenticated', 'authenticated', 'phase5-player-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb),
  ('00000000-0000-4000-8000-000000000053', 'authenticated', 'authenticated', 'phase5-player-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb);

insert into public.matches (
  id, organizer_id, title, side_size, city_id, area_id, venue_display_name, venue_address,
  starts_at, duration_minutes, skill_level, price_eur, reserved_guest_slots, event_status, notes
)
select
  '00000000-0000-4000-8000-000000000061',
  '00000000-0000-4000-8000-000000000051',
  'Phase 05 discovery fixture', 5, city.id, area.id, 'Demo field', 'Nicosia test address',
  now() + interval '3 days', 90, 'intermediate', 4.50, 1, 'published', 'Public game details'
from public.cities city
join public.areas area on area.city_id = city.id and area.slug = 'strovolos'
where city.slug = 'nicosia';

insert into public.match_booking_private_details(match_id, organizer_notes, reported_by)
values (
  '00000000-0000-4000-8000-000000000061',
  'Secret field booking details',
  '00000000-0000-4000-8000-000000000051'
);

insert into public.matches (
  id, organizer_id, title, side_size, city_id, area_id, venue_display_name, venue_address,
  starts_at, duration_minutes, event_status
)
select
  '00000000-0000-4000-8000-000000000063',
  '00000000-0000-4000-8000-000000000051',
  'Phase 05 capacity fixture', 5, city.id, area.id, 'Capacity field', 'Nicosia test address',
  now() + interval '4 days', 90, 'published'
from public.cities city
join public.areas area on area.city_id = city.id and area.slug = 'strovolos'
where city.slug = 'nicosia';

insert into public.match_position_slots (match_id, position_code)
values
  ('00000000-0000-4000-8000-000000000063', 'defender'),
  ('00000000-0000-4000-8000-000000000063', 'forward');

update public.match_position_slots set status = 'removed'
where match_id = '00000000-0000-4000-8000-000000000063' and position_code = 'forward';

update public.matches set reserved_guest_slots = 9
where id = '00000000-0000-4000-8000-000000000063';

insert into public.match_participants (id, match_id, user_id)
values
  ('00000000-0000-4000-8000-000000000071', '00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000052'),
  ('00000000-0000-4000-8000-000000000072', '00000000-0000-4000-8000-000000000061', '00000000-0000-4000-8000-000000000053');

insert into public.match_position_slots (id, match_id, position_code)
values
  ('00000000-0000-4000-8000-000000000081', '00000000-0000-4000-8000-000000000061', 'goalkeeper'),
  ('00000000-0000-4000-8000-000000000082', '00000000-0000-4000-8000-000000000061', 'defender');

insert into public.matches (
  id, organizer_id, title, side_size, city_id, area_id, venue_display_name, venue_address,
  starts_at, duration_minutes, event_status
)
select
  '00000000-0000-4000-8000-000000000062',
  '00000000-0000-4000-8000-000000000051',
  'Phase 05 draft fixture', 5, city.id, area.id, 'Draft field', 'Private test address',
  now() + interval '3 days', 90, 'draft'
from public.cities city
join public.areas area on area.city_id = city.id and area.slug = 'strovolos'
where city.slug = 'nicosia';

set local role anon;
select is((select capacity from public.match_discovery where id = '00000000-0000-4000-8000-000000000061'), 10, '5-a-side format has capacity ten');
select is((select active_players from public.match_discovery where id = '00000000-0000-4000-8000-000000000061'), 2, 'public count exposes aggregate players only');
select is((select free_spots from public.match_discovery where id = '00000000-0000-4000-8000-000000000061'), 7, 'free spots subtract players and guest reservations');
select is((select jsonb_array_length(open_positions) from public.match_discovery where id = '00000000-0000-4000-8000-000000000061'), 2, 'position map matches the two persisted open slots');
select is((select free_spots from public.match_discovery where id = '00000000-0000-4000-8000-000000000063'), 1, 'capacity reductions recalculate free spots');
select is((select jsonb_array_length(open_positions) from public.match_discovery where id = '00000000-0000-4000-8000-000000000063'), 1, 'visible position markers never exceed remaining free spots');
select is((select count(*)::integer from public.match_discovery where id = '00000000-0000-4000-8000-000000000062'), 0, 'draft match is not discoverable');
select throws_ok('select organizer_notes from public.match_booking_private_details', '42501', 'permission denied for table match_booking_private_details', 'private booking notes are not selectable by guests');
select throws_ok('select organizer_id from public.matches', '42501', 'permission denied for table matches', 'organizer identity is not selectable by guests');
select throws_ok('select user_id from public.match_participants', '42501', 'permission denied for table match_participants', 'guest cannot enumerate participant identities');
select throws_ok($q$insert into public.match_position_slots(match_id, position_code)
  values ('00000000-0000-4000-8000-000000000061', 'any')$q$, '42501', 'permission denied for table match_position_slots', 'guest cannot change open positions');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000052","role":"authenticated"}', true);
select is((select count(*)::integer from public.match_participants), 1, 'player can read only their own participant record');
select is((select count(*)::integer from public.match_participants where user_id = '00000000-0000-4000-8000-000000000053'), 0, 'player cannot read another player record');
select is((select count(*)::integer from public.match_booking_private_details), 0, 'non-organizer cannot read private booking notes');

select * from finish();
rollback;
