import { Pressable, StyleSheet, Text, View } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences, type ThemePreference } from '@/preferences/AppPreferencesProvider';

export function LanguageSwitcher() {
  const { locale, setLocale, colors, preferencesReady } = useAppPreferences();
  const copy = translations[locale];

  return (
    <View nativeID="language-switcher" style={styles.group}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{copy.languageLabel}</Text>
      <View
        style={[
          styles.segment,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}
      >
        {(['en', 'el'] as const).map((value) => {
          const selected = locale === value;
          const label = value === 'en' ? copy.languageEnglish : copy.languageGreek;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`${copy.languageLabel}: ${label}`}
              accessibilityState={{ selected }}
              disabled={!preferencesReady}
              onPress={() => setLocale(value)}
              style={[styles.option, selected && { backgroundColor: colors.primaryButton }]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: selected ? colors.primaryButtonText : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AppearanceSwitcher() {
  const { locale, themePreference, setThemePreference, colors, preferencesReady } =
    useAppPreferences();
  const copy = translations[locale];
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: copy.themeSystem },
    { value: 'dark', label: copy.themeDark },
    { value: 'light', label: copy.themeLight },
  ];

  return (
    <View nativeID="appearance-switcher" style={styles.group}>
      <View
        style={[
          styles.segment,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}
      >
        {options.map(({ value, label }) => {
          const selected = themePreference === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`${copy.themeLabel}: ${label}`}
              accessibilityState={{ selected }}
              disabled={!preferencesReady}
              onPress={() => setThemePreference(value)}
              style={[styles.option, selected && { backgroundColor: colors.primaryButton }]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: selected ? colors.primaryButtonText : colors.textSecondary },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 4 },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, textTransform: 'uppercase' },
  segment: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
    gap: 2,
  },
  option: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontSize: 12, fontWeight: '600' },
});
