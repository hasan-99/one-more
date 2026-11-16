import { loadMatchJoinRequests } from '@/features/matches/match-join-service';
import { mapDiscoveryRow } from '@/features/matches/match-service';
import {
  listMyTeamInvites,
  listMyTeams,
  type MyTeam,
  type TeamInvite,
} from '@/features/teams/team-service';
import type { Tables } from '@/lib/database.types';
import { getSupabaseClient } from '@/lib/supabase';

import { pickNextGame, type HomeMatch } from './home-logic';

const homeMatchLimit = 20;

function toHomeMatches(rows: Tables<'match_discovery'>[] | null): HomeMatch[] {
  return (rows ?? []).flatMap((row) => {
    const item = mapDiscoveryRow(row);
    return item ? [{ ...item, createdAt: row.created_at }] : [];
  });
}

/** Upcoming published games, soonest first. Works signed out. */
export async function loadHomeMatches(): Promise<HomeMatch[]> {
  const { data, error } = await getSupabaseClient()
    .from('match_discovery')
    .select('*')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(homeMatchLimit);
  if (error) throw error;
  return toHomeMatches(data);
}

export type HomePersonal = {
  next: HomeMatch | null;
  pendingRequests: number;
  teams: MyTeam[];
  invites: TeamInvite[];
};

/** What belongs to the signed-in player: next game, people waiting on them, teams and invites. */
export async function loadHomePersonal(
  userId: string,
  upcoming: readonly HomeMatch[],
): Promise<HomePersonal> {
  const client = getSupabaseClient();
  const [places, teams, invites] = await Promise.all([
    client
      .from('match_participants')
      .select('match_id')
      .eq('user_id', userId)
      .eq('status', 'active'),
    listMyTeams(),
    listMyTeamInvites(),
  ]);
  if (places.error) throw places.error;
  const joinedIds = new Set((places.data ?? []).map((row) => row.match_id));

  // A joined game may be further away than the first page of upcoming games, so ask for those too.
  const known = new Set(upcoming.map((match) => match.id));
  const missing = [...joinedIds].filter((id) => !known.has(id));
  let joined: HomeMatch[] = [];
  if (missing.length > 0) {
    const { data, error } = await client
      .from('match_discovery')
      .select('*')
      .in('id', missing)
      .gt('starts_at', new Date().toISOString());
    if (error) throw error;
    joined = toHomeMatches(data);
  }

  const next = pickNextGame([...upcoming, ...joined], joinedIds, Date.now());
  let pendingRequests = 0;
  if (next?.isOrganizer) {
    const requests = await loadMatchJoinRequests(next.id);
    pendingRequests = requests.filter((request) => request.status === 'pending').length;
  }
  return { next, pendingRequests, teams, invites };
}
