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

export function signOut() {
  return getSupabaseClient().auth.signOut();
}
