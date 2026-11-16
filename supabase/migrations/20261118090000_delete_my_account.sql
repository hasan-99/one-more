-- Real, immediate account deletion (App Store 5.1.1(v) and Google Play account-deletion policy).
-- The signed-in user calls public.delete_my_account(); everything tied to the account is removed.
-- Most tables already reference auth.users with ON DELETE CASCADE (profile, preferences, matches the
-- user organises, participation, waitlist entries, chat messages, reports, inbox, outbox, reminders,
-- team memberships and invites). Three foreign keys are RESTRICT (teams.captain_id,
-- team_challenges.created_by, challenge_requests.requested_by) and are resolved first:
--   * A team the user captains passes to its longest-serving other active member; a team with no
--     other member is disbanded together with its challenges and requests.
--   * Challenges the user created and requests the user sent are removed; a match already created from
--     such a challenge stays for the other players, detached from the challenge.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  owned record;
  heir uuid;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  for owned in select id from public.teams where captain_id = caller_id loop
    select member.user_id into heir
    from public.team_members member
    where member.team_id = owned.id and member.status = 'active' and member.user_id <> caller_id
    order by member.joined_at, member.id
    limit 1;

    if heir is not null then
      update public.team_members set role = 'member'
        where team_id = owned.id and user_id = caller_id and status = 'active';
      update public.team_members set role = 'captain'
        where team_id = owned.id and user_id = heir and status = 'active';
      update public.teams set captain_id = heir where id = owned.id;
    else
      update public.matches set challenge_id = null
        where challenge_id in (
          select id from public.team_challenges where home_team_id = owned.id
          union
          select challenge_id from public.challenge_requests where away_team_id = owned.id);
      delete from public.challenge_requests
        where away_team_id = owned.id
           or challenge_id in (select id from public.team_challenges where home_team_id = owned.id);
      delete from public.team_challenges where home_team_id = owned.id;
      delete from public.teams where id = owned.id;
    end if;
  end loop;

  update public.matches set challenge_id = null
    where challenge_id in (select id from public.team_challenges where created_by = caller_id);
  delete from public.challenge_requests
    where requested_by = caller_id
       or challenge_id in (select id from public.team_challenges where created_by = caller_id);
  delete from public.team_challenges where created_by = caller_id;

  -- Removes the Auth identity (email, password hash) and cascades to all remaining personal data.
  delete from auth.users where id = caller_id;
end;
$$;

revoke all on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;
