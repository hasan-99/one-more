import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function AppHomeScreen() {
  const { locale, colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const copy = translations[locale];
  const styles = makeStyles(colors);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={StyleSheet.flatten([
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 112 },
        ])}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.eyebrow}>
            <View style={[styles.liveDot, { backgroundColor: colors.accentText }]} />
            <Text style={[styles.eyebrowText, { color: colors.textSecondary }]}>
              {copy.appHomeEyebrow}
            </Text>
          </View>
          <Text style={[styles.cityPill, { color: colors.accentText, borderColor: colors.border }]}>
            {copy.appCityLabel}
          </Text>
        </View>

        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          {copy.appHomeHeroFirst}{' '}
          <Text style={{ color: colors.accentText }}>{copy.appHomeHeroAccent}</Text>
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {copy.appHomeIntro}
        </Text>

        <View
          style={[
            styles.pitchFrame,
            { backgroundColor: colors.pitch, borderColor: colors.border },
          ]}
        >
          <View style={[styles.formatBadge, { backgroundColor: colors.primaryButton }]}>
            <Text style={[styles.formatText, { color: colors.primaryButtonText }]}>5v5</Text>
          </View>
          <HomePitch
            lineColor={colors.pitchLine}
            homeColor={colors.accentText}
            awayColor={colors.pitchText}
            accessibilityLabel={copy.appHomePitchAccessibility}
          />
        </View>

        <View style={styles.actions}>
          <Link href={'/explore' as Href} asChild>
            <Pressable
              accessibilityRole="link"
              style={StyleSheet.flatten([
                styles.primaryAction,
                { backgroundColor: colors.primaryButton },
              ])}
            >
              <Text style={[styles.primaryActionText, { color: colors.primaryButtonText }]}>
                {copy.appExploreAction}
              </Text>
              <Text aria-hidden style={[styles.actionArrow, { color: colors.primaryButtonText }]}>
                →
              </Text>
            </Pressable>
          </Link>
          <Link href={'/create' as Href} asChild>
            <Pressable
              accessibilityRole="link"
              style={StyleSheet.flatten([
                styles.secondaryAction,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ])}
            >
              <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>
                {copy.appCreateAction}
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionEyebrow, { color: colors.accentText }]}>
            {copy.appHomeNextSection}
          </Text>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {copy.appUpcomingGames}
          </Text>
        </View>
        <Link href={'/explore' as Href} accessibilityRole="link" style={styles.seeAllLink}>
          <Text style={[styles.seeAllText, { color: colors.accentText }]}>
            {copy.appHomeSeeGames}
          </Text>
        </Link>
      </View>

      <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceRaised }]}>
          <HomeBallIcon color={colors.accentText} lineColor={colors.pitchLine} />
        </View>
        <View style={styles.emptyCopy}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {copy.appNoGamesTitle}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            {copy.appNoGamesCopy}
          </Text>
        </View>
        <Link href={'/explore' as Href} asChild>
          <Pressable
            accessibilityRole="link"
            style={StyleSheet.flatten([styles.inlineAction, { borderColor: colors.border }])}
          >
            <Text style={[styles.inlineActionText, { color: colors.accentText }]}>
              {copy.appHomeBrowseGames}
            </Text>
            <Text aria-hidden style={[styles.inlineArrow, { color: colors.accentText }]}>
              →
            </Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionEyebrow, { color: colors.accentText }]}>
            {copy.appHomePlayTogether}
          </Text>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {copy.appChallenges}
          </Text>
        </View>
        <Link href={'/challenges' as Href} accessibilityRole="link" style={styles.seeAllLink}>
          <Text style={[styles.seeAllText, { color: colors.accentText }]}>
            {copy.appHomeSeeAll}
          </Text>
        </Link>
      </View>

      <View style={[styles.challengeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.challengeMark, { backgroundColor: colors.success }]}>
          <Text style={[styles.challengeMarkText, { color: colors.successText }]}>VS</Text>
        </View>
        <View style={styles.emptyCopy}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {copy.appNoChallengesTitle}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            {copy.appNoChallengesCopy}
          </Text>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

