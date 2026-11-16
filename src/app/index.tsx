import { useFonts } from 'expo-font';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { AuthButton, AuthPage } from '@/components/auth/AuthPage';
import { DemoPlayerMovement } from '@/components/demo-player-movement';
import { ReferenceLandingNative } from '@/components/landing/ReferenceLandingNative';
import { LegalLinks } from '@/components/legal/LegalLinks';
import { LanguageSwitcher } from '@/components/preferences-switchers';
import { PitchBackdrop } from '@/components/pitch-backdrop';
import { translations } from '@/i18n';
import { useAuth } from '@/auth/AuthProvider';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import type { ThemeColors } from '@/theme/tokens';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export default function LandingScreen() {
  return Platform.OS === 'web' ? <LandingScreenWeb /> : <NativeLandingEntry />;
}

function NativeLandingEntry() {
  const { session, isLoading, sessionError, refreshSession } = useAuth();
  const { locale } = useAppPreferences();
  const copy = translations[locale];

  useEffect(() => {
    if (session && !isLoading && !sessionError) router.replace('/home' as Href);
  }, [isLoading, session, sessionError]);

  if (isLoading || session) {
    return (
      <AuthPage title={copy.authSessionLoading} description={copy.authProtectedDescription}>
        <View style={{ alignItems: 'center', padding: 24 }} accessibilityRole="progressbar">
          <ActivityIndicator color="#c7ff28" />
        </View>
      </AuthPage>
    );
  }

  if (sessionError) {
    return (
      <AuthPage title={copy.authSessionError} description={copy.authProtectedDescription}>
        <AuthButton label={copy.authRetry} onPress={() => void refreshSession()} />
      </AuthPage>
    );
  }

  return <ReferenceLandingNative />;
}

