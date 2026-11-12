import { StyleSheet, Text, View } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

import type { MatchDiscoveryItem } from './match-service';

export function MatchPitchMap({ match }: { match: MatchDiscoveryItem }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const visible = match.openPositions.slice(0, Math.max(0, match.freeSpots));
  const positionCopy = {
    goalkeeper: copy.matchGoalkeeper,
    defender: copy.matchDefender,
    midfielder: copy.matchMidfielder,
    forward: copy.matchForward,
    any: copy.matchAnyPosition,
  };
  const groups = visible.reduce<Record<string, number>>((counts, slot) => {
    counts[slot.position] = (counts[slot.position] ?? 0) + 1;
    return counts;
  }, {});
  const imageLabel = Object.entries(groups)
    .map(([position, count]) => `${count} ${positionCopy[position as keyof typeof positionCopy]}`)
    .join(', ');
  const zone: Record<string, number> = {
    forward: 18,
    midfielder: 40,
    defender: 62,
    goalkeeper: 83,
    any: 50,
  };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${copy.matchOpenPositions}: ${imageLabel || copy.matchNoPositions}`}
      style={[styles.pitch, { borderColor: colors.pitchLine, backgroundColor: colors.pitch }]}
    >
      <View style={[styles.centerLine, { backgroundColor: colors.pitchLine }]} />
      <View style={[styles.centerCircle, { borderColor: colors.pitchLine }]} />
      <View style={[styles.goalBox, styles.topGoal, { borderColor: colors.pitchLine }]} />
      <View style={[styles.goalBox, styles.bottomGoal, { borderColor: colors.pitchLine }]} />
      {visible.map((slot) => {
        const left = `${slot.xPct ?? 50}%` as const;
        const top = `${slot.yPct ?? zone[slot.position]}%` as const;
        return (
          <View
            key={slot.id}
            style={[
              styles.marker,
              {
                left,
                top,
                backgroundColor: colors.primaryButton,
                borderColor: colors.pitchMarkerBorder,
              },
            ]}
          />
        );
      })}
      <Text style={[styles.count, { color: colors.pitchText }]}>
        {visible.length} {copy.matchOpenPositions.toLowerCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pitch: {
    width: '100%',
    maxWidth: 350,
    aspectRatio: 1.65,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  centerLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1 },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 40,
    height: 40,
    borderWidth: 1,
    borderRadius: 24,
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  goalBox: { position: 'absolute', left: '33%', width: '34%', height: '12%', borderWidth: 1 },
  topGoal: { top: 0, borderTopWidth: 0 },
  bottomGoal: { bottom: 0, borderBottomWidth: 0 },
  marker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 8,
    borderWidth: 1,
    transform: [{ translateX: -6 }, { translateY: -6 }],
  },
  count: { position: 'absolute', right: 10, bottom: 8, fontSize: 10, fontWeight: '700' },
});
