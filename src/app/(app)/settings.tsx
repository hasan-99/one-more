import { StyleSheet, Text, View } from 'react-native';

import { AppPage } from '@/components/layout/AppPage';
import { PreferenceSwitchers } from '@/components/preferences-switchers';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function SettingsScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  return (
    <AppPage title={copy.appSettingsTitle} description={copy.appSettingsIntro}>
      <View
        style={[
          styles.preferences,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.label, { color: colors.textMuted }]}>{copy.appGuestPreview}</Text>
        <PreferenceSwitchers />
      </View>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  preferences: { borderWidth: 1, borderRadius: 18, padding: 20, gap: 18 },
  label: { fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
});
