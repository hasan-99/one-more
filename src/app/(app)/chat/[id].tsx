import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function MatchChatScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appChatTitle}>
      <EmptyState title={copy.appChatTitle} description={copy.appChatUnavailable} />
      <AppAction labelKey="appGoExplore" href="/explore" secondary />
    </AppPage>
  );
}
