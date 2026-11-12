import type { Json, Tables } from '@/lib/database.types';
import { getSupabaseClient } from '@/lib/supabase';
export { validateTeamInput } from './team-validation';

export type TeamCity = Pick<Tables<'cities'>, 'id' | 'name_en' | 'name_el'>;
export type TeamDirectoryItem = {
  teamId: string;
  name: string;
  cityId: string;
  cityNameEn: string;
  cityNameEl: string;
  description: string | null;
  memberCount: number;
  createdAt: string;
};
export type MyTeam = {
  teamId: string;
  name: string;
  cityId: string;
  cityNameEn: string;
  cityNameEl: string;
  description: string | null;
  memberCount: number;
  role: string;
};
export type TeamInvite = {
  inviteId: string;
  teamId: string;
  teamName: string;
  cityNameEn: string;
  cityNameEl: string;
  invitedByName: string;
  expiresAt: string;
};
export type TeamCandidate = { userId: string; displayName: string };
export type TeamMember = {
  id: string;
  userId: string | null;
  displayName: string;
  role: string;
  joinedAt: string;
};
export type TeamPendingInvite = { id: string; displayName: string; expiresAt: string };
export type TeamDetails = {
  id: string;
  name: string;
  cityId: string;
  cityNameEn: string;
  cityNameEl: string;
  description: string | null;
  viewerRole: string | null;
  members: TeamMember[];
  invites: TeamPendingInvite[];
};

function isRecord(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toTeamDetails(value: Json): TeamDetails | null {
  if (!isRecord(value)) return null;
  const members = value.members;
  const invites = value.invites;
  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.city_id !== 'string' ||
    typeof value.city_name_en !== 'string' ||
    typeof value.city_name_el !== 'string' ||
    !Array.isArray(members) ||
    !Array.isArray(invites)
  )
    return null;
  const parsedMembers: TeamMember[] = [];
  for (const member of members) {
    if (
      !isRecord(member) ||
      typeof member.id !== 'string' ||
      (typeof member.user_id !== 'string' && member.user_id !== null) ||
      typeof member.display_name !== 'string' ||
      typeof member.role !== 'string' ||
      typeof member.joined_at !== 'string'
    )
      return null;
    parsedMembers.push({
      id: member.id,
      userId: member.user_id,
      displayName: member.display_name,
      role: member.role,
      joinedAt: member.joined_at,
    });
  }
  const parsedInvites: TeamPendingInvite[] = [];
  for (const invite of invites) {
    if (
      !isRecord(invite) ||
      typeof invite.id !== 'string' ||
      typeof invite.display_name !== 'string' ||
      typeof invite.expires_at !== 'string'
    )
      return null;
    parsedInvites.push({
      id: invite.id,
      displayName: invite.display_name,
      expiresAt: invite.expires_at,
    });
  }
  return {
    id: value.id,
    name: value.name,
    cityId: value.city_id,
    cityNameEn: value.city_name_en,
    cityNameEl: value.city_name_el,
    description: typeof value.description === 'string' ? value.description : null,
    viewerRole: typeof value.viewer_role === 'string' ? value.viewer_role : null,
    members: parsedMembers,
    invites: parsedInvites,
  };
}

export async function listTeamDirectory(): Promise<TeamDirectoryItem[]> {
  const { data, error } = await getSupabaseClient().rpc('list_team_directory');
  if (error) throw error;
  return data.map((row) => ({
    teamId: row.team_id,
    name: row.name,
    cityId: row.city_id,
    cityNameEn: row.city_name_en,
    cityNameEl: row.city_name_el,
    description: row.description,
    memberCount: row.member_count,
    createdAt: row.created_at,
  }));
}

export async function listMyTeams(): Promise<MyTeam[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_teams');
  if (error) throw error;
  return data.map((row) => ({
    teamId: row.team_id,
    name: row.name,
    cityId: row.city_id,
    cityNameEn: row.city_name_en,
    cityNameEl: row.city_name_el,
    description: row.description,
    memberCount: row.member_count,
    role: row.role,
  }));
}

export async function listMyTeamInvites(): Promise<TeamInvite[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_team_invites');
  if (error) throw error;
  return data.map((row) => ({
    inviteId: row.invite_id,
    teamId: row.team_id,
    teamName: row.team_name,
    cityNameEn: row.city_name_en,
    cityNameEl: row.city_name_el,
    invitedByName: row.invited_by_name,
    expiresAt: row.expires_at,
  }));
}

export async function loadTeamDetails(teamId: string): Promise<TeamDetails | null> {
  const { data, error } = await getSupabaseClient().rpc('get_team_details', { p_team_id: teamId });
  if (error) throw error;
  return toTeamDetails(data);
}

export async function createTeam(values: {
  name: string;
  cityId: string;
  description: string;
}): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('create_team', {
    p_name: values.name,
    p_city_id: values.cityId,
    p_description: values.description || undefined,
  });
  if (error) throw error;
  return data;
}

export async function saveTeam(
  teamId: string,
  values: {
    name: string;
    cityId: string;
    description: string;
  },
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('update_team', {
    p_team_id: teamId,
    p_name: values.name,
    p_city_id: values.cityId,
    p_description: values.description || undefined,
  });
  if (error) throw error;
}

export async function searchTeamCandidates(
  teamId: string,
  query: string,
): Promise<TeamCandidate[]> {
  const { data, error } = await getSupabaseClient().rpc('search_team_invite_candidates', {
    p_team_id: teamId,
    p_query: query,
  });
  if (error) throw error;
  return data.map((row) => ({ userId: row.user_id, displayName: row.display_name }));
}

export async function inviteTeamMember(teamId: string, userId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('invite_team_member', {
    p_team_id: teamId,
    p_invited_user_id: userId,
  });
  if (error) throw error;
}

export async function respondTeamInvite(
  inviteId: string,
  decision: 'accept' | 'decline',
): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('respond_team_invite', {
    p_invite_id: inviteId,
    p_decision: decision,
  });
  if (error) throw error;
  return data;
}

export async function removeTeamMember(teamId: string, memberId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('remove_team_member', {
    p_team_id: teamId,
    p_member_id: memberId,
  });
  if (error) throw error;
}

export async function leaveTeam(teamId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('leave_team', { p_team_id: teamId });
  if (error) throw error;
}

export async function transferTeamCaptain(teamId: string, userId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('transfer_team_captain', {
    p_team_id: teamId,
    p_new_captain_user_id: userId,
  });
  if (error) throw error;
}

export async function revokeTeamInvite(teamId: string, inviteId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('revoke_team_invite', {
    p_team_id: teamId,
    p_invite_id: inviteId,
  });
  if (error) throw error;
}
