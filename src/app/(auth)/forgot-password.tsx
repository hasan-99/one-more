import { router, type Href } from 'expo-router';
import { useState } from 'react';

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
import {
  requestPasswordReset,
  setNewPassword,
  signOut,
  verifyPasswordRecoveryOtp,
} from '@/features/auth/auth-service';
import {
  authErrorMessageKey,
  emailOtpLength,
  validateEmail,
  validatePassword,
} from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function ForgotPasswordScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const { isConfigured, clearPasswordRecovery } = useAuth();
  const { showToast } = useToast();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    if (!validateEmail(email)) return showToast(copy.authEmailRequired, 'error');
    setBusy(true);
    try {
      const { error } = await requestPasswordReset(email);
      if (error) throw error;
      setStep('code');
      showToast(copy.authRecoveryCodeSent, 'success');
    } catch {
      // Keep the result independent of account existence and Auth error details.
      showToast(copy.authRecoverySendFailed, 'error');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setBusy(true);
    try {
      const { error } = await verifyPasswordRecoveryOtp(email, token);
      if (error) throw error;
      setStep('password');
      showToast(copy.authRecoveryCodeAccepted, 'success');
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (!validatePassword(password)) return showToast(copy.authPasswordShort, 'error');
    if (password !== confirmation) return showToast(copy.authPasswordMismatch, 'error');
    setBusy(true);
    try {
      const { error } = await setNewPassword(password);
      if (error) throw error;
      const result = await signOut();
      if (result.error) throw result.error;
      clearPasswordRecovery();
      showToast(copy.authPasswordUpdated, 'success');
      router.replace('/sign-in' as Href);
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setBusy(false);
    }
  };

  const title =
    step === 'code'
      ? copy.authRecoveryCodeTitle
      : step === 'password'
        ? copy.authResetTitle
        : copy.authForgotTitle;
  const description =
    step === 'code'
      ? copy.authRecoveryCodeDescription
      : step === 'password'
        ? copy.authResetDescription
        : copy.authForgotDescription;
  const submit = step === 'email' ? sendCode : step === 'code' ? verifyCode : savePassword;

  return (
    <AuthPage title={title} description={description} pitchBackdrop scrollable={false}>
      <AuthForm>
        {step === 'email' ? (
          <AuthField
            label={copy.authEmail}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
          />
        ) : null}
        {step === 'code' ? (
          <>
            <AuthField
              label={copy.authEmail}
              value={email}
              onChangeText={() => undefined}
              editable={false}
              keyboardType="email-address"
              autoComplete="email"
            />
            <AuthField
              label={copy.authRecoveryCodeLabel}
              value={token}
              onChangeText={setToken}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={emailOtpLength}
            />
          </>
        ) : null}
        {step === 'password' ? (
          <>
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
          </>
        ) : null}
        {!isConfigured ? <AuthFeedback kind="info">{copy.authUnavailable}</AuthFeedback> : null}
        <AuthButton
          label={
            busy
              ? copy.authSessionLoading
              : step === 'email'
                ? copy.authSendReset
                : step === 'code'
                  ? copy.authVerifyRecoveryCode
                  : copy.authSavePassword
          }
          disabled={
            busy || !isConfigured || (step === 'code' && token.trim().length !== emailOtpLength)
          }
          onPress={() => void submit()}
        />
        {step === 'password' ? null : (
          <AuthTextLink href="/sign-in">{copy.authSignInLink}</AuthTextLink>
        )}
      </AuthForm>
    </AuthPage>
  );
}
