import type { Tables } from '@/lib/database.types';
import { getSupabaseClient } from '@/lib/supabase';

export type InboxNotification = Tables<'inbox_notifications'>;

export async function listInboxNotifications(): Promise<InboxNotification[]> {
  const { data, error } = await getSupabaseClient()
    .from('inbox_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function markInboxNotificationRead(notificationId: string): Promise<void> {
  const { data, error } = await getSupabaseClient().rpc('mark_inbox_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) throw error;
  if (!data) throw new Error('notification_not_found');
}

export async function markAllInboxNotificationsRead(): Promise<void> {
  const { error } = await getSupabaseClient().rpc('mark_all_inbox_notifications_read');
  if (error) throw error;
}
