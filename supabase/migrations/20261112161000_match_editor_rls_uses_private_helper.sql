drop policy "Only match organizers can read private booking details"
  on public.match_booking_private_details;
create policy "Only match organizers can read private booking details"
  on public.match_booking_private_details for select to authenticated
  using (private.is_match_organizer(match_id));

drop policy "Organizers can read every position on their own matches"
  on public.match_position_slots;
create policy "Organizers can read every position on their own matches"
  on public.match_position_slots for select to authenticated
  using (private.is_match_organizer(match_id));
