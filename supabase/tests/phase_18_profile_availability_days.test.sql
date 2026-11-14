begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-4000-8000-000000000181', 'authenticated', 'authenticated', 'phase18-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Day Player","phone":"+35799123481"}'::jsonb),
  ('00000000-0000-4000-8000-000000000182', 'authenticated', 'authenticated', 'phase18-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Other Player","phone":"+35799123482"}'::jsonb);

set local role anon;
select throws_ok(
  $$update public.user_preferences set availability_slots = array['mon']::text[]$$,
  '42501', null, 'anonymous users cannot change availability');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000181","role":"authenticated"}', true);

update public.user_preferences
set availability_slots = array['tue', 'thu', 'sat', 'weekday_evening']::text[]
where user_id = auth.uid();
select is(
  (select availability_slots from public.user_preferences where user_id = auth.uid()),
  array['tue', 'thu', 'sat', 'weekday_evening']::text[],
  'owner can save weekday availability alongside legacy day parts');

select throws_ok(
  $$update public.user_preferences set availability_slots = array['someday']::text[] where user_id = auth.uid()$$,
  '23514', null, 'unknown availability values are rejected');

with changed as (
  update public.user_preferences set availability_slots = array['mon']::text[]
  where user_id = '00000000-0000-4000-8000-000000000182'
  returning user_id
)
select is((select count(*)::integer from changed), 0, 'user cannot change another player''s availability');

reset role;
select is(
  (select availability_slots from public.user_preferences where user_id = '00000000-0000-4000-8000-000000000182'),
  '{}'::text[],
  'other player availability is untouched');

select * from finish();
rollback;
