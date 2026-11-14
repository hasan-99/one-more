import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { authSessionStorage } from '@/lib/native-auth-session-storage';
import type { Database } from '@/lib/database.types';
import { updateAuthRefreshForAppState } from '@/auth/session-lifecycle';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase: SupabaseClient<Database> | null =
  isSupabaseConfigured && supabaseUrl && publishableKey
    ? createClient<Database>(supabaseUrl, publishableKey, {
        auth: {
          ...(Platform.OS === 'web' ? {} : { storage: authSessionStorage }),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

if (supabase && Platform.OS !== 'web') {
  if (AppState.currentState === 'active') {
    updateAuthRefreshForAppState(supabase.auth, AppState.currentState);
  }
  AppState.addEventListener('change', (state) => {
    updateAuthRefreshForAppState(supabase.auth, state);
  });
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
}
