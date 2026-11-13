begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data
)
values
  (
    '00000000-0000-4000-8000-000000000031',
    'authenticated',
    'authenticated',
    'phase3-a@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb
  ),
  (
    '00000000-0000-4000-8000-000000000032',
    'authenticated',
    'authenticated',
    'phase3-b@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Test Player","phone":"+35799123456"}'::jsonb
  );

select is(
  (select count(*)::integer from public.profiles),
  2,
  'Auth user inserts create profile rows'
);

set local role anon;
select throws_ok(
  'select id from public.profiles',
  '42501',
  'permission denied for table profiles',
  'anon cannot read profiles'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000031","role":"authenticated"}',
  true
);

select is(
  (select count(*)::integer from public.profiles),
  1,
  'authenticated user can read their own profile'
);
select is(
  (select count(*)::integer from public.profiles where id = '00000000-0000-4000-8000-000000000032'),
  0,
  'authenticated user cannot read another profile'
);

select * from finish();
rollback;
