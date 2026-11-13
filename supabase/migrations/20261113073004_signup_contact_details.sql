alter table public.profiles
  add column phone text,
  add constraint profiles_display_name_english_check check (
    display_name is null or btrim(display_name) ~ '^[A-Za-z][A-Za-z .''-]*$'
  ),
  add constraint profiles_phone_format_check check (
    phone is null or (
      phone = btrim(phone)
      and phone ~ '^[+0-9 ()-]+$'
      and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15
    )
  );

comment on column public.profiles.phone is
  'Private contact number; direct profile reads are limited to the owner.';

grant update (phone) on public.profiles to authenticated;

update public.profiles as profile
set display_name = coalesce(profile.display_name, nullif(btrim(auth_user.raw_user_meta_data ->> 'display_name'), '')),
    phone = coalesce(profile.phone, nullif(btrim(auth_user.raw_user_meta_data ->> 'phone'), ''))
from auth.users as auth_user
where auth_user.id = profile.id
  and (profile.display_name is null or profile.phone is null);

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  display_name_value text := nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '');
  phone_value text := nullif(btrim(new.raw_user_meta_data ->> 'phone'), '');
begin
  if display_name_value is null
    or char_length(display_name_value) not between 2 and 40
    or display_name_value !~ '^[A-Za-z][A-Za-z .''-]*$' then
    raise exception using errcode = '23514', message = 'signup_name_required';
  end if;
  if phone_value is null
    or phone_value <> btrim(phone_value)
    or phone_value !~ '^[+0-9 ()-]+$'
    or char_length(regexp_replace(phone_value, '[^0-9]', '', 'g')) not between 7 and 15 then
    raise exception using errcode = '23514', message = 'signup_phone_invalid';
  end if;

  insert into public.profiles (id, display_name, phone)
  values (new.id, display_name_value, phone_value);
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$function$;

revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;
