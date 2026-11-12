create index team_challenges_proposed_area_city_idx on public.team_challenges(proposed_area_id,city_id)
  where proposed_area_id is not null;
alter table public.team_challenges add constraint team_challenges_proposed_area_city_fk
  foreign key (proposed_area_id,city_id) references public.areas(id,city_id) on delete restrict;
