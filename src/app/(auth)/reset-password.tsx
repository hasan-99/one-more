import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import {
  AuthButton,
  AuthFeedback,
  AuthField,
  AuthPage,
  AuthTextLink,
} from '@/components/auth/AuthPage';
import { useToast } from '@/components/toast/ToastProvider';
import { setNewPassword, signOut } from '@/features/auth/auth-service';
import { authErrorMessageKey, validatePassword } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function ResetPasswordScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const auth = useAuth();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!validatePassword(password)) {
      showToast(copy.authPasswordShort, 'error');
      return;
    }
    if (password !== confirmation) {
      showToast(copy.authPasswordMismatch, 'error');
      return;
    }
    setBusy(true);
    try {
      const { error } = await setNewPassword(password);
      if (error) throw error;
      const result = await signOut();
      if (result.error) throw result.error;
      showToast(copy.authPasswordUpdated, 'success');
      auth.clearPasswordRecovery();
      router.replace('/sign-in' as Href);
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setBusy(false);
    }
  };
  if (auth.isLoading) {
    return (
      <AuthPage title={copy.authSessionLoading} description={copy.authResetDescription}>
        <View accessibilityRole="progressbar" accessibilityLabel={copy.authSessionLoading} />
      </AuthPage>
    );
  }
  if (!auth.session || !auth.isPasswordRecovery) {
    return (
      <AuthPage title={copy.authProtectedTitle} description={copy.authProtectedDescription}>
        <AuthFeedback kind="info">{copy.authProtectedDescription}</AuthFeedback>
        <AuthTextLink href="/sign-in">{copy.authSignInLink}</AuthTextLink>
      </AuthPage>
    );
  }
  return (
    <AuthPage title={copy.authResetTitle} description={copy.authResetDescription}>
      <View style={{ gap: 16 }}>
        <AuthField
          label={copy.authPassword}
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          secureTextEntry
        />
        <AuthField
          label={copy.authConfirmPassword}
          value={confirmation}
          onChangeText={setConfirmation}
          autoComplete="new-password"
          secureTextEntry
        />
        <AuthButton
          label={busy ? copy.authSessionLoading : copy.authSavePassword}
          disabled={busy}
          onPress={() => void submit()}
        />
      </View>
    </AuthPage>
  );
}
