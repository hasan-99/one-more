import { Link, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

// Style keys that place the link inside its parent; everything else styles the link itself.
const placementKeys = [
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'width',
  'alignSelf',
] as const;

/**
 * A link that shrinks slightly while pressed. `Link asChild` only accepts a plain style object on
 * the web (no function or animated styles), so the press animation lives on a wrapper view that
 * takes over the link's place in the layout.
 */
export function PressLink({
  href,
  style,
  label,
  testID,
  children,
}: {
  href: Href;
  style: StyleProp<ViewStyle>;
  label?: string;
  testID?: string;
  children: ReactNode;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  const flat: ViewStyle = { ...StyleSheet.flatten(style) };
  const placement: ViewStyle = {};
  for (const key of placementKeys) {
    if (flat[key] !== undefined) {
      (placement as Record<string, unknown>)[key] = flat[key];
      delete flat[key];
    }
  }
  return (
    <Animated.View style={[placement, { transform: [{ scale }] }]}>
      <Link href={href} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={label}
          testID={testID}
          onPressIn={() => to(0.97)}
          onPressOut={() => to(1)}
          style={{ ...flat, flexGrow: 1 }}
        >
          {children}
        </Pressable>
      </Link>
    </Animated.View>
  );
}
