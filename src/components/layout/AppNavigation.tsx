import { Link, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

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
      href: '/teams/create' as Href,
      label: copy.appCreateTeamTitle,
      shortLabel: copy.appCreateTeamShort,
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
        const bottom = variant === 'bottom';
        const createAction = bottom && key === 'create';
        return (
          <Link key={key} href={href} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ selected }}
              accessibilityLabel={bottom ? shortLabel : label}
              style={StyleSheet.flatten([
                styles.link,
                bottom && styles.bottomLink,
                createAction && styles.createBottomLink,
                variant === 'side' && styles.sideLink,
                bottom && selected && !createAction && { backgroundColor: colors.surfaceRaised },
              ])}
            >
              {createAction ? (
                <View
                  style={[
                    styles.createButton,
                    { backgroundColor: colors.primaryButton, borderColor: colors.background, shadowColor: colors.primaryButton },
                  ]}
                >
                  <NavigationGlyph kind="createAction" color={colors.primaryButtonText} size={30} />
                </View>
              ) : (
                <NavigationGlyph
                  kind={key}
                  color={selected ? colors.accentText : colors.textMuted}
                  size={bottom ? 24 : 19}
                />
              )}
              <Text
                numberOfLines={bottom ? 1 : undefined}
                style={[
                  styles.linkText,
                  bottom && styles.bottomText,
                  createAction && styles.createBottomText,
                  { color: selected ? colors.accentText : colors.textMuted },
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
  link: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  sideLink: { minHeight: 52 },
  bottomLink: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 20,
  },
  createBottomLink: {
    flex: 1.15,
    minHeight: 78,
    marginTop: -22,
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  createButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -12 }],
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  linkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, fontWeight: '600' },
  bottomText: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  createBottomText: { marginTop: 0, fontSize: 11, lineHeight: 14, letterSpacing: -0.2 },
  selectedText: { fontWeight: '700' },
});

function NavigationGlyph({ kind, color, size }: { kind: string; color: string; size: number }) {
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      {...(Platform.OS === 'web' ? {} : { accessible: false })}
    >
      {kind === 'home' ? (
        <>
          <Path d="m3.5 10.5 8.5-7 8.5 7" {...common} />
          <Path d="M5.5 9.5v10h13v-10M9.5 19.5v-6h5v6" {...common} />
        </>
      ) : kind === 'explore' ? (
        <>
          <Circle cx="10.5" cy="10.5" r="6.5" {...common} />
          <Path d="m15.5 15.5 5 5" {...common} />
        </>
      ) : kind === 'create' ? (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Path d="M12 7.5v9M7.5 12h9" {...common} />
        </>
      ) : kind === 'createAction' ? (
        <Path d="M12 5v14M5 12h14" {...{ ...common, strokeWidth: 2.5 }} />
      ) : kind === 'teams' ? (
        <>
          <Path d="M12 3.2 20 6v6c0 4.2-2.8 7.3-8 9-5.2-1.7-8-4.8-8-9V6l8-2.8Z" {...common} />
        </>
      ) : (
        <>
          <Circle cx="12" cy="8" r="3.3" {...common} />
          <Path d="M5 20c.5-3.7 2.8-5.7 7-5.7s6.5 2 7 5.7" {...common} />
        </>
      )}
    </Svg>
  );
}
