create function public.get_match_chat_report_counts(p_match_id uuid)
returns table(message_id uuid,report_count integer,reasons text[])
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.matches where id=p_match_id and organizer_id=auth.uid() and event_status='published') then
    raise exception 'match_not_owned' using errcode='42501';
  end if;
  return query select report.message_id,count(*)::integer,array_agg(distinct report.reason order by report.reason)
    from public.match_message_reports report
    join public.match_messages message on message.id=report.message_id
    where message.match_id=p_match_id and report.status='open'
    group by report.message_id;
end;
$$;
revoke all on function public.get_match_chat_report_counts(uuid) from public,anon,authenticated;
grant execute on function public.get_match_chat_report_counts(uuid) to authenticated;
