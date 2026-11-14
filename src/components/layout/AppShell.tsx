import { useFonts } from 'expo-font';
import { Link, usePathname, type Href } from 'expo-router';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  if (pathname === '/teams/create') return 'create';
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
  if (pathname === '/teams/create') return copy.appCreateTeamTitle;
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
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_700Bold: require('@/assets/fonts/BarlowCondensed-Bold.ttf'),
    Inter_400Regular: require('@/assets/fonts/Inter-Regular.ttf'),
    Inter_600SemiBold: require('@/assets/fonts/Inter-SemiBold.ttf'),
  });
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [responsiveLayoutReady, setResponsiveLayoutReady] = useState(false);
  const insets = useSafeAreaInsets();
  const copy = translations[locale];
  const active = activeSection(pathname);
  const title = sectionTitle(pathname, locale);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  useEffect(() => {
    const timer = setTimeout(() => setResponsiveLayoutReady(true), 0);
    return () => clearTimeout(timer);
  }, []);
  const responsiveWidth = responsiveLayoutReady ? width : 0;
  const showSide = responsiveWidth >= 1024;
  const showRow = responsiveWidth >= 600 && responsiveWidth < 1024;
  const showBottom = responsiveWidth < 600;
  const immersive = pathname === '/teams/create';
  const profileFullBleed = pathname === '/profile';

  if (!fontsLoaded && !fontError) {
    return (
      <View style={StyleSheet.flatten([styles.root, { backgroundColor: colors.background }])} />
    );
  }

  if (immersive) {
    return (
      <View style={StyleSheet.flatten([styles.root, { backgroundColor: colors.background }])}>
        <View style={[styles.main, styles.immersiveMain]}>
          <View style={styles.routeContent}>{children}</View>
        </View>
      </View>
    );
  }

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
        {!profileFullBleed ? (
          <View
            style={[
              styles.topBar,
              pathname.startsWith('/explore') && styles.exploreTopBar,
              { paddingTop: Math.max(insets.top, 10) },
            ]}
          >
            <View style={styles.titleBlock}>
              {!showSide ? <BrandMark prominent={pathname.startsWith('/explore')} /> : null}
              <Text
                accessibilityRole="header"
                style={[
                  styles.sectionTitle,
                  pathname.startsWith('/explore') && styles.exploreSectionTitle,
                ]}
              >
                {title}
              </Text>
            </View>
            <LanguageSwitcher compact={pathname.startsWith('/explore')} />
          </View>
        ) : null}
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
            <View style={styles.mobileNavPill}>
              <AppNavigation active={active} variant="bottom" />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    root: {
      flex: 1,
      minHeight: '100%',
      flexDirection: 'row',
      backgroundColor: colors.background,
    },
    sidebar: {
      width: 236,
      paddingHorizontal: 18,
      paddingTop: 26,
      paddingBottom: 20,
      gap: 28,
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
    immersiveMain: { minHeight: 0 },
    topBar: {
      minHeight: 72,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    exploreTopBar: { minHeight: 62, paddingVertical: 8 },
    titleBlock: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionTitle: {
      color: colors.textSecondary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '600',
    },
    exploreSectionTitle: {
      color: colors.textPrimary,
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 21,
      lineHeight: 25,
      fontWeight: '700',
    },
    tabletNav: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    routeContent: { flex: 1, minWidth: 0 },
    mobileNav: {
      zIndex: 20,
      paddingTop: 8,
      paddingHorizontal: 12,
      backgroundColor: 'transparent',
    },
    mobileNavPill: {
      padding: 5,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 22,
      backgroundColor: colors.surface,
      shadowColor: '#000000',
      shadowOpacity: 0.14,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 5 },
      elevation: 8,
    },
  });
}
