import { useFonts } from 'expo-font';
import { router, type Href } from 'expo-router';
import { useMemo, useRef, useState, type ElementRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { PreferenceSwitchers } from '@/components/preferences-switchers';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import type { ThemeColors } from '@/theme/tokens';

export default function LandingScreen() {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [fontsLoaded] = useFonts({
    BarlowCondensed_700Bold: require('@/assets/fonts/BarlowCondensed-Bold.ttf'),
    Inter_400Regular: require('@/assets/fonts/Inter-Regular.ttf'),
    Inter_600SemiBold: require('@/assets/fonts/Inter-SemiBold.ttf'),
  });
  const { width } = useWindowDimensions();
  const isCompact = Platform.OS !== 'web' && width < 760;
  const scrollRef = useRef<ElementRef<typeof ScrollView>>(null);
  const [howOffset, setHowOffset] = useState(0);

  const scrollTo = (offset: number) => {
    scrollRef.current?.scrollTo({ y: offset, animated: true });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator={false}
    >
      <View nativeID="page-shell" style={[styles.shell, isCompact && styles.shellCompact]}>
        <View style={styles.topBar}>
          <BrandMark fontsLoaded={fontsLoaded} />
          <View style={styles.topControls}>
            <Text style={[styles.location, fontsLoaded && styles.interSemibold]}>
              {copy.locationLabel}
            </Text>
            <PreferenceSwitchers />
          </View>
        </View>

        <View nativeID="landing-hero" style={[styles.hero, isCompact && styles.heroCompact]}>
          <View nativeID="hero-copy" style={styles.heroCopy}>
            <View style={styles.eyebrowRow}>
              <View style={styles.liveDot} />
              <Text style={[styles.eyebrow, fontsLoaded && styles.interSemibold]}>
                {copy.eyebrow}
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              nativeID="hero-title"
              style={[
                styles.heroTitle,
                isCompact && styles.heroTitleCompact,
                fontsLoaded && styles.barlow,
              ]}
            >
              {copy.heroTitle}
            </Text>
            <Text
              nativeID="hero-line"
              style={[
                styles.heroLine,
                isCompact && styles.heroLineCompact,
                fontsLoaded && (locale === 'el' ? styles.interSemibold : styles.barlow),
              ]}
            >
              {copy.heroLineOne}
              {'\n'}
              <Text style={styles.heroAccent}>{copy.heroLineTwo}</Text>
            </Text>
            <Text style={[styles.intro, fontsLoaded && styles.interRegular]}>{copy.intro}</Text>
            <View style={[styles.actions, isCompact && styles.actionsCompact]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.primaryCta}
                onPress={() => router.push('/explore' as Href)}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={[styles.primaryButtonText, fontsLoaded && styles.interSemibold]}>
                  {copy.primaryCta}
                </Text>
                <Text style={styles.buttonArrow} accessibilityElementsHidden>
                  ↗
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.secondaryCta}
                onPress={() => scrollTo(howOffset)}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryPressed,
                ]}
              >
                <Text style={[styles.secondaryButtonText, fontsLoaded && styles.interSemibold]}>
                  {copy.secondaryCta}
                </Text>
              </Pressable>
            </View>
          </View>

          <View nativeID="match-preview" style={styles.previewWrap}>
            <View style={styles.glow} />
            <View style={styles.matchCard}>
              <View style={styles.previewHeader}>
                <Text style={[styles.demoTag, fontsLoaded && styles.interSemibold]}>
                  {copy.demoLabel}
                </Text>
                <View style={styles.cardMenu} accessibilityElementsHidden>
                  <View style={styles.menuDot} />
                  <View style={styles.menuDot} />
                  <View style={styles.menuDot} />
                </View>
              </View>
              <View style={styles.pitch}>
                <View style={styles.pitchLineVertical} />
                <View style={styles.pitchCenterCircle} />
                <View style={styles.pitchBoxLeft} />
                <View style={styles.pitchBoxRight} />
                <View style={styles.pitchDot} />
                <View style={styles.pitchBadge}>
                  <Text style={styles.pitchBadgeText}>5v5</Text>
                </View>
              </View>
              <View style={styles.matchDetails}>
                <Text style={[styles.matchTitle, fontsLoaded && styles.interSemibold]}>
                  {copy.demoTitle}
                </Text>
                <Text style={[styles.matchLocation, fontsLoaded && styles.interRegular]}>
                  {copy.demoLocation}
                </Text>
                <View style={styles.cardDivider} />
                <View style={styles.matchFooter}>
                  <Text style={[styles.matchTime, fontsLoaded && styles.interRegular]}>
                    {copy.demoTime}
                  </Text>
                  <View style={styles.openSpots}>
                    <View style={styles.spotDot} />
                    <Text style={[styles.openSpotsText, fontsLoaded && styles.interSemibold]}>
                      {copy.demoAvailability}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <Text style={[styles.disclaimer, fontsLoaded && styles.interRegular]}>
              {copy.demoLabel} · {copy.demoTitle}
            </Text>
          </View>
        </View>

        <View
          onLayout={(event) => setHowOffset(event.nativeEvent.layout.y)}
          style={styles.howSection}
        >
          <View style={styles.sectionHeading}>
            <Text
              nativeID="section-title"
              style={[
                styles.sectionTitle,
                isCompact && styles.sectionTitleCompact,
                fontsLoaded && (locale === 'el' ? styles.interSemibold : styles.barlow),
              ]}
            >
              {copy.howTitle}
            </Text>
            <Text style={[styles.sectionIntro, fontsLoaded && styles.interRegular]}>
              {copy.howCopy}
            </Text>
          </View>
          <View nativeID="steps" style={[styles.steps, isCompact && styles.stepsCompact]}>
            {[copy.stepOne, copy.stepTwo, copy.stepThree].map((step, index) => (
              <View key={step} nativeID={`step-${index + 1}`} style={styles.step}>
                <Text style={[styles.stepNumber, fontsLoaded && styles.barlow]}>0{index + 1}</Text>
                <Text style={[styles.stepText, fontsLoaded && styles.interSemibold]}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <BrandMark fontsLoaded={fontsLoaded} subtitle={copy.footer} />
          <Text style={[styles.footerNote, fontsLoaded && styles.interRegular]}>{copy.city}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (theme: ThemeColors) => {
  const colors = {
    background: theme.background,
    surface: theme.surface,
    raised: theme.surfaceRaised,
    lime: theme.primaryButton,
    white: theme.textPrimary,
    secondary: theme.textSecondary,
    muted: theme.textMuted,
    border: theme.border,
  };
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background },
    pageContent: { flexGrow: 1, alignItems: 'center' },
    shell: { width: '100%', maxWidth: 1240, paddingHorizontal: 32 },
    shellCompact: { paddingHorizontal: 20 },
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
    topControls: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 16,
    },
    location: { color: colors.muted, fontSize: 10, letterSpacing: 1.5 },
    hero: {
      minHeight: 620,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 52,
      paddingVertical: 58,
    },
    heroCompact: {
      minHeight: 0,
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 44,
      paddingTop: 58,
      paddingBottom: 48,
    },
    heroCopy: { flex: 1, alignItems: 'flex-start' },
    eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 20 },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime },
    eyebrow: { color: colors.muted, fontSize: 11, letterSpacing: 1.8 },
    heroTitle: { color: colors.white, fontSize: 100, lineHeight: 96, letterSpacing: -1.5 },
    heroTitleCompact: { fontSize: 72, lineHeight: 70 },
    heroLine: { color: colors.white, fontSize: 57, lineHeight: 59, marginTop: 5 },
    heroLineCompact: { fontSize: 44, lineHeight: 46 },
    heroAccent: { color: theme.accentText },
    intro: { maxWidth: 455, color: colors.secondary, fontSize: 16, lineHeight: 26, marginTop: 20 },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 28,
    },
    actionsCompact: { alignItems: 'stretch' },
    primaryButton: {
      minHeight: 52,
      paddingHorizontal: 22,
      borderRadius: 12,
      backgroundColor: colors.lime,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 14,
    },
    primaryButtonText: { color: colors.background, fontSize: 14 },
    buttonArrow: { color: colors.background, fontSize: 17 },
    buttonPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
    secondaryButton: {
      minHeight: 52,
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderRadius: 12,
    },
    secondaryButtonText: { color: colors.white, fontSize: 13 },
    secondaryPressed: { backgroundColor: colors.surface },
    previewWrap: {
      flex: 1,
      minWidth: 0,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
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
      padding: 18,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewHeader: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    demoTag: { color: theme.accentText, fontSize: 10, letterSpacing: 1.5 },
    cardMenu: { flexDirection: 'row', gap: 3 },
    menuDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted },
    pitch: {
      height: 200,
      borderRadius: 14,
      backgroundColor: '#263C28',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#517251',
      position: 'relative',
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
      width: 84,
      height: 84,
      left: '50%',
      top: '50%',
      marginLeft: -42,
      marginTop: -42,
      borderRadius: 42,
      borderWidth: 1,
      borderColor: '#789176',
      opacity: 0.8,
    },
    pitchBoxLeft: {
      position: 'absolute',
      top: '25%',
      left: 0,
      width: 48,
      height: '50%',
      borderWidth: 1,
      borderColor: '#789176',
      borderLeftWidth: 0,
    },
    pitchBoxRight: {
      position: 'absolute',
      top: '25%',
      right: 0,
      width: 48,
      height: '50%',
      borderWidth: 1,
      borderColor: '#789176',
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
      backgroundColor: colors.lime,
      borderRadius: 4,
    },
    pitchBadge: {
      position: 'absolute',
      top: 15,
      left: 15,
      paddingVertical: 5,
      paddingHorizontal: 9,
      borderRadius: 7,
      backgroundColor: colors.lime,
    },
    pitchBadgeText: { color: colors.background, fontSize: 11, fontWeight: '800' },
    matchDetails: { paddingTop: 18 },
    matchTitle: { color: colors.white, fontSize: 19 },
    matchLocation: { color: colors.secondary, fontSize: 13, marginTop: 5 },
    cardDivider: { height: 1, backgroundColor: colors.border, marginVertical: 15 },
    matchFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
    },
    matchTime: { color: colors.muted, fontSize: 12 },
    openSpots: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    spotDot: { width: 6, height: 6, borderRadius: 4, backgroundColor: colors.lime },
    openSpotsText: { color: theme.accentText, fontSize: 11 },
    disclaimer: { color: '#71806F', fontSize: 10, letterSpacing: 0.8, marginTop: 12 },
    howSection: { borderTopWidth: 1, borderTopColor: '#283328', paddingTop: 56, paddingBottom: 58 },
    sectionHeading: { maxWidth: 630 },
    sectionTitle: { color: colors.white, fontSize: 46, lineHeight: 50 },
    sectionTitleCompact: { fontSize: 38, lineHeight: 42 },
    sectionIntro: { color: colors.secondary, fontSize: 15, lineHeight: 24, marginTop: 12 },
    steps: {
      flexDirection: 'row',
      marginTop: 35,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    stepsCompact: { flexDirection: 'column' },
    step: {
      flex: 1,
      minHeight: 94,
      paddingTop: 18,
      paddingRight: 16,
      borderRightWidth: 1,
      borderRightColor: '#283328',
    },
    stepNumber: { color: theme.accentText, fontSize: 23 },
    stepText: { color: colors.white, fontSize: 13, marginTop: 8 },
    footer: {
      minHeight: 104,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#283328',
      paddingVertical: 20,
    },
    footerNote: { color: colors.muted, fontSize: 12 },
    barlow: { fontFamily: 'BarlowCondensed_700Bold' },
    interRegular: { fontFamily: 'Inter_400Regular' },
    interSemibold: { fontFamily: 'Inter_600SemiBold' },
  });
};
