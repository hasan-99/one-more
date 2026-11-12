import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AuthButton, AuthFeedback } from '@/components/auth/AuthPage';
import { AppAction, AppCard, AppPage } from '@/components/layout/AppPage';
import { signOut } from '@/features/auth/auth-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function ProfileScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const handleSignOut = async () => {
    setBusy(true);
    setError(false);
    try {
      const { error: signOutError } = await signOut();
      if (signOutError) throw signOutError;
      router.replace('/' as Href);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AppPage title={copy.appProfileTitle} description={copy.appProfileIntro}>
      <AppCard>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
          {user?.email ?? copy.appGuestProfile}
        </Text>
      </AppCard>
      {error ? <AuthFeedback>{copy.authGenericError}</AuthFeedback> : null}
      <AuthButton
        label={busy ? copy.authSessionLoading : copy.authSignOut}
        disabled={busy}
        onPress={() => void handleSignOut()}
      />
      <AppAction labelKey="appSettingsAction" href="/settings" />
      <AppAction labelKey="appNotificationsTitle" href="/notifications" secondary />
    </AppPage>
  );
}
