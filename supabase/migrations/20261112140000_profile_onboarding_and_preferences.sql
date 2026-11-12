create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_el text not null,
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  slug text not null,
  name_en text not null,
  name_el text not null,
  created_at timestamptz not null default now(),
  unique (city_id, slug),
  unique (id, city_id)
);

insert into public.cities (slug, name_en, name_el, country_code)
values ('nicosia', 'Nicosia', 'Λευκωσία', 'CY')
on conflict (slug) do update
set name_en = excluded.name_en,
    name_el = excluded.name_el,
    country_code = excluded.country_code;

insert into public.areas (city_id, slug, name_en, name_el)
select city.id, area.slug, area.name_en, area.name_el
from public.cities as city
cross join (values
  ('nicosia', 'Nicosia', 'Λευκωσία'),
  ('strovolos', 'Strovolos', 'Στρόβολος'),
  ('lakatamia', 'Lakatamia', 'Λακατάμια'),
  ('latsia-geri', 'Latsia–Geri', 'Λατσιά–Γέρι'),
  ('aglantzia', 'Aglantzia', 'Αγλαντζιά'),
  ('engomi', 'Engomi', 'Έγκωμη'),
  ('agios-dometios', 'Agios Dometios', 'Άγιος Δομέτιος'),
  ('tseri', 'Tseri', 'Τσέρι')
) as area(slug, name_en, name_el)
where city.slug = 'nicosia'
on conflict (city_id, slug) do update
set name_en = excluded.name_en,
    name_el = excluded.name_el;

alter table public.profiles
  add column display_name text,
  add column avatar_path text,
  add column city_id uuid references public.cities (id) on delete restrict,
  add column area_id uuid,
  add column preferred_position text check (
    preferred_position in ('goalkeeper', 'defender', 'midfielder', 'forward', 'any')
  ),
  add column skill_level text check (skill_level in ('beginner', 'intermediate', 'advanced')),
  add column language text not null default 'en' check (language in ('en', 'el')),
  add column onboarding_complete boolean not null default false;

alter table public.profiles
  add constraint profiles_area_city_fkey
    foreign key (area_id, city_id) references public.areas (id, city_id) on delete restrict,
  add constraint profiles_display_name_length_check
    check (display_name is null or char_length(btrim(display_name)) between 2 and 40),
  add constraint profiles_onboarding_fields_check
    check (not onboarding_complete or (display_name is not null and city_id is not null and area_id is not null));

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preferred_formats smallint[] not null default array[5, 7]::smallint[]
    check (preferred_formats <@ array[5, 7, 8, 11]::smallint[]),
  availability_slots text[] not null default '{}'::text[]
    check (availability_slots <@ array[
      'weekday_morning', 'weekday_afternoon', 'weekday_evening',
      'weekend_morning', 'weekend_afternoon', 'weekend_evening'
    ]::text[]),
  max_radius_km integer check (max_radius_km between 1 and 200),
  timezone text not null default 'Asia/Nicosia' check (timezone = 'Asia/Nicosia'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  in_app_enabled boolean not null default true check (in_app_enabled),
  transactional_email_enabled boolean not null default true check (transactional_email_enabled),
  discovery_email_enabled boolean not null default false,
  chat_email_enabled boolean not null default false,
  native_push_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.user_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

insert into public.notification_preferences (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function private.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$function$;

revoke all on function private.create_profile_for_auth_user() from public, anon, authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function private.set_updated_at();

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function private.set_updated_at();

alter table public.cities enable row level security;
alter table public.areas enable row level security;
alter table public.user_preferences enable row level security;
alter table public.notification_preferences enable row level security;

revoke all on public.cities, public.areas from public, anon, authenticated;
grant select on public.cities, public.areas to anon, authenticated;
create policy "Cities are visible to everyone"
  on public.cities for select to anon, authenticated using (true);
create policy "Areas are visible to everyone"
  on public.areas for select to anon, authenticated using (true);

revoke all on public.user_preferences, public.notification_preferences from public, anon, authenticated;
grant select on public.user_preferences, public.notification_preferences to authenticated;
grant update (preferred_formats, availability_slots, max_radius_km)
  on public.user_preferences to authenticated;
grant update (discovery_email_enabled, chat_email_enabled, native_push_enabled)
  on public.notification_preferences to authenticated;
create policy "Users can read their own preferences"
  on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can update their own preferences"
  on public.user_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users can read their own notification preferences"
  on public.notification_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can update their own notification preferences"
  on public.notification_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_path, city_id, area_id, preferred_position, skill_level, language, onboarding_complete)
  on public.profiles to authenticated;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
