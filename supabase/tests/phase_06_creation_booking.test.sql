begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data)
values
  ('00000000-0000-4000-8000-000000000101','authenticated','authenticated','phase6-a@example.invalid','',now(),'{"provider":"email","providers":["email"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000102','authenticated','authenticated','phase6-b@example.invalid','',now(),'{"provider":"email","providers":["email"]}'::jsonb),
  ('00000000-0000-4000-8000-000000000103','authenticated','authenticated','phase6-incomplete@example.invalid','',now(),'{"provider":"email","providers":["email"]}'::jsonb);

update public.profiles
set display_name = 'Phase Six Organizer',
    city_id = (select id from public.cities where slug = 'nicosia'),
    area_id = (select id from public.areas where slug = 'strovolos'),
    onboarding_complete = true
where id in ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000102');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);

select public.create_match_with_positions(
  jsonb_build_object('title','Phase 06 five aside','side_size',5,'city_id',(select id from public.cities where slug='nicosia'),
    'area_id',(select id from public.areas where slug='strovolos'),'venue_display_name','Test field','venue_address','Strovolos',
    'starts_at',(now()+interval '5 days')::text,'duration_minutes',60,'skill_level','beginner','price_eur',0,
    'reserved_guest_slots',0,'event_status','draft','booking_status','confirmed'),
  '[{"position":"forward","x_pct":72,"y_pct":18},{"position":"defender","x_pct":30,"y_pct":66}]'::jsonb,
  '{"organizer_notes":"Access via side gate","reference":"FIELD-16"}'::jsonb
);
select public.create_match_with_positions(
  jsonb_build_object('title','Phase 06 seven aside','side_size',7,'city_id',(select id from public.cities where slug='nicosia'),
    'area_id',(select id from public.areas where slug='strovolos'),'venue_display_name','Test field','venue_address','Strovolos',
    'starts_at',(now()+interval '6 days')::text,'duration_minutes',90,'skill_level','intermediate','price_eur',5,
    'reserved_guest_slots',2,'event_status','published','booking_status','pending'),
  '[{"position":"goalkeeper","x_pct":50,"y_pct":88}]'::jsonb,
  '{}'::jsonb
);
select public.create_match_with_positions(
  jsonb_build_object('title','Phase 06 eight aside','side_size',8,'city_id',(select id from public.cities where slug='nicosia'),
    'area_id',(select id from public.areas where slug='strovolos'),'venue_display_name','Test field','venue_address','Strovolos',
    'starts_at',(now()+interval '7 days')::text,'duration_minutes',120,'skill_level','advanced','price_eur',10,
    'reserved_guest_slots',0,'event_status','draft'),
  '[]'::jsonb,'{}'::jsonb
);
select public.create_match_with_positions(
  jsonb_build_object('title','Phase 06 eleven aside','side_size',11,'city_id',(select id from public.cities where slug='nicosia'),
    'area_id',(select id from public.areas where slug='strovolos'),'venue_display_name','Test field','venue_address','Strovolos',
    'starts_at',(now()+interval '8 days')::text,'duration_minutes',90,'price_eur',0,'reserved_guest_slots',0,'event_status','draft'),
  '[]'::jsonb,'{}'::jsonb
);

select is((select 2 * side_size from public.matches where title='Phase 06 five aside'),10,'5v5 capacity is ten');
select is((select 2 * side_size from public.matches where title='Phase 06 seven aside'),14,'7v7 capacity is fourteen');
select is((select 2 * side_size from public.matches where title='Phase 06 eight aside'),16,'8v8 capacity is sixteen');
select is((select 2 * side_size from public.matches where title='Phase 06 eleven aside'),22,'11v11 capacity is twenty-two');
select is((select count(*)::integer from public.match_position_slots where match_id=(select id from public.matches where title='Phase 06 five aside')),2,'position coordinates persist with the match');
select is((select booking_status from public.matches where title='Phase 06 seven aside'),'pending','manual booking status is stored');
select is((select free_spots from public.match_discovery where title='Phase 06 seven aside'),12,'guest reservations reduce free capacity');
select is((select count(*)::integer from public.match_booking_private_details where match_id=(select id from public.matches where title='Phase 06 five aside')),1,'booking notes are saved privately for organizer');
select is((select x_pct from public.match_position_slots where match_id=(select id from public.matches where title='Phase 06 five aside') and position_code='forward'),72::numeric,'pitch x coordinate is preserved');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}', true);
select is((select count(*)::integer from public.matches where title='Phase 06 five aside'),0,'another organizer cannot read draft matches');
select is((select count(*)::integer from public.match_booking_private_details),0,'another organizer cannot read private field notes');
select throws_ok($q$select public.update_match_with_positions(
  (select id from public.matches where title='Phase 06 five aside'),
  '{}'::jsonb,'[]'::jsonb,'{}'::jsonb)$q$,'42501','match_not_owned','another organizer cannot update a match');
select throws_ok($q$select public.cancel_match((select id from public.matches where title='Phase 06 five aside'))$q$,
  '42501','match_not_owned_or_not_cancellable','another organizer cannot cancel a match');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated"}', true);
select throws_ok($q$select public.create_match_with_positions(
  jsonb_build_object('title','Incomplete profile match','side_size',5,'city_id',(select id from public.cities where slug='nicosia'),
    'area_id',(select id from public.areas where slug='strovolos'),'venue_display_name','Field','venue_address','Nicosia',
    'starts_at',(now()+interval '1 day')::text,'duration_minutes',60,'reserved_guest_slots',0,'event_status','draft'),
  '[]'::jsonb,'{}'::jsonb)$q$,'42501','verified_profile_required','an incomplete profile cannot create a match');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}', true);
select public.update_match_with_positions(
  (select id from public.matches where title='Phase 06 five aside'),
  jsonb_build_object('title','Phase 06 updated five aside','side_size',7,'city_id',(select id from public.cities where slug='nicosia'),
    'area_id',(select id from public.areas where slug='strovolos'),'venue_display_name','Updated field','venue_address','Strovolos',
    'starts_at',(now()+interval '9 days')::text,'duration_minutes',90,'skill_level','intermediate','price_eur',3,
    'reserved_guest_slots',0,'event_status','published','booking_status','not_booked','notes','Bring light shirts'),
  '[{"position":"midfielder","x_pct":50,"y_pct":45}]'::jsonb,
  '{"organizer_notes":"Updated booking note"}'::jsonb
);
select is((select title from public.matches where title='Phase 06 updated five aside'),'Phase 06 updated five aside','organizer can update their match');
select is((select event_status from public.matches where title='Phase 06 updated five aside'),'published','updated draft can be published');
select is((select count(*)::integer from public.match_discovery where title='Phase 06 updated five aside'),1,'published match is publicly discoverable');
select public.cancel_match((select id from public.matches where title='Phase 06 updated five aside'));
select is((select event_status from public.matches where title='Phase 06 updated five aside'),'cancelled','organizer can cancel their future match');

select * from finish();
rollback;
