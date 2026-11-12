import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function TeamsScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appTeamsTitle} description={copy.appTeamsIntro}>
      <EmptyState title={copy.appNoTeamsTitle} description={copy.appNoTeamsCopy} />
      <AppAction labelKey="appGoHome" href="/home" secondary />
    </AppPage>
  );
}
