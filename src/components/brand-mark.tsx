import { StyleSheet, Text, View } from 'react-native';

import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

type BrandMarkProps = {
  subtitle?: string;
  fontsLoaded?: boolean;
};

export function BrandMark({ subtitle, fontsLoaded = false }: BrandMarkProps) {
  const { colors } = useAppPreferences();
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text style={[styles.wordmark, { color: colors.textPrimary }, fontsLoaded && styles.barlow]}>
        ONE <Text style={{ color: colors.accentText }}>MORE.</Text>
      </Text>
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            { color: colors.textMuted },
            fontsLoaded && styles.interSemibold,
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  wordmark: {
    fontSize: 25,
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  barlow: { fontFamily: 'BarlowCondensed_700Bold' },
  interSemibold: { fontFamily: 'Inter_600SemiBold' },
});
