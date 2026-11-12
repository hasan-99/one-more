import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function MatchDetailsScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appMatchDetailsTitle}>
      <EmptyState title={copy.appMatchDetailsTitle} description={copy.appMatchUnavailable} />
      <AppAction labelKey="appGoExplore" href="/explore" secondary />
    </AppPage>
  );
}
