import { Image, StyleSheet, Text, View } from 'react-native';

import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

type BrandMarkProps = {
  subtitle?: string;
  prominent?: boolean;
  logoSize?: number;
};

export function BrandMark({ subtitle, prominent = false, logoSize }: BrandMarkProps) {
  const { colors } = useAppPreferences();
  return (
    <View style={styles.wrap}>
      <Image
        source={require('@/assets/images/one-more-logo.png')}
        accessibilityRole="image"
        accessibilityLabel="ONE MORE football logo"
        resizeMode="contain"
        style={[
          styles.logo,
          prominent && styles.prominentLogo,
          logoSize
            ? {
                width: logoSize,
                height: logoSize,
                borderRadius: Math.round(logoSize / 4),
              }
            : null,
        ]}
      />
      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            prominent && styles.prominentSubtitle,
            { color: colors.textMuted },
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
  logo: { width: 56, height: 56, borderRadius: 14 },
  prominentLogo: { width: 44, height: 44 },
  subtitle: {
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  prominentSubtitle: { fontSize: 10, letterSpacing: 0.8 },
});
