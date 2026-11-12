import type { Tables } from '@/lib/database.types';
import { getSupabaseClient } from '@/lib/supabase';

import type { ProfileInput } from './profile-validation';

export type ProfileRow = Tables<'profiles'>;
export type CityRow = Tables<'cities'>;
export type AreaRow = Tables<'areas'>;
export type UserPreferencesRow = Tables<'user_preferences'>;
export type NotificationPreferencesRow = Tables<'notification_preferences'>;
export type AccountDeletionRequestRow = Tables<'account_deletion_requests'>;

export type ProfileBundle = {
  profile: ProfileRow;
  cities: CityRow[];
  areas: AreaRow[];
  preferences: UserPreferencesRow;
  notificationPreferences: NotificationPreferencesRow;
};

export async function getProfileBundle(userId: string): Promise<ProfileBundle> {
  const client = getSupabaseClient();
  const [profile, cities, areas, preferences, notificationPreferences] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).single(),
    client.from('cities').select('*').order('name_en'),
    client.from('areas').select('*').order('name_en'),
    client.from('user_preferences').select('*').eq('user_id', userId).single(),
    client.from('notification_preferences').select('*').eq('user_id', userId).single(),
  ]);
  for (const result of [profile, cities, areas, preferences, notificationPreferences]) {
    if (result.error) throw result.error;
  }
  if (!profile.data || !preferences.data || !notificationPreferences.data) {
    throw new Error('profile_data_missing');
  }
  return {
    profile: profile.data,
    cities: cities.data ?? [],
    areas: areas.data ?? [],
    preferences: preferences.data,
    notificationPreferences: notificationPreferences.data,
  };
}

export async function getProfileCompletion(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('onboarding_complete')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data.onboarding_complete;
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<void> {
  const client = getSupabaseClient();
  const { error: profileError } = await client
    .from('profiles')
    .update({
      display_name: input.displayName.trim(),
      city_id: input.cityId,
      area_id: input.areaId,
      preferred_position: input.preferredPosition,
      skill_level: input.skillLevel,
      language: input.language,
      onboarding_complete: true,
    })
    .eq('id', userId);
  if (profileError) throw profileError;

  const { error: preferencesError } = await client
    .from('user_preferences')
    .update({
      preferred_formats: input.preferredFormats,
      availability_slots: input.availabilitySlots,
      max_radius_km: input.maxRadiusKm,
    })
    .eq('user_id', userId);
  if (preferencesError) throw preferencesError;
}

export async function saveNotificationPreferences(
  userId: string,
  values: Pick<
    NotificationPreferencesRow,
    'in_app_enabled' | 'discovery_email_enabled' | 'chat_email_enabled'
  >,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('notification_preferences')
    .update(values)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferencesRow> {
  const { data, error } = await getSupabaseClient()
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getAccountDeletionRequest(
  userId: string,
): Promise<AccountDeletionRequestRow | null> {
  const { data, error } = await getSupabaseClient()
    .from('account_deletion_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'requested')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function requestAccountDeletion(): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('request_account_deletion');
  if (error) throw error;
  return data;
}

export async function cancelAccountDeletionRequest(requestId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc('cancel_account_deletion_request', {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data;
}
