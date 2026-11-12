import { Link, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export function ResponsiveNav({ active = 'home' }: { active?: 'home' | 'review' }) {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const links = [
    { key: 'home', href: '/', label: copy.galleryNavHome },
    { key: 'review', href: '/design-review' as Href, label: copy.galleryNavReview },
  ] as const;

  return (
    <View
      accessibilityRole="navigation"
      accessibilityLabel={copy.galleryNavHome}
      style={[styles.container, { borderColor: colors.border }]}
    >
      {links.map((link) => (
        <Link
          key={link.key}
          href={link.href}
          style={[
            styles.link,
            { color: active === link.key ? colors.accentText : colors.textMuted },
          ]}
        >
          <Text style={{ color: active === link.key ? colors.accentText : colors.textMuted }}>
            {link.label}
          </Text>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  link: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 9,
    textDecorationLine: 'none',
    fontSize: 13,
  },
});
