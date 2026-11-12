import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  AuthButton,
  AuthFeedback,
  AuthField,
  AuthPage,
  AuthTextLink,
} from '@/components/auth/AuthPage';
import { useAuth } from '@/auth/AuthProvider';
import { signInWithPassword } from '@/features/auth/auth-service';
import { safeReturnTo, validateEmail } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function SignInScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const { isConfigured } = useAuth();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async () => {
    if (!validateEmail(email)) return setMessage(copy.authEmailRequired);
    setBusy(true);
    setMessage('');
    try {
      const { error } = await signInWithPassword(email, password);
      if (error) throw error;
      router.replace(safeReturnTo(params.returnTo) as never);
    } catch {
      setMessage(copy.authInvalidCredentials);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthPage title={copy.authSignInTitle} description={copy.authSignInDescription}>
      <View style={{ gap: 16 }}>
        <AuthField
          label={copy.authEmail}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
        />
        <AuthField
          label={copy.authPassword}
          value={password}
          onChangeText={setPassword}
          autoComplete="current-password"
          secureTextEntry
        />
        {!isConfigured ? <AuthFeedback kind="info">{copy.authUnavailable}</AuthFeedback> : null}
        {message ? <AuthFeedback>{message}</AuthFeedback> : null}
        <AuthButton
          label={busy ? copy.authSessionLoading : copy.authSignIn}
          disabled={busy || !isConfigured}
          onPress={() => void submit()}
        />
        <AuthTextLink href="/forgot-password">{copy.authForgotPassword}</AuthTextLink>
        <Text style={{ color: colors.textSecondary }}>{copy.authNoAccount}</Text>
        <AuthTextLink href="/sign-up">{copy.authSignUpLink}</AuthTextLink>
      </View>
    </AuthPage>
  );
}
