import { StyleSheet, Text, View, Pressable } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences, type ThemePreference } from '@/preferences/AppPreferencesProvider';

export function PreferenceSwitchers() {
  const { locale, setLocale, themePreference, setThemePreference, colors, preferencesReady } =
    useAppPreferences();
  const copy = translations[locale];
  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: copy.themeSystem },
    { value: 'dark', label: copy.themeDark },
    { value: 'light', label: copy.themeLight },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.group}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{copy.themeLabel}</Text>
        <View
          style={[
            styles.segment,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          ]}
        >
          {themeOptions.map(({ value, label }) => {
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
      <View style={styles.group}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{copy.languageLabel}</Text>
        <View
          style={[
            styles.segment,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          ]}
        >
          {(['en', 'el'] as const).map((value) => {
            const selected = locale === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`${copy.languageLabel}: ${translations[locale][value === 'en' ? 'languageEnglish' : 'languageGreek']}`}
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
                  {value === 'en' ? copy.languageEnglish : copy.languageGreek}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 },
  group: { gap: 4 },
  label: { fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' },
  segment: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 3, gap: 2 },
  option: {
    minHeight: 32,
    minWidth: 42,
    borderRadius: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { fontSize: 11, fontWeight: '600' },
});
