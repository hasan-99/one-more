import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

type NavVariant = 'side' | 'row' | 'bottom';
type NavItem = { key: string; href: Href; label: string; shortLabel: string };

export function AppNavigation({ active, variant }: { active: string; variant: NavVariant }) {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const items: NavItem[] = [
    { key: 'home', href: '/home' as Href, label: copy.appHomeTitle, shortLabel: copy.appHomeTitle },
    {
      key: 'explore',
      href: '/explore' as Href,
      label: copy.appExploreTitle,
      shortLabel: copy.appExploreShort,
    },
    {
      key: 'create',
      href: '/create' as Href,
      label: copy.appCreateTitle,
      shortLabel: copy.appCreateShort,
    },
    {
      key: 'teams',
      href: '/teams' as Href,
      label: copy.appTeamsTitle,
      shortLabel: copy.appTeamsTitle,
    },
    {
      key: 'profile',
      href: '/profile' as Href,
      label: copy.appProfileTitle,
      shortLabel: copy.appProfileTitle,
    },
  ];

  return (
    <View
      accessibilityRole="navigation"
      accessibilityLabel={copy.appNavigation}
      style={[styles.nav, styles[variant]]}
    >
      {items.map(({ key, href, label, shortLabel }) => {
        const selected = active === key;
        return (
          <Link key={key} href={href} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ selected }}
              style={StyleSheet.flatten([
                styles.link,
                variant === 'bottom' && styles.bottomLink,
                selected && { backgroundColor: colors.surfaceRaised },
              ])}
            >
              <Text
                numberOfLines={variant === 'bottom' ? 1 : undefined}
                style={[
                  styles.linkText,
                  variant === 'bottom' && styles.bottomText,
                  { color: selected ? colors.accentText : colors.textSecondary },
                  selected && styles.selectedText,
                ]}
              >
                {variant === 'bottom' ? shortLabel : label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: { gap: 6 },
  side: { flexDirection: 'column' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  bottom: { flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-around' },
  link: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 11 },
  bottomLink: { flex: 1, minWidth: 0, paddingHorizontal: 3, minHeight: 54, alignItems: 'center' },
  linkText: { fontSize: 13, fontWeight: '600' },
  bottomText: { fontSize: 10, textAlign: 'center' },
  selectedText: { fontWeight: '700' },
});
