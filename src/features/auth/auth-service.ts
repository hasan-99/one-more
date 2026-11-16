import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearRequestCache } from '@/lib/request-cache';
import { getSupabaseClient } from '@/lib/supabase';

export function signUpWithPassword(
  email: string,
  password: string,
  profile: { displayName: string; phone: string },
) {
  return getSupabaseClient().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: profile.displayName.trim(),
        phone: profile.phone.trim(),
      },
    },
  });
}

export function verifySignupOtp(email: string, token: string) {
  return getSupabaseClient().auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'signup',
  });
}

export function resendSignupOtp(email: string) {
  return getSupabaseClient().auth.resend({ type: 'signup', email: email.trim() });
}

export function signInWithPassword(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email: email.trim(), password });
}

export function requestPasswordReset(email: string) {
  return getSupabaseClient().auth.resetPasswordForEmail(email.trim());
}

export function verifyPasswordRecoveryOtp(email: string, token: string) {
  return getSupabaseClient().auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'recovery',
  });
}

export function setNewPassword(password: string) {
  return getSupabaseClient().auth.updateUser({ password });
}

/** Forgets everything this device cached about the signed-in user (memory cache + profile flag). */
export async function clearLocalUserData(): Promise<void> {
  clearRequestCache();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((key) => key.startsWith('one-more.profile-complete.'));
    if (mine.length > 0) await AsyncStorage.multiRemove(mine);
  } catch {
    // Storage may be unavailable; the session itself is still ended by the caller.
  }
}

export async function signOut() {
  const result = await getSupabaseClient().auth.signOut();
  await clearLocalUserData();
  return result;
}
