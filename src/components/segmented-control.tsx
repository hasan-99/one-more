import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont } from '@/theme/typography';

export type SegmentOption = {
  key: string;
  label: string;
  onPress: () => void;
  icon?: (color: string) => ReactNode;
  accessibilityLabel?: string;
};

/**
 * Segmented control whose lime thumb glides between options (reference `.ap-thumb`,
 * 350ms cubic-bezier(.2,.9,.2,1)). Options are radios so screen readers announce state.
 */
export function SegmentedControl({
  label,
  index,
  options,
  tall = false,
  disabled = false,
}: {
  label: string;
  index: number;
  options: SegmentOption[];
  tall?: boolean;
  disabled?: boolean;
}) {
  const { colors, locale } = useAppPreferences();
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(Math.max(index, 0)));
  useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: Math.max(index, 0),
      duration: 350,
      easing: Easing.bezier(0.2, 0.9, 0.2, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [index, position]);
  const segment = width > 0 ? (width - 11) / options.length : 0;
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.group, { borderColor: colors.border, backgroundColor: colors.well }]}
    >
      {segment > 0 && index >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: segment,
              backgroundColor: colors.primaryButton,
              transform: [{ translateX: Animated.multiply(position, segment) }],
            },
          ]}
        />
      ) : null}
      {options.map((option, optionIndex) => {
        const selected = optionIndex === index;
        const color = selected ? colors.primaryButtonText : colors.textSecondary;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ checked: selected, disabled }}
            aria-checked={selected}
            disabled={disabled}
            onPress={option.onPress}
            style={({ pressed }) => [
              styles.segment,
              tall && styles.tall,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
          >
            {option.icon ? option.icon(color) : null}
            <Text
              numberOfLines={1}
              style={[styles.text, { color, fontFamily: bodyFont(locale, 'semibold') }]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', padding: 4, borderRadius: 16, borderWidth: 1.5 },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 12 },
  segment: {
    flex: 1,
    minWidth: 0,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  tall: { height: 66, gap: 4 },
  text: { fontSize: 15, fontWeight: '600' },
});
