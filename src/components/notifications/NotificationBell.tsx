import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { useReducedMotion } from '@/components/motion';
import {
  refreshUnreadCount,
  setUnreadCount,
  useUnreadCount,
} from '@/features/notifications/unread-store';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

const NATIVE = Platform.OS !== 'web';
const refreshEveryMs = 60_000;

/** Bell next to the language switch: opens Notifications, shows the unread count (99+ above 99). */
export function NotificationBell() {
  const { user } = useAuth();
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const pathname = usePathname();
  const count = useUnreadCount();
  const reduced = useReducedMotion();
  const [swing] = useState(() => new Animated.Value(0));
  const previous = useRef(count);
  const userId = user?.id ?? null;

  // Keep the number fresh: on sign-in, on every page change, when the app comes back, every minute.
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    void refreshUnreadCount();
    const timer = setInterval(() => void refreshUnreadCount(), refreshEveryMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshUnreadCount();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [userId]);

  useEffect(() => {
    if (userId) void refreshUnreadCount();
  }, [pathname, userId]);

  // A new notification makes the bell ring once.
  useEffect(() => {
    if (count > previous.current && !reduced) {
      swing.setValue(0);
      Animated.timing(swing, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      }).start();
    }
    previous.current = count;
  }, [count, reduced, swing]);

  if (!userId) return null;

  const rotate = swing.interpolate({
    inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1],
    outputRange: ['0deg', '16deg', '-14deg', '10deg', '-8deg', '4deg', '0deg'],
  });
  const label =
    count > 0
      ? copy.notificationsBellUnread.replace('{count}', String(count))
      : copy.notificationsBellNone;
  const has = count > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push('/notifications' as Href)}
      hitSlop={4}
      style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
    >
      <Animated.View style={{ transform: [{ translateY: -3 }, { rotate }, { translateY: 3 }] }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M6 9a6 6 0 1 1 12 0c0 6 2.4 7.4 2.4 7.4H3.6S6 15 6 9Z"
            stroke={has ? colors.accentText : colors.textPrimary}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10 19.5a2.2 2.2 0 0 0 4 0"
            stroke={has ? colors.accentText : colors.textPrimary}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
      {has ? (
        <Text style={[styles.badge, { borderColor: colors.background }]}>
          {count > 99 ? '99+' : count}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#ff6a5c',
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
    lineHeight: 16,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
