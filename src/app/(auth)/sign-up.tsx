import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AuthButton,
  AuthCheckbox,
  AuthFeedback,
  AuthField,
  AuthPage,
  AuthTextLink,
} from '@/components/auth/AuthPage';
import { useToast } from '@/components/toast/ToastProvider';
import { useAuth } from '@/auth/AuthProvider';
import { signUpWithPassword } from '@/features/auth/auth-service';
import { authErrorMessageKey, validateSignup } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function SignUpScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const { isConfigured } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const validation = validateSignup(email, password, confirmation, accepted);
    if (validation) {
      const messages = {
        email: copy.authEmailRequired,
        password: copy.authPasswordShort,
        passwordMismatch: copy.authPasswordMismatch,
        terms: copy.authTermsRequired,
      };
      showToast(messages[validation], 'error');
      return;
    }
    setBusy(true);
    try {
      const { error } = await signUpWithPassword(email, password);
      if (error) throw error;
      showToast(copy.authSignupPending, 'success');
      router.replace(`/verify-email?email=${encodeURIComponent(email.trim())}` as Href);
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthPage title={copy.authSignUpTitle} description={copy.authSignUpDescription}>
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
        <AuthCheckbox label={copy.authAcceptTerms} checked={accepted} onChange={setAccepted} />
        {!isConfigured ? <AuthFeedback kind="info">{copy.authUnavailable}</AuthFeedback> : null}
        <AuthButton
          label={busy ? copy.authSessionLoading : copy.authSignUp}
          disabled={busy || !isConfigured}
          onPress={() => void submit()}
        />
        <AuthTextLink href="/sign-in">{copy.authSignInLink}</AuthTextLink>
      </View>
    </AuthPage>
  );
}
