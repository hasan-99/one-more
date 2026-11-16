import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BallLoader } from '@/components/loading/BallLoader';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

const showAfterMs = 800;
const slowAfterMs = 6_000;
const lineEveryMs = 1_600;

/**
 * What a player sees while the server answers. Fast answers show nothing extra (no flash), a longer
 * wait shows the bouncing football with a changing line, and a slow one says so.
 */
export function WaitScreen({ label, subtitle }: { label: string; subtitle: string }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - started), 400);
    return () => clearInterval(timer);
  }, []);

  const lines = [copy.loaderLine1, copy.loaderLine2, copy.loaderLine3, copy.loaderLine4];
  const visible = elapsed >= showAfterMs;
  const slow = elapsed >= slowAfterMs;
  const line = slow
    ? copy.loaderSlow
    : lines[Math.floor(Math.max(0, elapsed - showAfterMs) / lineEveryMs) % lines.length];

  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.wrap}>
      {visible ? (
        <>
          <BallLoader />
          <Text
            style={[styles.line, { color: colors.textPrimary, fontFamily: displayFont(locale) }]}
          >
            {line}
          </Text>
          <Text
            style={[
              styles.sub,
              { color: colors.textSecondary, fontFamily: bodyFont(locale, 'regular') },
            ]}
          >
            {slow ? copy.loaderSlowSub : subtitle}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 16,
  },
  line: { fontSize: 28, fontWeight: '700', textAlign: 'center', maxWidth: 310 },
  sub: { fontSize: 14, lineHeight: 20, textAlign: 'center', maxWidth: 290 },
});
