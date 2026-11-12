import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function ExploreScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appExploreTitle} description={copy.appExploreIntro}>
      <EmptyState title={copy.appEmptyMatchesTitle} description={copy.appEmptyMatchesCopy} />
      <AppAction labelKey="appGoHome" href="/home" secondary />
    </AppPage>
  );
}
