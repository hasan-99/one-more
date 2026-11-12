import { StyleSheet, Text, View } from 'react-native';

import { AppAction, AppCard, AppPage, EmptyState } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function AppHomeScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const styles = StyleSheet.create({
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    action: { flexGrow: 1, flexBasis: 220 },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    city: {
      color: colors.accentText,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
    section: { gap: 12, marginTop: 8 },
  });

  return (
    <AppPage title={copy.appHomeWelcome} description={copy.appHomeIntro}>
      <AppCard>
        <Text style={styles.city}>{copy.appCityLabel}</Text>
        <Text style={styles.cardTitle}>{copy.appGuestPreview}</Text>
      </AppCard>
      <View style={styles.row}>
        <View style={styles.action}>
          <AppAction labelKey="appExploreAction" href="/explore" />
        </View>
        <View style={styles.action}>
          <AppAction labelKey="appCreateAction" href="/create" secondary />
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.appUpcomingGames}</Text>
        <EmptyState title={copy.appNoGamesTitle} description={copy.appNoGamesCopy} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{copy.appChallenges}</Text>
        <EmptyState title={copy.appNoChallengesTitle} description={copy.appNoChallengesCopy} />
        <AppAction labelKey="appChallenges" href="/challenges" secondary />
      </View>
    </AppPage>
  );
}
