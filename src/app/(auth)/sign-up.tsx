import { router, type Href } from 'expo-router';
import { useState } from 'react';
import {
  AuthButton,
  AuthCheckbox,
  AuthFeedback,
  AuthField,
  AuthForm,
  AuthPage,
  AuthTextLink,
} from '@/components/auth/AuthPage';
import { useToast } from '@/components/toast/ToastProvider';
import { useAuth } from '@/auth/AuthProvider';
import { signUpWithPassword } from '@/features/auth/auth-service';
import { LegalLinks } from '@/components/legal/LegalLinks';
import { authErrorMessageKey, validateSignup } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function SignUpScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const { isConfigured } = useAuth();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const validation = validateSignup(displayName, phone, email, password, confirmation, accepted);
    if (validation) {
      const messages = {
        displayName: copy.authNameRequired,
        displayNameEnglish: copy.authNameEnglish,
        phoneRequired: copy.authPhoneRequired,
        phoneInvalid: copy.authPhoneInvalid,
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
      const { data, error } = await signUpWithPassword(email, password, { displayName, phone });
      if (error) throw error;
      if (data.user && data.user.identities?.length === 0) {
        showToast(copy.authAccountExists, 'error');
        return;
      }
      showToast(copy.authSignupPending, 'success');
      const resendAfter = Date.now() + 60_000;
      router.replace(
        `/verify-email?email=${encodeURIComponent(email.trim())}&resendAfter=${resendAfter}` as Href,
      );
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthPage
      title={copy.authSignUpTitle}
      description={copy.authSignUpDescription}
      pitchBackdrop
      scrollable={false}
    >
      <AuthForm>
        <AuthField
          label={copy.authName}
          value={displayName}
          onChangeText={setDisplayName}
          autoComplete="name"
        />
        <AuthField
          label={copy.authPhone}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />
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
        <LegalLinks compact />
      </AuthForm>
    </AuthPage>
  );
}
