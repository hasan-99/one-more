import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type GestureResponderEvent,
} from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

import { defaultPositionForY, type OpenPosition, type OpenPositionCode } from './match-validation';

export function MatchPositionPicker({
  positions,
  maximum,
  onAdd,
}: {
  positions: OpenPosition[];
  maximum: number;
  onAdd: (position: OpenPosition) => void;
}) {
  const { colors, locale } = useAppPreferences();
  const [size, setSize] = useState({ width: 350, height: 212 });
  const copy = translations[locale];
  const positionCopy: Record<OpenPositionCode, string> = {
    goalkeeper: copy.matchGoalkeeper,
    defender: copy.matchDefender,
    midfielder: copy.matchMidfielder,
    forward: copy.matchForward,
    any: copy.matchAnyPosition,
  };
  const addAt = (event: GestureResponderEvent) => {
    if (positions.length >= maximum) return;
    const { locationX, locationY } = event.nativeEvent;
    const width = size.width;
    const height = size.height;
    const xPct = Math.max(4, Math.min(96, (locationX / width) * 100));
    const yPct = Math.max(5, Math.min(95, (locationY / height) * 100));
    onAdd({
      id: `${Date.now()}-${positions.length}`,
      position: defaultPositionForY(yPct),
      xPct,
      yPct,
    });
  };
  return (
    <>
      <View
        accessibilityRole="button"
        accessibilityLabel={`${copy.matchTapToAdd}; ${positions.length}/${maximum}`}
        accessibilityHint={copy.matchTapToAddHint}
        onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}
        onStartShouldSetResponder={() => positions.length < maximum}
        onResponderRelease={addAt}
        style={[styles.pitch, { borderColor: colors.pitchLine, backgroundColor: colors.pitch }]}
      >
        <View style={[styles.centerLine, { backgroundColor: colors.pitchLine }]} />
        <View style={[styles.centerCircle, { borderColor: colors.pitchLine }]} />
        <View style={[styles.goalBox, styles.topGoal, { borderColor: colors.pitchLine }]} />
        <View style={[styles.goalBox, styles.bottomGoal, { borderColor: colors.pitchLine }]} />
        {positions.map((slot) => (
          <View
            key={slot.id}
            style={[
              styles.marker,
              {
                left: `${slot.xPct ?? 50}%`,
                top: `${slot.yPct ?? 50}%`,
                backgroundColor: colors.primaryButton,
                borderColor: colors.pitchMarkerBorder,
              },
            ]}
          />
        ))}
        <Text style={[styles.count, { color: colors.pitchText }]}>
          {positions.length}/{maximum}
        </Text>
      </View>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{copy.matchTapToAddHint}</Text>
      <View style={styles.list}>
        {positions.map((position, index) => (
          <Text key={position.id} style={[styles.position, { color: colors.textPrimary }]}>
            {index + 1}. {positionCopy[position.position]}
          </Text>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pitch: {
    width: '100%',
    maxWidth: 500,
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
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 24,
    transform: [{ translateX: -22 }, { translateY: -22 }],
  },
  goalBox: { position: 'absolute', left: '33%', width: '34%', height: '12%', borderWidth: 1 },
  topGoal: { top: 0, borderTopWidth: 0 },
  bottomGoal: { bottom: 0, borderBottomWidth: 0 },
  marker: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 8,
    borderWidth: 1,
    transform: [{ translateX: -7 }, { translateY: -7 }],
  },
  count: { position: 'absolute', right: 10, bottom: 8, fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 19 },
  list: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  position: { fontSize: 12, fontWeight: '600' },
});
