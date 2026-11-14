import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { formatLocalDateTime, formatLocalNumber } from '@/i18n/format';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

import type { MatchDiscoveryItem } from './match-service';

export function MatchCard({ match }: { match: MatchDiscoveryItem }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const area = locale === 'el' ? match.areaNameEl : match.areaNameEn;
  const price =
    match.priceEur === 0 ? copy.matchFree : `€${formatLocalNumber(match.priceEur, locale)}`;
  const visiblePlayers = Math.min(match.capacity, 22);

  return (
    <Link href={`/matches/${match.id}` as Href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${area}, ${match.sideSize}v${match.sideSize}, ${formatLocalDateTime(match.startsAt, locale)}, ${match.activePlayers} ${copy.matchPlayers}, ${match.freeSpots} ${copy.matchFreeSpots}, ${price}`}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.84 : 1,
          },
        ]}
      >
        <View style={styles.topRow}>
          <FormatTile sideSize={match.sideSize} />
          <View style={styles.matchInfo}>
            <Text numberOfLines={1} style={[styles.area, { color: colors.textPrimary }]}>
              {area}
            </Text>
            <Text numberOfLines={1} style={[styles.time, { color: colors.textSecondary }]}>
              {formatLocalDateTime(match.startsAt, locale)}
            </Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={[styles.price, { color: colors.accentText }]}>{price}</Text>
            <Text style={[styles.perPlayer, { color: colors.textSecondary }]}>
              {copy.matchPerPlayer}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View
          accessibilityLabel={`${match.activePlayers} ${copy.matchPlayers}`}
          style={styles.playerDots}
        >
          {Array.from({ length: visiblePlayers }, (_, index) => (
            <View
              key={index}
              style={[
                styles.playerDot,
                {
                  backgroundColor:
                    index < match.activePlayers ? colors.accentText : colors.surfaceRaised,
                  borderColor: index < match.activePlayers ? colors.accentText : colors.border,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.availabilityRow}>
          <Text style={[styles.playerCount, { color: colors.textSecondary }]}>
            {match.activePlayers} {copy.matchOf} {match.capacity} {copy.matchPlayers}
          </Text>
          <Text style={[styles.openPlaces, { color: colors.accentText }]}>
            {match.freeSpots} {copy.matchPlacesOpen}
          </Text>
        </View>

        <View
          style={[
            styles.action,
            { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
          ]}
        >
          <Text style={[styles.actionText, { color: colors.primaryButtonText }]}>
            {copy.matchViewGame}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function FormatTile({ sideSize }: { sideSize: number }) {
  const { colors } = useAppPreferences();
  return (
    <View style={[styles.formatTile, { backgroundColor: colors.surfaceRaised }]}>
      <Svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" accessibilityElementsHidden>
        <Rect x="3" y="8" width="58" height="48" rx="3" stroke={colors.border} strokeWidth="1.4" />
        <Path d="M32 8v48M3 32h58" stroke={colors.border} strokeWidth="1.4" />
        <Rect x="3" y="23" width="8" height="18" stroke={colors.border} strokeWidth="1.2" />
        <Rect x="53" y="23" width="8" height="18" stroke={colors.border} strokeWidth="1.2" />
      </Svg>
      <Text style={[styles.tileFormat, { color: colors.pitchText, textShadowColor: colors.background }]}>
        {sideSize}v{sideSize}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1, borderRadius: 24, padding: 16, gap: 13 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  formatTile: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    overflow: 'hidden',
  },
  tileFormat: {
    position: 'absolute',
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 19,
    fontWeight: '800',
    textShadowRadius: 4,
  },
  matchInfo: { flex: 1, minWidth: 0, gap: 3 },
  area: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, lineHeight: 28, fontWeight: '700' },
  time: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  priceBox: { minWidth: 54, alignItems: 'flex-end', gap: 1 },
  price: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 25, lineHeight: 28, fontWeight: '800' },
  perPlayer: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  divider: { height: 1, opacity: 0.8 },
  playerDots: {
    minHeight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  playerDot: { width: 9, height: 9, borderWidth: 1, borderRadius: 5 },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  playerCount: { flexShrink: 1, fontFamily: 'Inter_400Regular', fontSize: 12 },
  openPlaces: { flexShrink: 0, fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '700' },
  action: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 14,
  },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '800' },
});
