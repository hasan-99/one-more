import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuthButton, AuthFeedback, AuthField, AuthPage } from '@/components/auth/AuthPage';
import { useToast } from '@/components/toast/ToastProvider';
import { useAuth } from '@/auth/AuthProvider';
import { resendSignupOtp, verifySignupOtp } from '@/features/auth/auth-service';
import { authErrorMessageKey } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

const resendCooldownMs = 60_000;

export default function VerifyEmailScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const { isConfigured, refreshSession } = useAuth();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{
    email?: string | string[];
    resendAfter?: string | string[];
  }>();
  const email = Array.isArray(params.email) ? (params.email[0] ?? '') : (params.email ?? '');
  const resendAfterParam = Array.isArray(params.resendAfter)
    ? (params.resendAfter[0] ?? '')
    : (params.resendAfter ?? '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(() => {
    const timestamp = Number(resendAfterParam);
    return Number.isFinite(timestamp) ? Math.min(timestamp, Date.now() + resendCooldownMs) : 0;
  });
  const [resendSecondsRemaining, setResendSecondsRemaining] = useState(() =>
    Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    const updateRemaining = () =>
      setResendSecondsRemaining(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
    updateRemaining();
    if (resendAvailableAt <= Date.now()) return;
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [resendAvailableAt]);

  const submit = async () => {
    setBusy(true);
    try {
      const { data, error } = await verifySignupOtp(email, token);
      if (error) throw error;
      showToast(copy.authVerified, 'success');
      if (data.session) {
        await refreshSession();
        router.replace('/onboarding' as Href);
      } else {
        router.replace('/sign-in' as Href);
      }
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setBusy(true);
    try {
      const { error } = await resendSignupOtp(email);
      if (error) throw error;
      setResendAvailableAt(Date.now() + resendCooldownMs);
      showToast(copy.authEmailSent, 'success');
    } catch (error) {
      const messageKey = authErrorMessageKey(error);
      if (messageKey === 'authResendWait') setResendAvailableAt(Date.now() + resendCooldownMs);
      showToast(copy[messageKey], 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthPage title={copy.authVerifyTitle} description={copy.authVerifyDescription}>
      <View style={{ gap: 16 }}>
        <AuthField
          label={copy.authEmail}
          value={email}
          onChangeText={() => undefined}
          editable={false}
          keyboardType="email-address"
          autoComplete="email"
        />
        <AuthField
          label={copy.authOtp}
          value={token}
          onChangeText={setToken}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={6}
        />
        {!isConfigured ? <AuthFeedback kind="info">{copy.authUnavailable}</AuthFeedback> : null}
        <AuthButton
          label={busy ? copy.authSessionLoading : copy.authVerify}
          disabled={busy || !isConfigured || token.trim().length !== 6}
          onPress={() => void submit()}
        />
        <AuthButton
          label={
            resendSecondsRemaining > 0
              ? copy.authResendCountdown.replace('{seconds}', String(resendSecondsRemaining))
              : copy.authResend
          }
          disabled={busy || !isConfigured || resendSecondsRemaining > 0}
          onPress={() => void resend()}
        />
      </View>
    </AuthPage>
  );
}