function LandingScreenWeb() {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [fontsLoaded] = useFonts({
    BarlowCondensed_700Bold: require('@/assets/fonts/BarlowCondensed-Bold.ttf'),
    Inter_400Regular: require('@/assets/fonts/Inter-Regular.ttf'),
    Inter_600SemiBold: require('@/assets/fonts/Inter-SemiBold.ttf'),
  });
  const { width, height } = useWindowDimensions();
  const isCompact = width < 960;
  const [reduceMotion, setReduceMotion] = useState(() =>
    Platform.OS === 'web'
      ? typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : true,
  );
  const [placeTaken, setPlaceTaken] = useState(false);
  const [shine] = useState(() => new Animated.Value(0));
  const [arrowMotion] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (Platform.OS === 'web') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      const update = (event: MediaQueryListEvent) => setReduceMotion(event.matches);
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        if (active) setReduceMotion(true);
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      shine.stopAnimation();
      shine.setValue(0);
      arrowMotion.stopAnimation();
      arrowMotion.setValue(0);
      return;
    }

    const shineAnimation = Animated.loop(
      Animated.sequence([
        Animated.delay(2_000),
        Animated.timing(shine, { toValue: 1, duration: 1_800, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: USE_NATIVE_DRIVER }),
      ]),
    );
    const arrowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowMotion, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(arrowMotion, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    shineAnimation.start();
    arrowAnimation.start();
    return () => {
      shineAnimation.stop();
      arrowAnimation.stop();
    };
  }, [arrowMotion, reduceMotion, shine]);

  const handlePlaceTakenChange = useCallback((taken: boolean) => setPlaceTaken(taken), []);
  const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-80, 340] });
  const arrowX = arrowMotion.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <View
        nativeID="page-shell"
        style={[
          styles.shell,
          isCompact && styles.shellCompact,
          isCompact && Platform.OS !== 'web' && { minHeight: height },
        ]}
      >
        <PitchBackdrop />
        <View style={styles.foreground}>
          <View
            nativeID="landing-topbar"
            style={[styles.topBar, isCompact && styles.topBarCompact]}
          >
            <Reveal delay={0} reduceMotion={reduceMotion} variant="pop">
              <BrandMark prominent />
            </Reveal>
            <Reveal delay={400} reduceMotion={reduceMotion} style={styles.controlsReveal}>
              <View style={[styles.topControls, isCompact && styles.topControlsCompact]}>
                {!isCompact ? (
                  <Text style={[styles.location, fontsLoaded && styles.interSemibold]}>
                    {copy.locationLabel}
                  </Text>
                ) : null}
                <LanguageSwitcher compact />
              </View>
            </Reveal>
          </View>

          <View nativeID="landing-hero" style={[styles.hero, isCompact && styles.heroCompact]}>
            <View
              nativeID="hero-copy"
              style={[styles.heroCopy, isCompact && styles.heroCopyCompact]}
            >
              <Reveal
                delay={350}
                reduceMotion={reduceMotion}
                style={isCompact ? styles.heroCopyCompact : undefined}
              >
                <View style={[styles.eyebrowRow, isCompact && styles.eyebrowRowCompact]}>
                  <View style={styles.liveDot} />
                  <Text style={[styles.eyebrow, fontsLoaded && styles.interSemibold]}>
                    {copy.eyebrow}
                  </Text>
                </View>
              </Reveal>
              <View
                accessibilityRole="header"
                accessibilityLabel={`${copy.heroLineOne} ${copy.heroLineTwo}`}
                nativeID="hero-line"
                style={styles.animatedHeading}
              >
                <StaggeredLine
                  text={copy.heroLineOne}
                  delay={450}
                  reduceMotion={reduceMotion}
                  style={[
                    styles.heroLine,
                    isCompact && styles.heroLineCompact,
                    fontsLoaded && (locale === 'el' ? styles.interSemibold : styles.barlow),
                  ]}
                />
                <StaggeredLine
                  text={copy.heroLineTwo}
                  delay={850}
                  reduceMotion={reduceMotion}
                  style={[
                    styles.heroLine,
                    isCompact && styles.heroLineCompact,
                    styles.heroAccent,
                    fontsLoaded && (locale === 'el' ? styles.interSemibold : styles.barlow),
                  ]}
                />
              </View>
              <Reveal delay={1_300} reduceMotion={reduceMotion}>
                <Text
                  style={[
                    styles.intro,
                    isCompact && styles.introCompact,
                    fontsLoaded && styles.interRegular,
                  ]}
                >
                  {copy.intro}
                </Text>
              </Reveal>
              <Reveal delay={1_500} reduceMotion={reduceMotion}>
                <View style={[styles.actions, isCompact && styles.actionsCompact]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={copy.landingGetStarted}
                    nativeID="landing-cta"
                    onPress={() => router.push('/sign-in' as Href)}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      isCompact && styles.primaryButtonCompact,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.primaryButtonText,
                        isCompact && styles.primaryButtonTextCompact,
                        fontsLoaded && styles.interSemibold,
                      ]}
                    >
                      {copy.landingGetStarted}
                    </Text>
                    <Animated.Text
                      {...(Platform.OS === 'web'
                        ? {}
                        : {
                            accessibilityElementsHidden: true,
                            importantForAccessibility: 'no' as const,
                          })}
                      style={[
                        styles.buttonArrow,
                        isCompact && styles.buttonArrowCompact,
                        { transform: [{ translateX: arrowX }] },
                      ]}
                    >
                      →
                    </Animated.Text>
                    <Animated.View
                      {...(Platform.OS === 'web'
                        ? {}
                        : {
                            accessibilityElementsHidden: true,
                            importantForAccessibility: 'no-hide-descendants' as const,
                          })}
                      pointerEvents="none"
                      style={[
                        styles.buttonShine,
                        { transform: [{ translateX: shineX }, { skewX: '-20deg' }] },
                      ]}
                    />
                  </Pressable>
                </View>
              </Reveal>
            </View>

            <Reveal
              nativeID="match-preview"
              delay={1_900}
              reduceMotion={reduceMotion}
              style={[styles.previewWrap, isCompact && styles.previewWrapCompact]}
            >
              <View style={styles.glow} />
              <View
                nativeID="match-card"
                style={[styles.matchCard, isCompact && styles.matchCardCompact]}
              >
                <View style={[styles.previewHeader, isCompact && styles.previewHeaderCompact]}>
                  <View style={styles.exampleGameLabel}>
                    <PulseDot color={colors.primaryButton} reduceMotion={reduceMotion} />
                    <Text style={[styles.demoTag, fontsLoaded && styles.interSemibold]}>
                      {copy.demoExampleGame}
                    </Text>
                  </View>
                  <View nativeID="demo-pitch-chip" style={styles.pitchBadge}>
                    <Text style={styles.pitchBadgeText}>5v5</Text>
                  </View>
                </View>
                <View
                  nativeID="demo-pitch"
                  style={[styles.pitch, isCompact && styles.pitchCompact]}
                >
                  <View nativeID="demo-pitch-boundary" style={styles.pitchBoundary} />
                  <View nativeID="demo-pitch-halfway" style={styles.pitchLineVertical} />
                  <View nativeID="demo-pitch-center-circle" style={styles.pitchCenterCircle} />
                  <View style={styles.pitchBoxLeft} />
                  <View style={styles.pitchBoxRight} />
                  <View style={styles.pitchDot} />
                  <DemoPlayerMovement
                    accent={colors.primaryButton}
                    accentText={colors.primaryButtonText}
                    opponent={colors.textPrimary}
                    opponentText={
                      colors.textPrimary.toLowerCase() === '#ffffff' ? '#101510' : '#FFFFFF'
                    }
                    labels={{
                      goalkeeper: copy.demoGoalkeeper,
                      defender: copy.demoDefender,
                      midfielder: copy.demoMidfielder,
                      playerMidfielder: copy.demoPlayerMidfielder,
                      striker: copy.demoStriker,
                      placeTaken: copy.demoPlaceTaken,
                      goal: copy.demoGoal,
                      pitchAccessibility: copy.demoPitchAccessibility,
                    }}
                    reduceMotion={reduceMotion}
                    onPlaceTakenChange={handlePlaceTakenChange}
                  />
                </View>
                <View style={[styles.matchDetails, isCompact && styles.matchDetailsCompact]}>
                  <Text style={[styles.matchTitle, fontsLoaded && styles.interSemibold]}>
                    {copy.demoTitle}
                  </Text>
                  <Text style={[styles.matchLocation, fontsLoaded && styles.interRegular]}>
                    {copy.demoLocation}
                  </Text>
                  <View style={[styles.cardDivider, isCompact && styles.cardDividerCompact]} />
                  <View style={styles.matchFooter}>
                    <Text style={[styles.matchTime, fontsLoaded && styles.interRegular]}>
                      {copy.demoTime}
                    </Text>
                    <View style={styles.openSpots}>
                      <PulseDot color={colors.primaryButton} reduceMotion={reduceMotion} />
                      <AnimatedCount
                        text={placeTaken ? copy.demoOnePlaceOpen : copy.demoAvailability}
                        reduceMotion={reduceMotion}
                        style={[styles.openSpotsText, fontsLoaded && styles.interSemibold]}
                      />
                    </View>
                  </View>
                </View>
              </View>
              <Reveal delay={2_200} reduceMotion={reduceMotion}>
                <Text style={[styles.disclaimer, fontsLoaded && styles.interRegular]}>
                  {copy.demoLabel} · {copy.demoTitle}
                </Text>
              </Reveal>
            </Reveal>
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
        <LegalLinks compact />
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) => {
  const colors = {
    background: theme.background,
    surface: theme.surface,
    lime: theme.primaryButton,
    white: theme.textPrimary,
    secondary: theme.textSecondary,
    muted: theme.textMuted,
    border: theme.border,
  };
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background },
    pageContent: { flexGrow: 1, alignItems: 'center' },
    shell: {
      position: 'relative',
      width: '100%',
      maxWidth: 1240,
      paddingHorizontal: 32,
      paddingTop: 12,
    },
    shellCompact: { paddingHorizontal: 20, paddingTop: 40 },
    foreground: { position: 'relative', zIndex: 1, flexGrow: 1 },
    topBar: {
      minHeight: 92,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    topBarCompact: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 8 },
    controlsReveal: { flex: 1, alignItems: 'flex-end' },
    topControls: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 16,
    },
    topControlsCompact: { flex: 1, flexWrap: 'nowrap', justifyContent: 'flex-end', gap: 4 },
    location: { color: colors.muted, fontSize: 10, letterSpacing: 1.5 },
    hero: {
      minHeight: 620,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 52,
      paddingVertical: 58,
    },
    heroCompact: {
      flexGrow: 1,
      minHeight: 0,
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      gap: 24,
      paddingVertical: 24,
    },
    heroCopy: { flex: 1, alignItems: 'flex-start' },
    heroCopyCompact: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 20 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime },
    eyebrow: { color: colors.muted, fontSize: 11, letterSpacing: 1.8 },
    eyebrowRowCompact: { marginBottom: 14 },
    animatedHeading: { alignSelf: 'stretch' },
    heroLine: { color: colors.white, fontSize: 64, lineHeight: 66 },
    heroLineCompact: { fontSize: 38, lineHeight: 40 },
    heroAccent: { color: theme.accentText },
    intro: { maxWidth: 455, color: colors.secondary, fontSize: 16, lineHeight: 26, marginTop: 20 },
    introCompact: { fontSize: 14, lineHeight: 21, marginTop: 14 },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 28,
    },
    actionsCompact: { width: '100%', alignItems: 'flex-start', marginTop: 18 },
    primaryButton: {
      minHeight: 46,
      paddingHorizontal: 20,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.lime,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
    },
    primaryButtonCompact: { maxWidth: '100%', minWidth: 0, paddingHorizontal: 14, gap: 8 },
    primaryButtonText: { color: theme.primaryButtonText, fontSize: 16 },
    primaryButtonTextCompact: { flexShrink: 1, textAlign: 'center' },
    buttonArrow: {
      color: theme.primaryButtonText,
      fontSize: 20,
      lineHeight: 22,
      fontWeight: '700',
    },
    buttonArrowCompact: { flexShrink: 0 },
    buttonShine: {
      position: 'absolute',
      top: -8,
      bottom: -8,
      left: 0,
      width: 36,
      backgroundColor: 'rgba(255,255,255,0.45)',
    },
    buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
    previewWrap: {
      flex: 1,
      minWidth: 0,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewWrapCompact: {
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 0,
      justifyContent: 'flex-start',
    },
    glow: {
      position: 'absolute',
      width: 300,
      height: 300,
      borderRadius: 160,
      backgroundColor: '#22351B',
      opacity: 0.6,
    },
    matchCard: {
      width: '100%',
      maxWidth: 470,
      padding: 12,
      borderRadius: 28,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000000',
      shadowOpacity: 0.28,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 12 },
      elevation: 5,
    },
    matchCardCompact: {
      flexGrow: 1,
      justifyContent: 'space-between',
      padding: 10,
      borderRadius: 24,
    },
    previewHeader: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    previewHeaderCompact: { marginBottom: 8 },
    exampleGameLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    demoTag: { color: theme.accentText, fontSize: 14, fontWeight: '600' },
    pitch: {
      width: '100%',
      aspectRatio: 340 / 220,
      minHeight: 165,
      borderRadius: 18,
      backgroundColor: '#27402F',
      overflow: 'hidden',
      position: 'relative',
    },
    pitchCompact: {
      width: '96%',
      alignSelf: 'center',
      aspectRatio: 1.9,
      flexGrow: 1,
      minHeight: 150,
      maxHeight: 195,
      borderRadius: 15,
    },
    pitchBoundary: {
      position: 'absolute',
      top: 8,
      right: 8,
      bottom: 8,
      left: 8,
      borderWidth: 1,
      borderColor: '#6F9A7C',
      borderRadius: 6,
      opacity: 0.75,
    },
    pitchLineVertical: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: '50%',
      width: 1,
      backgroundColor: '#789176',
      opacity: 0.6,
    },
    pitchCenterCircle: {
      position: 'absolute',
      width: 60,
      height: 60,
      left: '50%',
      top: '50%',
      marginLeft: -30,
      marginTop: -30,
      borderRadius: 30,
      borderWidth: 1,
      borderColor: '#6F9A7C',
      opacity: 0.8,
    },
    pitchBoxLeft: {
      position: 'absolute',
      top: '29%',
      left: 0,
      width: '13%',
      height: '42%',
      borderWidth: 1,
      borderColor: '#6F9A7C',
      borderLeftWidth: 0,
    },
    pitchBoxRight: {
      position: 'absolute',
      top: '29%',
      right: 0,
      width: '13%',
      height: '42%',
      borderWidth: 1,
      borderColor: '#6F9A7C',
      borderRightWidth: 0,
    },
    pitchDot: {
      position: 'absolute',
      width: 5,
      height: 5,
      left: '50%',
      top: '50%',
      marginLeft: -2.5,
      marginTop: -2.5,
      backgroundColor: '#6F9A7C',
      borderRadius: 4,
    },
    pitchBadge: {
      minWidth: 48,
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: colors.lime,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pitchBadgeText: {
      color: theme.primaryButtonText,
      fontSize: 18,
      lineHeight: 20,
      fontWeight: '800',
    },
    matchDetails: { paddingTop: 18 },
    matchDetailsCompact: { paddingTop: 12 },
    matchTitle: { color: colors.white, fontSize: 19 },
    matchLocation: { color: colors.secondary, fontSize: 13, marginTop: 5 },
    cardDivider: { height: 1, backgroundColor: colors.border, marginVertical: 15 },
    cardDividerCompact: { marginVertical: 9 },
    matchFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    },
    matchTime: { color: colors.muted, fontSize: 12 },
    openSpots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    openSpotsText: { color: theme.accentText, fontSize: 14 },
    disclaimer: { color: colors.muted, fontSize: 10, letterSpacing: 0.8, marginTop: 12 },
    barlow: { fontFamily: 'BarlowCondensed_700Bold' },
    interRegular: { fontFamily: 'Inter_400Regular' },
    interSemibold: { fontFamily: 'Inter_600SemiBold' },
  });
};

