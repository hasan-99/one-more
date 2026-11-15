import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { authSessionStorage } from '@/lib/native-auth-session-storage';
import type { Database } from '@/lib/database.types';
import { updateAuthRefreshForAppState } from '@/auth/session-lifecycle';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

// Only talk to Supabase over HTTPS. Plain http is allowed for a local dev stack on this machine.
function isSecureSupabaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && publishableKey && isSecureSupabaseUrl(supabaseUrl),
);

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
