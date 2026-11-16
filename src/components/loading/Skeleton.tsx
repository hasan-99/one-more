import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type DimensionValue } from 'react-native';

import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export type SkeletonKind = 'card' | 'row' | 'profile' | 'detail' | 'chat';

/** One grey block that gently pulses. All blocks share the same rhythm so the page breathes together. */
function usePulse() {
  const [value] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!active || reduce) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(value, { toValue: 0.45, duration: 700, useNativeDriver: true }),
            Animated.timing(value, { toValue: 1, duration: 700, useNativeDriver: true }),
          ]),
        );
        loop.start();
      })
      .catch(() => undefined);
    return () => {
      active = false;
      loop?.stop();
    };
  }, [value]);
  return value;
}

function Box({
  pulse,
  width = '100%',
  height,
  radius = 8,
  color,
}: {
  pulse: Animated.Value;
  width?: DimensionValue;
  height: number;
  radius?: number;
  color: string;
}) {
  return (
    <Animated.View
      style={{ width, height, borderRadius: radius, backgroundColor: color, opacity: pulse }}
    />
  );
}

/**
 * Grey placeholders with the same size and spacing as the real content, so nothing jumps when the
 * data arrives. It is one progressbar for screen readers, labelled with the page's loading text.
 */
export function SkeletonList({
  kind,
  count = 3,
  label,
}: {
  kind: SkeletonKind;
  count?: number;
  label: string;
}) {
  const { colors } = useAppPreferences();
  const pulse = usePulse();
  const tone = colors.border;
  const items = Array.from({ length: kind === 'profile' || kind === 'detail' ? 1 : count });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.list}
      testID="skeleton"
    >
      {items.map((_, index) => (
        <View
          key={index}
          style={[
            styles.block,
            kind === 'row' || kind === 'chat'
              ? { borderColor: colors.border }
              : { borderColor: colors.border, backgroundColor: colors.surface },
            kind === 'row' && styles.row,
          ]}
        >
          {kind === 'card' ? (
            <>
              <View style={styles.split}>
                <Box pulse={pulse} width="55%" height={26} color={tone} />
                <Box pulse={pulse} width={48} height={22} color={tone} />
              </View>
              <Box pulse={pulse} width="70%" height={14} color={tone} />
              <Box pulse={pulse} height={74} radius={16} color={tone} />
              <Box pulse={pulse} width="40%" height={14} color={tone} />
              <Box pulse={pulse} height={46} radius={14} color={tone} />
            </>
          ) : null}
          {kind === 'row' ? (
            <>
              <Box pulse={pulse} width={40} height={40} radius={20} color={tone} />
              <View style={styles.rowText}>
                <Box pulse={pulse} width="75%" height={16} color={tone} />
                <Box pulse={pulse} width="45%" height={12} color={tone} />
              </View>
            </>
          ) : null}
          {kind === 'profile' ? (
            <>
              <View style={styles.split}>
                <Box pulse={pulse} width={88} height={88} radius={44} color={tone} />
                <View style={styles.rowText}>
                  <Box pulse={pulse} width="70%" height={26} color={tone} />
                  <Box pulse={pulse} width="45%" height={14} color={tone} />
                </View>
              </View>
              <Box pulse={pulse} height={120} radius={18} color={tone} />
              <Box pulse={pulse} height={56} radius={14} color={tone} />
              <Box pulse={pulse} height={56} radius={14} color={tone} />
            </>
          ) : null}
          {kind === 'detail' ? (
            <>
              <Box pulse={pulse} height={150} radius={22} color={tone} />
              <View style={styles.split}>
                <Box pulse={pulse} width="31%" height={72} radius={14} color={tone} />
                <Box pulse={pulse} width="31%" height={72} radius={14} color={tone} />
                <Box pulse={pulse} width="31%" height={72} radius={14} color={tone} />
              </View>
              <Box pulse={pulse} height={90} radius={18} color={tone} />
              <Box pulse={pulse} height={46} radius={14} color={tone} />
            </>
          ) : null}
          {kind === 'chat' ? (
            <View style={index % 2 ? styles.mine : styles.theirs}>
              <Box
                pulse={pulse}
                width={index % 2 ? '60%' : '72%'}
                height={44}
                radius={16}
                color={tone}
              />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  block: { gap: 10, borderWidth: 1, borderRadius: 20, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 12 },
  rowText: { flex: 1, gap: 8 },
  split: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  mine: { alignItems: 'flex-end' },
  theirs: { alignItems: 'flex-start' },
});
