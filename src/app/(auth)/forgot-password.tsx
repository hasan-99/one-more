import { useState } from 'react';
import { View } from 'react-native';

import {
  AuthButton,
  AuthFeedback,
  AuthField,
  AuthPage,
  AuthTextLink,
} from '@/components/auth/AuthPage';
import { useToast } from '@/components/toast/ToastProvider';
import { useAuth } from '@/auth/AuthProvider';
import { requestPasswordReset } from '@/features/auth/auth-service';
import { authErrorMessageKey, validateEmail } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function ForgotPasswordScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const { isConfigured } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!validateEmail(email)) {
      showToast(copy.authEmailRequired, 'error');
      return;
    }
    setBusy(true);
    try {
      const { error } = await requestPasswordReset(email);
      if (error) throw error;
      showToast(copy.authEmailSent, 'success');
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthPage title={copy.authForgotTitle} description={copy.authForgotDescription}>
      <View style={{ gap: 16 }}>
        <AuthField
          label={copy.authEmail}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
        />
        {!isConfigured ? <AuthFeedback kind="info">{copy.authUnavailable}</AuthFeedback> : null}
        <AuthButton
          label={busy ? copy.authSessionLoading : copy.authSendReset}
          disabled={busy || !isConfigured}
          onPress={() => void submit()}
        />
        <AuthTextLink href="/sign-in">{copy.authSignInLink}</AuthTextLink>
      </View>
    </AuthPage>
  );
}
