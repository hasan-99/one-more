import { Link, type Href } from 'expo-router';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useLoop } from '@/components/motion';
import { translations } from '@/i18n';
import { bodyFont } from '@/theme/typography';
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
        const bottom = variant === 'bottom';
        const createAction = bottom && key === 'create';
        return (
          <Link key={key} href={href} prefetch asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityState={{ selected }}
              accessibilityLabel={bottom ? shortLabel : label}
              style={StyleSheet.flatten([
                styles.link,
                bottom && styles.bottomLink,
                createAction && styles.createBottomLink,
                variant === 'side' && styles.sideLink,
                bottom && selected && !createAction && { backgroundColor: colors.navSelected },
              ])}
            >
              {createAction ? (
                <CreateActionButton
                  background={colors.primaryButton}
                  foreground={colors.primaryButtonText}
                />
              ) : (
                <NavigationGlyph
                  kind={key}
                  color={selected ? colors.accentText : colors.textMuted}
                  size={bottom ? 22 : 19}
                  strokeWidth={bottom && selected && key === 'explore' ? 2.2 : 2}
                />
              )}
              <Text
                numberOfLines={bottom ? 1 : undefined}
                style={[
                  styles.linkText,
                  { fontFamily: bodyFont(locale, 'semibold') },
                  bottom && styles.bottomText,
                  // Greek labels are wider: a touch smaller so they are never cut on narrow phones.
                  bottom && locale === 'el' && { fontSize: 11 },
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
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 0 },
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
    minHeight: 48,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 2,
    paddingVertical: 3,
    borderRadius: 14,
  },
  createBottomLink: { justifyContent: 'flex-end' },
  createButton: {
    width: 48,
    height: 48,
    marginTop: -22,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  linkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, fontWeight: '600' },
  bottomText: { fontSize: 12, lineHeight: 15, textAlign: 'center' },
  createBottomText: { marginTop: 0 },
  selectedText: { fontWeight: '600' },
});

/** Lime create button with the reference's expanding ring pulse (`ap-ring`). */
function CreateActionButton({
  background,
  foreground,
}: {
  background: string;
  foreground: string;
}) {
  const ring = useLoop(2400, { easing: (value) => 1 - (1 - value) * (1 - value) });
  return (
    <View style={styles.createButton}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.createRing,
          {
            backgroundColor: background,
            opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
            transform: [
              { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.58] }) },
            ],
          },
        ]}
      />
      <View style={[styles.createButton, { marginTop: 0, backgroundColor: background }]}>
        <NavigationGlyph kind="createAction" color={foreground} size={24} strokeWidth={2.6} />
      </View>
    </View>
  );
}

function NavigationGlyph({
  kind,
  color,
  size,
  strokeWidth = 2,
}: {
  kind: string;
  color: string;
  size: number;
  strokeWidth?: number;
}) {
  const common = {
    stroke: color,
    strokeWidth,
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
        <Path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...common} />
      ) : kind === 'explore' ? (
        <>
          <Circle cx="11" cy="11" r="7" {...common} />
          <Path d="M16.5 16.5L21 21" {...common} />
        </>
      ) : kind === 'create' ? (
        <>
          <Circle cx="12" cy="12" r="8.5" {...common} />
          <Path d="M12 7.5v9M7.5 12h9" {...common} />
        </>
      ) : kind === 'createAction' ? (
        <Path d="M12 5v14M5 12h14" {...common} />
      ) : kind === 'teams' ? (
        <Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" {...common} />
      ) : (
        <>
          <Circle cx="12" cy="8" r="4" {...common} />
          <Path d="M4 21c0-4 4-6 8-6s8 2 8 6" {...common} />
        </>
      )}
    </Svg>
  );
}