function HomePitch({
  lineColor,
  homeColor,
  awayColor,
  accessibilityLabel,
}: {
  lineColor: string;
  homeColor: string;
  awayColor: string;
  accessibilityLabel: string;
}) {
  const players = [
    { x: 48, y: 50, color: homeColor },
    { x: 48, y: 126, color: homeColor },
    { x: 112, y: 88, color: homeColor },
    { x: 166, y: 50, color: awayColor },
    { x: 166, y: 126, color: awayColor },
    { x: 224, y: 88, color: awayColor },
  ];

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 272 176"
      preserveAspectRatio="none"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <Rect x="7" y="7" width="258" height="162" rx="10" fill="none" stroke={lineColor} strokeWidth="1.5" opacity="0.85" />
      <Line x1="136" y1="7" x2="136" y2="169" stroke={lineColor} strokeWidth="1.5" opacity="0.7" />
      <Circle cx="136" cy="88" r="29" fill="none" stroke={lineColor} strokeWidth="1.5" opacity="0.7" />
      <Circle cx="136" cy="88" r="2.5" fill={homeColor} />
      <Rect x="7" y="54" width="26" height="68" fill="none" stroke={lineColor} strokeWidth="1.5" opacity="0.65" />
      <Rect x="239" y="54" width="26" height="68" fill="none" stroke={lineColor} strokeWidth="1.5" opacity="0.65" />
      <Line x1="48" y1="50" x2="112" y2="88" stroke={homeColor} strokeWidth="1.5" opacity="0.7" />
      <Line x1="48" y1="126" x2="112" y2="88" stroke={homeColor} strokeWidth="1.5" opacity="0.7" />
      <Line x1="112" y1="88" x2="166" y2="50" stroke={homeColor} strokeWidth="1.5" opacity="0.7" />
      <Line x1="112" y1="88" x2="166" y2="126" stroke={homeColor} strokeWidth="1.5" opacity="0.7" />
      <Line x1="166" y1="50" x2="224" y2="88" stroke={awayColor} strokeWidth="1.5" opacity="0.55" />
      <Line x1="166" y1="126" x2="224" y2="88" stroke={awayColor} strokeWidth="1.5" opacity="0.55" />
      {players.map((player, index) => (
        <Circle key={index} cx={player.x} cy={player.y} r="7" fill={player.color} stroke={lineColor} strokeWidth="1.5" />
      ))}
      <Circle cx="148" cy="94" r="7" fill="#111712" stroke="#F2F5EC" strokeWidth="1.5" />
      <Circle cx="148" cy="94" r="2.4" fill="#F2F5EC" />
    </Svg>
  );
}

function HomeBallIcon({ color, lineColor }: { color: string; lineColor: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 28 28" fill="none" accessibilityElementsHidden>
      <Circle cx="14" cy="14" r="10.25" stroke={lineColor} strokeWidth="1.5" />
      <Circle cx="14" cy="14" r="3.4" stroke={color} strokeWidth="1.5" />
      <PathCircle color={color} cx={14} cy={4} />
      <PathCircle color={color} cx={23.5} cy={14} />
      <PathCircle color={color} cx={14} cy={24} />
      <PathCircle color={color} cx={4.5} cy={14} />
    </Svg>
  );
}

function PathCircle({ color, cx, cy }: { color: string; cx: number; cy: number }) {
  return <Circle cx={cx} cy={cy} r="1.25" fill={color} />;
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    content: {
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 22,
      gap: 22,
    },
    hero: {
      overflow: 'hidden',
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderRadius: 26,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
    liveDot: { width: 8, height: 8, borderRadius: 4 },
    eyebrowText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5 },
    cityPill: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7, fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.7 },
    title: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 38, lineHeight: 42, fontWeight: '700' },
    description: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23, marginTop: -8 },
    pitchFrame: { height: 180, overflow: 'hidden', borderWidth: 1, borderRadius: 18, padding: 8 },
    formatBadge: { position: 'absolute', zIndex: 1, top: 14, left: 14, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
    formatText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 14, fontWeight: '700' },
    actions: { gap: 10 },
    primaryAction: { minHeight: 54, borderRadius: 15, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    primaryActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, fontWeight: '700' },
    actionArrow: { fontSize: 20, lineHeight: 22 },
    secondaryAction: { minHeight: 50, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    secondaryActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '700' },
    sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 3 },
    sectionEyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase' },
    sectionTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 26, lineHeight: 30, fontWeight: '700', marginTop: 2 },
    seeAllLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 },
    seeAllText: { fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '700' },
    emptyCard: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 14 },
    emptyIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    emptyCopy: { gap: 5 },
    emptyTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 22, lineHeight: 26, fontWeight: '700' },
    emptyDescription: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
    inlineAction: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    inlineActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, fontWeight: '700' },
    inlineArrow: { fontSize: 18 },
    challengeCard: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 14 },
    challengeMark: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    challengeMarkText: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 16, fontWeight: '700' },
  });
}
