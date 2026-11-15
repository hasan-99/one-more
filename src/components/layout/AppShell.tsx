import { useFonts } from 'expo-font';
import { Link, useGlobalSearchParams, usePathname, type Href } from 'expo-router';
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

export function AppShell({ children }: PropsWithChildren) {
  const { colors, locale } = useAppPreferences();
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_700Bold: require('@/assets/fonts/BarlowCondensed-Bold.ttf'),
    BarlowCondensed_800ExtraBold: require('@/assets/fonts/BarlowCondensed-ExtraBold.ttf'),
    Barlow_400Regular: require('@/assets/fonts/Barlow-Regular.ttf'),
    Barlow_500Medium: require('@/assets/fonts/Barlow-Medium.ttf'),
    Barlow_600SemiBold: require('@/assets/fonts/Barlow-SemiBold.ttf'),
    Barlow_800ExtraBoldItalic: require('@/assets/fonts/Barlow-ExtraBoldItalic.ttf'),
    Inter_400Regular: require('@/assets/fonts/Inter-Regular.ttf'),
    Inter_600SemiBold: require('@/assets/fonts/Inter-SemiBold.ttf'),
  });
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams<{ matchId?: string }>();
  const { width } = useWindowDimensions();
  const [responsiveLayoutReady, setResponsiveLayoutReady] = useState(false);
  const insets = useSafeAreaInsets();
  const copy = translations[locale];
  const active = activeSection(pathname);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  useEffect(() => {
    const timer = setTimeout(() => setResponsiveLayoutReady(true), 0);
    return () => clearTimeout(timer);
  }, []);
  const responsiveWidth = responsiveLayoutReady ? width : 0;
  const showSide = responsiveWidth >= 1024;
  const showRow = responsiveWidth >= 600 && responsiveWidth < 1024;
  const showBottom = responsiveWidth < 600;
  // Creating a game is a full-screen flow; editing one (with a matchId) keeps the regular shell.
  const creatingGame = pathname === '/create' && !searchParams.matchId;
  const immersive =
    pathname === '/teams/create' ||
    pathname === '/onboarding' ||
    pathname === '/profile-edit' ||
    creatingGame;
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
              { paddingTop: Math.max(insets.top, 10) + 8 },
            ]}
          >
            <View style={styles.titleBlock}>{!showSide ? <BrandMark prominent /> : null}</View>
            <LanguageSwitcher compact />
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
            style={[styles.mobileNav, { paddingBottom: Math.max(insets.bottom, 12) }]}
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
    exploreTopBar: {
      minHeight: 68,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderBottomColor: colors.navBorder,
    },
    titleBlock: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sectionTitle: {
      color: colors.textSecondary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      fontWeight: '600',
    },
    exploreSectionTitle: {
      color: colors.textPrimary,
      fontFamily: 'BarlowCondensed_800ExtraBold',
      fontSize: 24,
      lineHeight: 26,
      fontWeight: '800',
    },
    tabletNav: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 6,
    },
    routeContent: { flex: 1, minWidth: 0, minHeight: 0 },
    mobileNav: {
      zIndex: 20,
      paddingTop: 8,
      paddingHorizontal: 10,
      borderTopWidth: 1,
      borderTopColor: colors.navBorder,
      backgroundColor: colors.navBar,
    },
  });
}
