import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function ChallengeDetailsScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appChallengeDetailsTitle}>
      <EmptyState
        title={copy.appChallengeDetailsTitle}
        description={copy.appChallengeUnavailable}
      />
      <AppAction labelKey="appGoTeams" href="/teams" secondary />
    </AppPage>
  );
}
