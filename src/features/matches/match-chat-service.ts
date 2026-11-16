import { getSupabaseClient } from '@/lib/supabase';

export type MatchChatMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  status: 'visible' | 'removed';
  created_at: string;
};

export type MatchChatPage = { messages: MatchChatMessage[]; hasMore: boolean };
export type MatchChatRole = 'organizer' | 'player';
export type MatchChatReportCount = { message_id: string; report_count: number; reasons: string[] };

const pageSize = 50;

export async function getMatchChatRole(matchId: string): Promise<MatchChatRole | null> {
  const { data, error } = await getSupabaseClient().rpc('get_match_chat_role', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data === 'organizer' || data === 'player' ? data : null;
}

export async function loadMatchChatMessages(
  matchId: string,
  before?: Pick<MatchChatMessage, 'created_at' | 'id'>,
): Promise<MatchChatPage> {
  const { data, error } = await getSupabaseClient().rpc('get_match_chat_messages', {
    p_match_id: matchId,
    p_before_created_at: before?.created_at,
    p_before_id: before?.id,
    p_limit: pageSize,
  });
  if (error) throw error;
  const messages = [...(data ?? [])].reverse().map((message) => ({
    ...message,
    status: message.status === 'removed' ? ('removed' as const) : ('visible' as const),
  }));
  return { messages, hasMore: messages.length === pageSize };
}

export async function sendMatchMessage(matchId: string, body: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('send_match_message', {
    p_match_id: matchId,
    p_body: body,
  });
  if (error) throw error;
}

export async function reportMatchMessage(
  messageId: string,
  reason: 'spam' | 'harassment' | 'inappropriate',
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('report_match_message', {
    p_message_id: messageId,
    p_reason: reason,
    p_details: undefined,
  });
  if (error) throw error;
}

export async function moderateMatchMessage(messageId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('moderate_match_message', {
    p_message_id: messageId,
  });
  if (error) throw error;
}

export async function loadMatchChatReportCounts(matchId: string): Promise<MatchChatReportCount[]> {
  const { data, error } = await getSupabaseClient().rpc('get_match_chat_report_counts', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data ?? [];
}

export function subscribeToMatchMessages(
  matchId: string,
  onChange: () => void,
  onError: () => void,
): () => void {
  const client = getSupabaseClient();
  const channel = client
    .channel(`match-chat:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_messages',
        filter: `match_id=eq.${matchId}`,
      },
      onChange,
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onError();
    });
  return () => {
    void client.removeChannel(channel);
  };
}

export async function leaveMatchChat(matchId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('leave_match', { p_match_id: matchId });
  if (error) throw error;
}

export type BlockedUser = { userId: string; displayName: string; blockedAt: string };

export async function blockUser(userId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('block_user', { p_user_id: userId });
  if (error) throw error;
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('unblock_user', { p_user_id: userId });
  if (error) throw error;
}

export async function listBlockedUsers(): Promise<BlockedUser[]> {
  const { data, error } = await getSupabaseClient().rpc('get_my_blocked_users');
  if (error) throw error;
  return data.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    blockedAt: row.blocked_at,
  }));
}
