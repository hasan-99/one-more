import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatLocalDateTime } from '@/i18n/format';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

import { MatchPitchMap } from './MatchPitchMap';
import type { MatchDiscoveryItem } from './match-service';

export function MatchCard({ match }: { match: MatchDiscoveryItem }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const city = locale === 'el' ? match.cityNameEl : match.cityNameEn;
  const area = locale === 'el' ? match.areaNameEl : match.areaNameEn;
  return (
    <Link href={`/matches/${match.id}` as Href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${match.title}, ${city}, ${formatLocalDateTime(match.startsAt, locale)}, ${match.freeSpots} ${copy.matchFreeSpots}`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.82 : 1,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <Text style={[styles.format, { color: colors.accentText }]}>
              {match.sideSize}v{match.sideSize}
            </Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{match.title}</Text>
          </View>
          <Text style={[styles.freeSpots, { color: colors.accentText }]}>
            {match.freeSpots} {copy.matchFreeSpots}
          </Text>
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {city} · {area} · {formatLocalDateTime(match.startsAt, locale)}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {match.venueName} · {match.venueAddress}
        </Text>
        <View style={styles.stats}>
          <Text style={[styles.stat, { color: colors.textSecondary }]}>
            {match.activePlayers}/{match.capacity} {copy.matchPlayers}
          </Text>
          <Text style={[styles.stat, { color: colors.textSecondary }]}>
            {match.priceEur === 0 ? copy.matchFree : `€${match.priceEur.toFixed(2)}`}
          </Text>
          <Text style={[styles.stat, { color: colors.textSecondary }]}>
            {match.durationMinutes} {copy.matchMinutes}
          </Text>
        </View>
        <MatchPitchMap match={match} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1, borderRadius: 20, padding: 18, gap: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  titleGroup: { flex: 1, gap: 4 },
  format: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9 },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  freeSpots: { flexShrink: 0, fontSize: 12, fontWeight: '800' },
  meta: { fontSize: 13, lineHeight: 19 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  stat: { fontSize: 12, fontWeight: '600' },
});
