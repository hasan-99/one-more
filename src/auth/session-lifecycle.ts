import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppStateStatus } from 'react-native';

type AuthRefreshController = Pick<
  SupabaseClient['auth'],
  'startAutoRefresh' | 'stopAutoRefresh'
>;

export function updateAuthRefreshForAppState(
  auth: AuthRefreshController,
  state: AppStateStatus,
) {
  if (state === 'active') auth.startAutoRefresh();
  else auth.stopAutoRefresh();
}
