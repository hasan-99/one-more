import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AuthButton } from '@/components/auth/AuthPage';
import { useToast } from '@/components/toast/ToastProvider';
import { AppAction, AppCard, AppPage } from '@/components/layout/AppPage';
import { signOut } from '@/features/auth/auth-service';
import { authErrorMessageKey } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function ProfileScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const { user } = useAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const handleSignOut = async () => {
    setBusy(true);
    try {
      const { error: signOutError } = await signOut();
      if (signOutError) throw signOutError;
      showToast(copy.authSignOutSuccess, 'success');
      router.replace('/' as Href);
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
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
