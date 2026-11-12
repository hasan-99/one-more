import type { Tables } from '@/lib/database.types';
import { getSupabaseClient } from '@/lib/supabase';

export type OwnJoinRequest = Pick<
  Tables<'match_participants'>,
  'id' | 'status' | 'requested_position_slot_id'
>;
export type MatchJoinRequest = {
  participant_id: string;
  display_name: string;
  status: string;
  requested_at: string;
  position_label: string | null;
};
export type WaitlistState = {
  entry_id: string;
  status: 'waiting' | 'offered' | 'accepted' | 'declined' | 'expired' | 'left' | 'removed';
  queue_position: number | null;
  offer_id: string | null;
  expires_at: string | null;
  position_code: string | null;
};

export async function loadOwnWaitlistState(matchId: string): Promise<WaitlistState | null> {
  const { data, error } = await getSupabaseClient().rpc('get_match_waitlist_state', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data as WaitlistState | null;
}

export async function joinMatchWaitlist(
  matchId: string,
  positionCode: string | null,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('join_match_waitlist', {
    p_match_id: matchId,
    p_position_code: positionCode || undefined,
  });
  if (error) throw error;
}

export async function leaveMatchWaitlist(matchId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('leave_match_waitlist', { p_match_id: matchId });
  if (error) throw error;
}

export async function leaveActiveMatch(matchId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('leave_match', { p_match_id: matchId });
  if (error) throw error;
}

export async function answerWaitlistOffer(offerId: string, accept: boolean): Promise<void> {
  const client = getSupabaseClient();
  const { error } = accept
    ? await client.rpc('accept_waitlist_offer', { p_offer_id: offerId })
    : await client.rpc('decline_waitlist_offer', { p_offer_id: offerId });
  if (error) throw error;
}

export async function loadOwnJoinRequest(
  matchId: string,
  userId: string,
): Promise<OwnJoinRequest | null> {
  const { data, error } = await getSupabaseClient()
    .from('match_participants')
    .select('id,status,requested_position_slot_id')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadMatchJoinRequests(matchId: string): Promise<MatchJoinRequest[]> {
  const { data, error } = await getSupabaseClient().rpc('get_match_join_requests', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function requestMatchJoin(
  matchId: string,
  positionSlotId: string | null,
): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('request_match_join', {
    p_match_id: matchId,
    p_position_slot_id: positionSlotId ?? undefined,
  });
  if (error) throw error;
  return data;
}

export async function withdrawMatchJoinRequest(
  matchId: string,
  participantId: string,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('withdraw_match_join_request', {
    p_match_id: matchId,
    p_participant_id: participantId,
  });
  if (error) throw error;
}

export async function reviewMatchJoinRequest(
  matchId: string,
  participantId: string,
  decision: 'approve' | 'reject',
): Promise<'active' | 'rejected'> {
  const { data, error } = await getSupabaseClient().rpc('review_match_join_request', {
    p_match_id: matchId,
    p_participant_id: participantId,
    p_decision: decision,
  });
  if (error) throw error;
  if (data !== 'active' && data !== 'rejected') throw new Error('unexpected_join_request_status');
  return data;
}
