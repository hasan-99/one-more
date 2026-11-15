import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

/** Round back button for pages opened from another page. Falls back to `fallback` with no history. */
export function BackButton({ fallback }: { fallback: Href }) {
  const { colors, locale } = useAppPreferences();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translations[locale].challengeBack}
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      style={({ pressed }) => [
        styles.button,
        { borderColor: colors.border, backgroundColor: colors.surface },
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text style={[styles.text, { color: colors.textPrimary }]}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 28, lineHeight: 32, fontWeight: '700', marginTop: -2 },
});