type RevealProps = PropsWithChildren<{
  delay: number;
  reduceMotion: boolean;
  nativeID?: string;
  style?: StyleProp<ViewStyle>;
  variant?: 'fade' | 'pop';
}>;

function Reveal({ children, delay, reduceMotion, nativeID, style, variant = 'fade' }: RevealProps) {
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      progress.stopAnimation();
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: variant === 'pop' ? 800 : 900,
      easing: variant === 'pop' ? Easing.out(Easing.back(1.1)) : Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduceMotion, variant]);

  const animatedStyle = {
    opacity: progress,
    transform:
      variant === 'pop'
        ? [
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ['-25deg', '0deg'],
              }),
            },
          ]
        : [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  return (
    <Animated.View nativeID={nativeID} style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

function StaggeredLine({
  text,
  delay,
  reduceMotion,
  style,
}: {
  text: string;
  delay: number;
  reduceMotion: boolean;
  style: StyleProp<TextStyle>;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {Array.from(text).map((character, index) => (
        <StaggeredGlyph
          key={`${index}-${character}`}
          character={character === ' ' ? '\u00a0' : character}
          delay={delay + index * 32}
          reduceMotion={reduceMotion}
          style={style}
        />
      ))}
    </View>
  );
}

function StaggeredGlyph({
  character,
  delay,
  reduceMotion,
  style,
}: {
  character: string;
  delay: number;
  reduceMotion: boolean;
  style: StyleProp<TextStyle>;
}) {
  const [progress] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));

  useEffect(() => {
    if (reduceMotion) {
      progress.stopAnimation();
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      delay,
      duration: 520,
      easing: Easing.out(Easing.back(1.05)),
      useNativeDriver: USE_NATIVE_DRIVER,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduceMotion]);

  return (
    <Animated.Text
      {...(Platform.OS === 'web'
        ? {}
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no' as const,
          })}
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            {
              rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['12deg', '0deg'] }),
            },
          ],
        },
      ]}
    >
      {character}
    </Animated.Text>
  );
}

function PulseDot({ color, reduceMotion }: { color: string; reduceMotion: boolean }) {
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return (
    <Animated.View
      {...(Platform.OS === 'web'
        ? {}
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no' as const,
          })}
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }),
      }}
    />
  );
}

function AnimatedCount({
  text,
  reduceMotion,
  style,
}: {
  text: string;
  reduceMotion: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const [opacity] = useState(() => new Animated.Value(1));
  const previousText = useRef(text);

  useEffect(() => {
    if (reduceMotion) {
      opacity.stopAnimation();
      opacity.setValue(1);
      previousText.current = text;
      return;
    }
    if (previousText.current === text) return;
    previousText.current = text;
    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: USE_NATIVE_DRIVER }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion, text]);

  return <Animated.Text style={[style, { opacity }]}>{text}</Animated.Text>;
}
