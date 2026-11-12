import { StyleSheet, Text, View } from 'react-native';

type BrandMarkProps = {
  subtitle?: string;
  fontsLoaded?: boolean;
};

export function BrandMark({ subtitle, fontsLoaded = false }: BrandMarkProps) {
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text style={[styles.wordmark, fontsLoaded && styles.barlow]}>
        ONE <Text style={styles.accent}>MORE.</Text>
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, fontsLoaded && styles.interSemibold]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 2 },
  wordmark: {
    color: '#FFFFFF',
    fontSize: 25,
    letterSpacing: 0.6,
  },
  accent: { color: '#C7FF28' },
  subtitle: {
    color: '#A9B6A7',
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  barlow: { fontFamily: 'BarlowCondensed_700Bold' },
  interSemibold: { fontFamily: 'Inter_600SemiBold' },
});
