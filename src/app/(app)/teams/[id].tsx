import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function TeamDetailsScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appTeamDetailsTitle}>
      <EmptyState title={copy.appTeamDetailsTitle} description={copy.appTeamUnavailable} />
      <AppAction labelKey="appGoTeams" href="/teams" secondary />
    </AppPage>
  );
}
