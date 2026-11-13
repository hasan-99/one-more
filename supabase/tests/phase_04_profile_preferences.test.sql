begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('00000000-0000-4000-8000-000000000041', 'authenticated', 'authenticated', 'phase4-a@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Player A","phone":"+35799123456"}'::jsonb),
  ('00000000-0000-4000-8000-000000000042', 'authenticated', 'authenticated', 'phase4-b@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Player B","phone":"+35799223456"}'::jsonb);

select ok((select count(*) >= 7 from public.areas), 'Nicosia area choices are seeded');

set local role anon;
select ok((select count(*) > 0 from public.cities), 'anonymous users can read city choices');
select throws_ok('select user_id from public.user_preferences', '42501', 'permission denied for table user_preferences', 'anonymous users cannot read preferences');
select throws_ok('select id from public.profiles', '42501', 'permission denied for table profiles', 'anonymous users cannot read profiles');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000041","role":"authenticated"}', true);

select is((select count(*)::integer from public.profiles), 1, 'user can read own profile only');
select is((select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000042'), 0, 'user cannot read another profile');
select is((select display_name from public.profiles where id = auth.uid()), 'Player A', 'signup name is copied into the profile');
select is((select phone from public.profiles where id = auth.uid()), '+35799123456', 'owner can read own signup phone');
select is((select count(*)::integer from public.notification_preferences), 1, 'auth trigger creates notification preferences');

update public.profiles
set display_name = 'Player A',
    city_id = (select id from public.cities where slug = 'nicosia'),
    area_id = (select id from public.areas where slug = 'strovolos'),
    onboarding_complete = true
where id = auth.uid();
select is((select count(*)::integer from public.profiles where onboarding_complete), 1, 'user can complete own profile');
with changed as (
  update public.profiles set display_name = 'Tampered' where id = '00000000-0000-4000-8000-000000000042'
  returning id
)
select is((select count(*)::integer from changed), 0, 'user cannot update another profile');

update public.user_preferences set preferred_formats = array[8]::smallint[] where user_id = auth.uid();
select is((select preferred_formats from public.user_preferences where user_id = auth.uid()), array[8]::smallint[], 'user can update own preferences');
with changed as (
  update public.user_preferences
  set preferred_formats = array[11]::smallint[]
  where user_id = '00000000-0000-4000-8000-000000000042'
  returning user_id
)
select is((select count(*)::integer from changed), 0, 'user cannot update another user preferences');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000042","role":"authenticated"}', true);
select is((select count(*)::integer from public.profiles), 1, 'second user can read own profile');
select is((select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000041'), 0, 'second user cannot read first profile');
select is((select count(*)::integer from public.profiles where phone = '+35799123456'), 0, 'second user cannot read first user phone');
select is((select count(*)::integer from public.user_preferences), 1, 'second user can read own preferences');
select is((select count(*)::integer from public.user_preferences where user_id = '00000000-0000-4000-8000-000000000041'), 0, 'second user cannot read first preferences');
update public.user_preferences set preferred_formats = array[11]::smallint[] where user_id = auth.uid();
select is((select preferred_formats from public.user_preferences where user_id = auth.uid()), array[11]::smallint[], 'second user can save own preferences');

select * from finish();
rollback;
