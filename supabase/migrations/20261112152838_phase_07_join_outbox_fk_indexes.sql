create index match_participants_requested_position_slot_idx
  on public.match_participants(requested_position_slot_id)
  where requested_position_slot_id is not null;

create index notification_outbox_match_idx on public.notification_outbox(match_id);
create index notification_outbox_participant_idx on public.notification_outbox(participant_id);
create index notification_outbox_recipient_idx on public.notification_outbox(recipient_id);
