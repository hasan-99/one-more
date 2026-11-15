import type { Json } from '@/lib/database.types';
import { getSupabaseClient } from '@/lib/supabase';

export type ChallengeWindowValue = { startsAt: string; endsAt: string };
export type TeamChallenge = {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  format: number;
  cityId: string;
  cityNameEn: string;
  cityNameEl: string;
  areaNameEn: string;
  areaNameEl: string;
  skillLevel: string | null;
  note: string | null;
  status: string;
  windows: ChallengeWindowValue[];
  requestCount: number;
  createdAt: string;
};
export type ChallengeRequest = { id: string; teamName: string; status: string };
export type TeamChallengeDetails = TeamChallenge & {
  areaId: string;
  viewerHomeRole: string | null;
  myTeamName: string | null;
  myRequestId: string | null;
  myRequestStatus: string | null;
  requests: ChallengeRequest[];
  proposedStartsAt: string | null;
  proposedAreaId: string | null;
  proposedVenueName: string | null;
  proposedVenueAddress: string | null;
  linkedMatchId: string | null;
};

function record(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseWindows(value: Json | undefined): ChallengeWindowValue[] | null {
  if (!Array.isArray(value)) return null;
  const windows: ChallengeWindowValue[] = [];
  for (const item of value) {
    if (!record(item) || typeof item.starts_at !== 'string' || typeof item.ends_at !== 'string')
      return null;
    windows.push({ startsAt: item.starts_at, endsAt: item.ends_at });
  }
  return windows;
}

function parseRequests(value: Json | undefined): ChallengeRequest[] | null {
  if (!Array.isArray(value)) return null;
  const requests: ChallengeRequest[] = [];
  for (const item of value) {
    if (
      !record(item) ||
      typeof item.id !== 'string' ||
      typeof item.team_name !== 'string' ||
      typeof item.status !== 'string'
    )
      return null;
    requests.push({ id: item.id, teamName: item.team_name, status: item.status });
  }
  return requests;
}

export function validateChallengeWindows(windows: ChallengeWindowValue[]): boolean {
  if (windows.length < 1 || windows.length > 5) return false;
  const now = Date.now();
  return windows.every(({ startsAt, endsAt }) => {
    const start = Date.parse(startsAt);
    const end = Date.parse(endsAt);
    return (
      Number.isFinite(start) && Number.isFinite(end) && start > now && end - start >= 90 * 60_000
    );
  });
}

export async function listTeamChallenges(
  cityId?: string,
  format?: number,
): Promise<TeamChallenge[]> {
  const { data, error } = await getSupabaseClient().rpc('list_team_challenges', {
    p_city_id: cityId || undefined,
    p_format: format,
  });
  if (error) throw error;
  return data.flatMap((row) => {
    const windows = parseWindows(row.windows);
    return windows
      ? [
          {
            id: row.challenge_id,
            homeTeamId: row.home_team_id,
            homeTeamName: row.home_team_name,
            format: row.format,
            cityId: row.city_id,
            cityNameEn: row.city_name_en,
            cityNameEl: row.city_name_el,
            areaNameEn: row.area_name_en,
            areaNameEl: row.area_name_el,
            skillLevel: row.skill_level,
            note: row.note,
            status: row.status,
            windows,
            requestCount: row.request_count,
            createdAt: row.created_at,
          },
        ]
      : [];
  });
}

export async function loadTeamChallengeDetails(id: string): Promise<TeamChallengeDetails | null> {
  const { data, error } = await getSupabaseClient().rpc('get_team_challenge_details', {
    p_challenge_id: id,
  });
  if (error) throw error;
  if (!record(data)) return null;
  const windows = parseWindows(data.windows);
  const requests = parseRequests(data.requests);
  if (
    typeof data.id !== 'string' ||
    typeof data.home_team_id !== 'string' ||
    typeof data.home_team_name !== 'string' ||
    typeof data.format !== 'number' ||
    typeof data.city_id !== 'string' ||
    typeof data.area_id !== 'string' ||
    typeof data.city_name_en !== 'string' ||
    typeof data.city_name_el !== 'string' ||
    typeof data.area_name_en !== 'string' ||
    typeof data.area_name_el !== 'string' ||
    typeof data.status !== 'string' ||
    !windows ||
    !requests
  )
    return null;
  return {
    id: data.id,
    homeTeamId: data.home_team_id,
    homeTeamName: data.home_team_name,
    format: data.format,
    cityId: data.city_id,
    areaId: data.area_id,
    cityNameEn: data.city_name_en,
    cityNameEl: data.city_name_el,
    areaNameEn: data.area_name_en,
    areaNameEl: data.area_name_el,
    skillLevel: typeof data.skill_level === 'string' ? data.skill_level : null,
    note: typeof data.note === 'string' ? data.note : null,
    status: data.status,
    windows,
    requestCount: requests.filter((item) => item.status === 'pending' || item.status === 'accepted')
      .length,
    createdAt: '',
    viewerHomeRole: typeof data.viewer_home_role === 'string' ? data.viewer_home_role : null,
    myTeamName: typeof data.my_team_name === 'string' ? data.my_team_name : null,
    myRequestId: typeof data.my_request_id === 'string' ? data.my_request_id : null,
    myRequestStatus: typeof data.my_request_status === 'string' ? data.my_request_status : null,
    requests,
    proposedStartsAt: typeof data.proposed_starts_at === 'string' ? data.proposed_starts_at : null,
    proposedAreaId: typeof data.proposed_area_id === 'string' ? data.proposed_area_id : null,
    proposedVenueName:
      typeof data.proposed_venue_name === 'string' ? data.proposed_venue_name : null,
    proposedVenueAddress:
      typeof data.proposed_venue_address === 'string' ? data.proposed_venue_address : null,
    linkedMatchId: typeof data.linked_match_id === 'string' ? data.linked_match_id : null,
  };
}

export async function createTeamChallenge(input: {
  homeTeamId: string;
  format: number;
  cityId: string;
  areaId: string;
  /** Skill level is no longer asked; the RPC accepts null. */
  skillLevel: string | null;
  note: string;
  windows: ChallengeWindowValue[];
}): Promise<string> {
  const p_windows = input.windows.map((window) => ({
    starts_at: window.startsAt,
    ends_at: window.endsAt,
  })) satisfies Json;
  const { data, error } = await getSupabaseClient().rpc('create_team_challenge', {
    p_home_team_id: input.homeTeamId,
    p_format: input.format,
    p_city_id: input.cityId,
    p_area_id: input.areaId,
    // Generated types mark this as a required string, but the function allows null.
    p_skill_level: input.skillLevel as string,
    p_note: input.note,
    p_windows,
  });
  if (error) throw error;
  return data;
}

export async function requestTeamChallenge(
  challengeId: string,
  awayTeamId: string,
): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('request_team_challenge', {
    p_challenge_id: challengeId,
    p_away_team_id: awayTeamId,
  });
  if (error) throw error;
  return data;
}

export async function respondChallengeRequest(
  requestId: string,
  decision: 'accept' | 'decline',
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('respond_to_challenge_request', {
    p_request_id: requestId,
    p_decision: decision,
  });
  if (error) throw error;
}

export async function withdrawChallengeRequest(requestId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('withdraw_challenge_request', {
    p_request_id: requestId,
  });
  if (error) throw error;
}

export async function proposeChallengeMatch(input: {
  challengeId: string;
  startsAt: string;
  areaId: string;
  venueName: string;
  venueAddress: string;
}): Promise<void> {
  const { error } = await getSupabaseClient().rpc('propose_challenge_match', {
    p_challenge_id: input.challengeId,
    p_starts_at: input.startsAt,
    p_area_id: input.areaId,
    p_venue_name: input.venueName,
    p_venue_address: input.venueAddress,
  });
  if (error) throw error;
}

export async function confirmChallengeMatch(challengeId: string): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('confirm_challenge_match', {
    p_challenge_id: challengeId,
  });
  if (error) throw error;
  return data;
}

export async function cancelTeamChallenge(challengeId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('cancel_team_challenge', {
    p_challenge_id: challengeId,
  });
  if (error) throw error;
}
