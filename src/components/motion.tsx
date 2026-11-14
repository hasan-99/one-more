import { useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';

/** Tracks the OS "reduce motion" setting; defaults to reduced until known on failure. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduced(enabled);
      })
      .catch(() => {
        if (active) setReduced(true);
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

/** A looping 0→1 value. `alternate` runs 0→1→0 like CSS `infinite alternate`. */
export function useLoop(
  duration: number,
  {
    alternate = false,
    delay = 0,
    easing = Easing.inOut(Easing.ease),
    enabled = true,
  }: {
    alternate?: boolean;
    delay?: number;
    easing?: (value: number) => number;
    enabled?: boolean;
  } = {},
): Animated.Value {
  const [value] = useState(() => new Animated.Value(0));
  // Callers pass a fresh easing function every render; keeping the first one stops the
  // animation from restarting each time the parent re-renders.
  const [stableEasing] = useState(() => easing);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced || !enabled) {
      value.setValue(0);
      return;
    }
    const steps: Animated.CompositeAnimation[] = [];
    if (delay) steps.push(Animated.delay(delay));
    steps.push(
      Animated.timing(value, { toValue: 1, duration, easing: stableEasing, useNativeDriver: true }),
    );
    steps.push(
      alternate
        ? Animated.timing(value, {
            toValue: 0,
            duration,
            easing: stableEasing,
            useNativeDriver: true,
          })
        : Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
    );
    const animation = Animated.loop(Animated.sequence(steps));
    animation.start();
    return () => animation.stop();
  }, [alternate, delay, duration, stableEasing, enabled, reduced, value]);
  return value;
}

/** One-shot 0→1 entrance value, played on mount (or whenever `replayKey` changes). */
export function useEntrance(
  duration: number,
  delay = 0,
  easing: (value: number) => number = Easing.bezier(0.2, 0.8, 0.2, 1),
  replayKey: unknown = null,
): Animated.Value {
  const [value] = useState(() => new Animated.Value(0));
  const [stableEasing] = useState(() => easing);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: stableEasing,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, duration, stableEasing, reduced, replayKey, value]);
  return value;
}

/** Fade + rise-in wrapper matching the reference `.ap-rise` keyframes. */
export function Rise({
  delay = 0,
  distance = 14,
  duration = 700,
  style,
  children,
}: PropsWithChildren<{
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}>) {
  const progress = useEntrance(duration, delay);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
