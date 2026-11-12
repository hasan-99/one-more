import { Text } from 'react-native';

import { AppAction, AppCard, AppPage } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function ProfileScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appProfileTitle} description={copy.appProfileIntro}>
      <AppCard>
        <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>
          {copy.appGuestProfile}
        </Text>
      </AppCard>
      <AppAction labelKey="appSettingsAction" href="/settings" />
      <AppAction labelKey="appNotificationsTitle" href="/notifications" secondary />
    </AppPage>
  );
}
