alter table public.profiles
  add column shirt_number smallint not null default 8
    check (shirt_number between 1 and 99),
  add column strong_foot text not null default 'right'
    check (strong_foot in ('left', 'right', 'both'));

grant update (shirt_number, strong_foot) on table public.profiles to authenticated;
