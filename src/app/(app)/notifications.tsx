import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function NotificationsScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appNotificationsTitle} description={copy.appNotificationsIntro}>
      <EmptyState title={copy.appNoNotificationsTitle} description={copy.appNoNotificationsCopy} />
      <AppAction labelKey="appOpenSettings" href="/settings" secondary />
    </AppPage>
  );
}
