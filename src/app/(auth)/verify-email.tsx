import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AuthButton, AuthFeedback, AuthField, AuthPage } from '@/components/auth/AuthPage';
import { useAuth } from '@/auth/AuthProvider';
import { resendSignupOtp, verifySignupOtp } from '@/features/auth/auth-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function VerifyEmailScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const { isConfigured } = useAuth();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = Array.isArray(params.email) ? (params.email[0] ?? '') : (params.email ?? '');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await verifySignupOtp(email, token);
      if (error) throw error;
      router.replace('/sign-in' as Href);
    } catch {
      setMessage(copy.authInvalidCode);
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await resendSignupOtp(email);
      if (error) throw error;
      setMessage(copy.authEmailSent);
    } catch {
      setMessage(copy.authResendWait);
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
        {message ? (
          <AuthFeedback kind={message === copy.authEmailSent ? 'success' : 'error'}>
            {message}
          </AuthFeedback>
        ) : null}
        <AuthButton
          label={busy ? copy.authSessionLoading : copy.authVerify}
          disabled={busy || !isConfigured || token.trim().length !== 6}
          onPress={() => void submit()}
        />
        <AuthButton
          label={copy.authResend}
          disabled={busy || !isConfigured}
          onPress={() => void resend()}
        />
      </View>
    </AuthPage>
  );
}
