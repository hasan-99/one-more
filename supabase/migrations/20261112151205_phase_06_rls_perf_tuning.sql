create index match_booking_private_details_reported_by_idx
  on public.match_booking_private_details(reported_by);

drop policy "Organizers can read their own matches" on public.matches;
drop policy "Published future matches are publicly discoverable" on public.matches;
create policy "Organizers and players can read published future matches"
  on public.matches for select to anon, authenticated
  using (
    (event_status = 'published' and starts_at > now())
    or (select private.is_match_organizer(id))
  );

drop policy "Organizers can read every position on their own matches"
  on public.match_position_slots;
drop policy "Public can read positions on published future matches"
  on public.match_position_slots;
create policy "Organizers and players can read match positions"
  on public.match_position_slots for select to anon, authenticated
  using (
    (status = 'open' and exists (
      select 1 from public.matches match_row
      where match_row.id = match_position_slots.match_id
        and match_row.event_status = 'published'
        and match_row.starts_at > now()
    ))
    or (select private.is_match_organizer(match_id))
  );
