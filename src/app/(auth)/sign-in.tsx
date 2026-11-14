import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  AuthButton,
  AuthFeedback,
  AuthField,
  AuthForm,
  AuthPage,
  AuthTextLink,
} from '@/components/auth/AuthPage';
import { useToast } from '@/components/toast/ToastProvider';
import { useAuth } from '@/auth/AuthProvider';
import { signInWithPassword } from '@/features/auth/auth-service';
import { authErrorMessageKey, safeReturnTo, validateEmail } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function SignInScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const { isConfigured } = useAuth();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!validateEmail(email)) {
      showToast(copy.authEmailRequired, 'error');
      return;
    }
    setBusy(true);
    try {
      const { error } = await signInWithPassword(email, password);
      if (error) throw error;
      showToast(copy.authSignInSuccess, 'success');
      router.replace(safeReturnTo(params.returnTo) as never);
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthPage
      title={copy.authSignInTitle}
      description={copy.authSignInDescription}
      pitchBackdrop
      scrollable={false}
    >
      <AuthForm>
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
        <AuthButton
          label={busy ? copy.authSessionLoading : copy.authSignIn}
          disabled={busy || !isConfigured}
          onPress={() => void submit()}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            columnGap: 16,
            rowGap: 6,
          }}
        >
          <AuthTextLink href="/forgot-password">{copy.authForgotPassword}</AuthTextLink>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6 }}>
            <Text style={{ color: '#b9c4b4' }}>{copy.authNoAccount}</Text>
            <AuthTextLink href="/sign-up">{copy.authSignUpLink}</AuthTextLink>
          </View>
        </View>
      </AuthForm>
    </AuthPage>
  );
}
