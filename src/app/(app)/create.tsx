import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function CreateScreen() {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appCreateTitle} description={copy.appCreateIntro}>
      <EmptyState title={copy.appCreateTitle} description={copy.appFeatureUnavailable} />
      <AppAction labelKey="appExploreAction" href="/explore" secondary />
    </AppPage>
  );
}
