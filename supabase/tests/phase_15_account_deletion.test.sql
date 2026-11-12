begin;
create extension if not exists pgtap with schema extensions;
create temporary table phase15_tap(result text);
create temporary table phase15_ids(label text primary key, id uuid not null);
grant select, insert on phase15_tap, phase15_ids to authenticated;
grant insert on phase15_tap to anon;

insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data) values
 ('00000000-0000-4000-8000-000000001501','authenticated','authenticated','phase15-owner@example.invalid','',now(),'{"provider":"email","providers":["email"]}'),
 ('00000000-0000-4000-8000-000000001502','authenticated','authenticated','phase15-outsider@example.invalid','',now(),'{"provider":"email","providers":["email"]}');

select plan(24);
insert into phase15_tap select has_table('public','account_deletion_requests','account deletion request table exists');
insert into phase15_tap select ok((select relrowsecurity from pg_class where oid='public.account_deletion_requests'::regclass),'deletion requests have RLS enabled');
insert into phase15_tap select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='account_deletion_requests' and policyname='Users can read their own deletion requests' and cmd='SELECT'),'request reads use an owner-only policy');
insert into phase15_tap select ok(has_column_privilege('authenticated','public.account_deletion_requests','id','SELECT'),'authenticated users can read their request status');
insert into phase15_tap select ok(not has_table_privilege('authenticated','public.account_deletion_requests','INSERT'),'clients cannot insert deletion requests directly');
insert into phase15_tap select ok(not has_function_privilege('anon','public.request_account_deletion()','EXECUTE'),'anonymous users cannot request account deletion');
insert into phase15_tap select ok(has_function_privilege('authenticated','public.request_account_deletion()','EXECUTE'),'authenticated users can request account deletion');

set local role anon;
insert into phase15_tap select throws_ok($$select * from public.account_deletion_requests$$,'42501','permission denied for table account_deletion_requests','anonymous users cannot read deletion requests');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001501","role":"authenticated"}',true);
insert into phase15_tap select lives_ok($$select public.request_account_deletion()$$,'account owner can submit a deletion request');
insert into phase15_ids select 'owner',public.request_account_deletion();
insert into phase15_tap select is(public.request_account_deletion(),(select id from phase15_ids where label='owner'),'repeat submission returns the existing active request');
insert into phase15_tap select is((select count(*)::integer from public.account_deletion_requests),1,'one active request exists for the account owner');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001502","role":"authenticated"}',true);
insert into phase15_tap select is((select count(*)::integer from public.account_deletion_requests),0,'another user cannot see the account owner request');
insert into phase15_tap select is(public.cancel_account_deletion_request((select id from phase15_ids where label='owner')),false,'another user cannot cancel the account owner request');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001501","role":"authenticated"}',true);
insert into phase15_tap select is((select status from public.account_deletion_requests where id=(select id from phase15_ids where label='owner')),'requested','unauthorized cancellation leaves the request unchanged');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001502","role":"authenticated"}',true);
insert into phase15_tap select lives_ok($$select public.request_account_deletion()$$,'second account can submit its own request');
insert into phase15_ids select 'outsider',public.request_account_deletion();
insert into phase15_tap select is(public.cancel_account_deletion_request((select id from phase15_ids where label='outsider')),true,'owner can cancel their own pending request');
insert into phase15_tap select is((select status from public.account_deletion_requests where id=(select id from phase15_ids where label='outsider')),'cancelled','cancellation is recorded');
insert into phase15_tap select ok((select cancelled_at is not null from public.account_deletion_requests where id=(select id from phase15_ids where label='outsider')),'cancellation timestamp is recorded');
insert into phase15_tap select lives_ok($$select public.request_account_deletion()$$,'owner can create a new request after cancellation');
insert into phase15_tap select is((select count(*)::integer from public.account_deletion_requests where status='requested'),1,'only one pending request remains after re-submission');
insert into phase15_tap select throws_ok($$insert into public.account_deletion_requests(user_id) values('00000000-0000-4000-8000-000000001502')$$,'42501','permission denied for table account_deletion_requests','direct client inserts are rejected');
insert into phase15_tap select throws_ok($$update public.account_deletion_requests set status='cancelled'$$,'42501','permission denied for table account_deletion_requests','direct client updates are rejected');
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001501","role":"authenticated"}',true);
insert into phase15_tap select is(public.cancel_account_deletion_request((select id from phase15_ids where label='owner')),true,'account owner can withdraw a request');
insert into phase15_tap select is((select count(*)::integer from public.account_deletion_requests where status='requested'),0,'withdrawn request is no longer active to its owner');
reset role;

select * from finish();
select * from phase15_tap;
rollback;
