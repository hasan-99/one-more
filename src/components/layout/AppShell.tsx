import { Link, usePathname, type Href } from 'expo-router';
import { useMemo, type PropsWithChildren } from 'react';
import { Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { LanguageSwitcher } from '@/components/preferences-switchers';
import { AppNavigation } from '@/components/layout/AppNavigation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

function activeSection(pathname: string) {
  if (
    pathname.startsWith('/explore') ||
    pathname.startsWith('/matches') ||
    pathname.startsWith('/chat')
  ) {
    return 'explore';
  }
  if (pathname.startsWith('/create')) return 'create';
  if (pathname.startsWith('/teams') || pathname.startsWith('/challenges')) return 'teams';
  if (
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/notifications')
  ) {
    return 'profile';
  }
  return 'home';
}

function sectionTitle(pathname: string, locale: 'en' | 'el') {
  const copy = translations[locale];
  if (pathname.startsWith('/explore')) return copy.appExploreTitle;
  if (pathname.startsWith('/create')) return copy.appCreateTitle;
  if (pathname.startsWith('/teams/')) return copy.appTeamDetailsTitle;
  if (pathname === '/teams') return copy.appTeamsTitle;
  if (pathname.startsWith('/matches')) return copy.appMatchDetailsTitle;
  if (pathname === '/challenges') return copy.appChallenges;
  if (pathname.startsWith('/challenges/')) return copy.appChallengeDetailsTitle;
  if (pathname.startsWith('/chat')) return copy.appChatTitle;
  if (pathname.startsWith('/notifications')) return copy.appNotificationsTitle;
  if (pathname.startsWith('/settings')) return copy.appSettingsTitle;
  if (pathname.startsWith('/profile')) return copy.appProfileTitle;
  return copy.appHomeTitle;
}

export function AppShell({ children }: PropsWithChildren) {
  const { colors, locale } = useAppPreferences();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const copy = translations[locale];
  const active = activeSection(pathname);
  const title = sectionTitle(pathname, locale);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isWeb = Platform.OS === 'web';
  const showSide = isWeb || width >= 1024;
  const showRow = isWeb || (width >= 600 && width < 1024);
  const showBottom = isWeb || width < 600;

  return (
    <View style={styles.root}>
      {showSide ? (
        <View nativeID="app-sidebar" style={styles.sidebar}>
          <BrandMark />
          <AppNavigation active={active} variant="side" />
          <View style={styles.sidebarSpacer} />
          <Text style={styles.previewLabel}>{copy.appGuestPreview}</Text>
          {__DEV__ ? (
            <Link href={'/design-review' as Href} style={styles.reviewLink}>
              {copy.galleryNavReview}
            </Link>
          ) : null}
        </View>
      ) : null}
      <View style={styles.main}>
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            {!showSide ? <BrandMark /> : null}
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {title}
            </Text>
          </View>
          <LanguageSwitcher />
        </View>
        {showRow ? (
          <View nativeID="app-tablet-nav" style={styles.tabletNav}>
            <AppNavigation active={active} variant="row" />
          </View>
        ) : null}
        <View style={styles.routeContent}>{children}</View>
        {showBottom ? (
          <View
            nativeID="app-mobile-nav"
            style={[styles.mobileNav, { paddingBottom: Math.max(insets.bottom, 8) }]}
          >
            <AppNavigation active={active} variant="bottom" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, minHeight: '100%', flexDirection: 'row', backgroundColor: colors.background },
    sidebar: {
      width: 236,
      paddingHorizontal: 18,
      paddingTop: 26,
      paddingBottom: 20,
      gap: 30,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.surface,
    },
    sidebarSpacer: { flex: 1 },
    previewLabel: { color: colors.textMuted, fontSize: 11, paddingHorizontal: 12 },
    reviewLink: {
      color: colors.textMuted,
      fontSize: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textDecorationLine: 'none',
    },
    main: { flex: 1, minWidth: 0, minHeight: '100%', backgroundColor: colors.background },
    topBar: {
      minHeight: 76,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    titleBlock: { flexDirection: 'row', alignItems: 'center', gap: 18 },
    sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
    tabletNav: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    routeContent: { flex: 1, minWidth: 0 },
    mobileNav: {
      zIndex: 20,
      paddingTop: 7,
      paddingHorizontal: 6,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
  });
}
