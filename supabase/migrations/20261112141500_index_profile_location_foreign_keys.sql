create index profiles_city_id_idx on public.profiles (city_id);
create index profiles_area_city_idx on public.profiles (area_id, city_id);
