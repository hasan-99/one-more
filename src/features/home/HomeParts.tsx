import { Link, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useLoop, useReducedMotion } from '@/components/motion';
import { Crest, crestInitials } from '@/features/teams/TeamCrest';
import type { MyTeam } from '@/features/teams/team-service';
import { translations } from '@/i18n';
import { formatLocalNumber, matchTicketParts } from '@/i18n/format';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import type { HomeMatch } from './home-logic';
import { PressLink } from './PressLink';

const lineHeight = 20;

/** The greeting with a small line of true facts that changes every few seconds. */
export function HomeGreeting({ greeting, lines }: { greeting: string; lines: string[] }) {
  const { colors, locale } = useAppPreferences();
  const [index, setIndex] = useState(0);
  const [offset] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const pulse = useLoop(800, { alternate: true });
  const shown = index % lines.length;

  useEffect(() => {
    if (lines.length < 2) return;
    const timer = setInterval(() => setIndex((value) => value + 1), 2800);
    return () => clearInterval(timer);
  }, [lines.length]);

  useEffect(() => {
    const animation = Animated.timing(offset, {
      toValue: -shown * lineHeight,
      duration: reduced ? 0 : 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [offset, reduced, shown]);

  return (
    <View style={styles.greetingRow}>
      <Text
        numberOfLines={1}
        style={[styles.greeting, { color: colors.textPrimary, fontFamily: displayFont(locale) }]}
      >
        {greeting}
      </Text>
      <View
        accessible
        accessibilityLabel={lines[shown]}
        style={[styles.ticker, { borderColor: colors.border, backgroundColor: colors.surface }]}
      >
        <Animated.View
          style={[
            styles.liveDot,
            {
              backgroundColor: colors.accentText,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }),
            },
          ]}
        />
        <View style={styles.tickerWindow}>
          <Animated.View style={{ transform: [{ translateY: offset }] }}>
            {lines.map((line) => (
              <Text
                key={line}
                numberOfLines={1}
                style={[
                  styles.tickerLine,
                  { color: colors.textPrimary, fontFamily: bodyFont(locale, 'semibold') },
                ]}
              >
                {line}
              </Text>
            ))}
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

/** One line for the thing that is waiting on the player. */
export function HomeNeedBar({
  title,
  subtitle,
  action,
  href,
  onPress,
  tone = 'attention',
}: {
  title: string;
  subtitle?: string;
  action: string;
  href?: Href;
  onPress?: () => void;
  tone?: 'attention' | 'error';
}) {
  const { colors, locale } = useAppPreferences();
  const [wiggle] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.sequence([
      Animated.delay(900),
      Animated.loop(
        Animated.sequence([
          Animated.timing(wiggle, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: -1, duration: 240, useNativeDriver: true }),
          Animated.timing(wiggle, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]),
        { iterations: 2 },
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [reduced, wiggle]);
  const iconColor = tone === 'error' ? colors.errorText : colors.warningText;
  const buttonText = (
    <Text
      style={[
        styles.needButtonText,
        { color: colors.accentText, fontFamily: bodyFont(locale, 'semibold') },
      ]}
    >
      {action}
    </Text>
  );
  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      testID="home-need"
      style={[styles.need, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}
    >
      <Animated.View
        style={[
          styles.needIcon,
          {
            borderColor: iconColor,
            transform: [
              {
                rotate: wiggle.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-14deg', '14deg'],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Circle cx="9" cy="14" r="5" stroke={iconColor} strokeWidth="1.8" />
          <Path
            d="M13 11h8v4h-7M9 9V5"
            stroke={iconColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>
      <View style={styles.needCopy}>
        <Text
          style={[
            styles.needTitle,
            { color: colors.textPrimary, fontFamily: bodyFont(locale, 'semibold') },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={2}
            style={[styles.needSub, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {href ? (
        <PressLink href={href} style={[styles.needButton, { borderColor: colors.accentText }]}>
          {buttonText}
        </PressLink>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={({ pressed }) => [
            styles.needButton,
            { borderColor: colors.accentText },
            pressed && styles.pressed,
          ]}
        >
          {buttonText}
        </Pressable>
      )}
    </View>
  );
}

export function HomeSectionHead({
  eyebrow,
  title,
  link,
}: {
  eyebrow: string;
  title: string;
  link?: { label: string; href: Href };
}) {
  const { colors, locale } = useAppPreferences();
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionCopy}>
        <Text
          style={[
            styles.sectionEyebrow,
            { color: colors.accentText, fontFamily: bodyFont(locale, 'semibold') },
          ]}
        >
          {eyebrow}
        </Text>
        <Text
          accessibilityRole="header"
          style={[
            styles.sectionTitle,
            { color: colors.textPrimary, fontFamily: displayFont(locale) },
          ]}
        >
          {title}
        </Text>
      </View>
      {link ? (
        <Link href={link.href} accessibilityRole="link" style={styles.sectionLink}>
          <Text
            style={[
              styles.sectionLinkText,
              { color: colors.accentText, fontFamily: bodyFont(locale, 'semibold') },
            ]}
          >
            {link.label}
          </Text>
        </Link>
      ) : null}
    </View>
  );
}

const tileIcons: Record<string, (color: string) => ReactNode> = {
  find: (c) => (
    <>
      <Circle cx="11" cy="11" r="7" stroke={c} strokeWidth="1.8" />
      <Path d="M21 21l-4.3-4.3" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  create: (c) => <Path d="M12 5v14M5 12h14" stroke={c} strokeWidth="2.2" strokeLinecap="round" />,
  challenges: (c) => (
    <Path
      d="M4 4l9 9M4 4v4M4 4h4M20 4l-9 9M20 4v4M20 4h-4M9 13l-4 4M15 13l4 4M6 16l-2 4M18 16l2 4"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  teams: (c) => (
    <Path
      d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"
      stroke={c}
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  ),
  alerts: (c) => (
    <Path
      d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21a2 2 0 0 0 4 0"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  settings: (c) => (
    <>
      <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth="1.8" />
      <Path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.100 2.100M16.300 16.300l2.100 2.100M18.400 5.600l-2.100 2.100M7.700 16.300l-2.100 2.100"
        stroke={c}
        strokeWidth="1.800"
        strokeLinecap="round"
      />
    </>
  ),
};

/** Six shortcuts in a plain grid. The create tile is the bright one. */
export function HomeTiles({ unread }: { unread: number }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const tiles: { id: string; label: string; href: string; primary?: boolean; badge?: number }[] = [
    { id: 'find', label: copy.homeTileFind, href: '/explore' },
    { id: 'create', label: copy.homeTileCreate, href: '/create', primary: true },
    { id: 'challenges', label: copy.homeTileChallenges, href: '/challenges' },
    { id: 'teams', label: copy.homeTileTeams, href: '/teams' },
    { id: 'alerts', label: copy.homeTileAlerts, href: '/notifications', badge: unread },
    { id: 'settings', label: copy.homeTileSettings, href: '/settings' },
  ];
  return (
    <View style={styles.tiles}>
      {tiles.map((tile) => {
        const ink = tile.primary ? colors.primaryButtonText : colors.accentText;
        return (
          <PressLink
            key={tile.id}
            href={tile.href as Href}
            label={
              tile.badge ? `${tile.label}, ${tile.badge > 99 ? '99+' : tile.badge}` : tile.label
            }
            testID={`home-tile-${tile.id}`}
            style={[
              styles.tile,
              tile.primary
                ? { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton }
                : { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              {tileIcons[tile.id](ink)}
            </Svg>
            <Text
              numberOfLines={2}
              style={[
                styles.tileText,
                {
                  color: tile.primary ? colors.primaryButtonText : colors.textPrimary,
                  fontFamily: bodyFont(locale, 'semibold'),
                },
              ]}
            >
              {tile.label}
            </Text>
            {tile.badge ? (
              <View style={[styles.tileBadge, { borderColor: colors.surface }]}>
                <Text style={styles.tileBadgeText}>{tile.badge > 99 ? '99+' : tile.badge}</Text>
              </View>
            ) : null}
          </PressLink>
        );
      })}
    </View>
  );
}

/** Open games you swipe through sideways. */
export function HomeGameRail({ games }: { games: HomeMatch[] }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={260}
      decelerationRate="fast"
      style={styles.rail}
      contentContainerStyle={styles.railContent}
    >
      {games.map((game) => {
        const parts = matchTicketParts(game.startsAt, locale);
        const area = locale === 'el' ? game.areaNameEl : game.areaNameEn;
        const city = locale === 'el' ? game.cityNameEl : game.cityNameEn;
        const last = game.freeSpots === 1;
        const open = last
          ? copy.homePlaceOpen
          : copy.homePlacesOpen.replace('{count}', String(game.freeSpots));
        return (
          <PressLink
            key={game.id}
            href={`/matches/${game.id}` as Href}
            label={`${game.sideSize}v${game.sideSize} ${game.title}, ${parts.weekday} ${parts.day} ${parts.month} ${parts.time}, ${open}`}
            testID="home-rail-card"
            style={[styles.game, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.gameMain}>
              <Text
                style={[
                  styles.gameFormat,
                  { color: colors.accentText, fontFamily: displayFont(locale) },
                ]}
              >
                {game.sideSize}v{game.sideSize} ·{' '}
                {game.priceEur === 0
                  ? copy.matchFree
                  : `€${formatLocalNumber(game.priceEur, locale)}`}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.gameName,
                  { color: colors.textPrimary, fontFamily: displayFont(locale) },
                ]}
              >
                {game.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.gameMeta,
                  { color: colors.textSecondary, fontFamily: bodyFont(locale) },
                ]}
              >
                {area} · {city}
              </Text>
              <Text
                style={[
                  styles.gameOpen,
                  {
                    color: last ? colors.warningText : colors.accentText,
                    fontFamily: bodyFont(locale, 'semibold'),
                  },
                ]}
              >
                {open}
              </Text>
            </View>
            <View style={[styles.gameStub, { borderLeftColor: colors.border }]}>
              <Text style={[styles.gameDay, { fontFamily: bodyFont(locale, 'semibold') }]}>
                {parts.weekday.toUpperCase()} {parts.day}
              </Text>
              <Text style={[styles.gameTime, { fontFamily: displayFont(locale) }]}>
                {parts.time}
              </Text>
              <Text style={[styles.gameDay, { fontFamily: bodyFont(locale, 'semibold') }]}>
                {copy.homeKickoffLabel}
              </Text>
            </View>
            <View
              style={[
                styles.notch,
                styles.notchTop,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            />
            <View
              style={[
                styles.notch,
                styles.notchBottom,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            />
          </PressLink>
        );
      })}
    </ScrollView>
  );
}

export function HomeTeamRow({ team }: { team: MyTeam }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const role = team.role === 'captain' ? copy.homeTeamCaptain : copy.homeTeamPlayer;
  return (
    <PressLink
      href={`/teams/${team.teamId}` as Href}
      style={[styles.team, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {team.crest ? (
        <Crest {...team.crest} initials={crestInitials(team.name)} size={40} />
      ) : (
        <View style={[styles.teamMark, { borderColor: colors.accentText }]}>
          <Text style={{ color: colors.accentText, fontFamily: displayFont(locale), fontSize: 16 }}>
            {crestInitials(team.name)}
          </Text>
        </View>
      )}
      <View style={styles.needCopy}>
        <Text
          numberOfLines={1}
          style={[
            styles.teamName,
            { color: colors.textPrimary, fontFamily: bodyFont(locale, 'semibold') },
          ]}
        >
          {team.name}
        </Text>
        <Text
          style={[styles.needSub, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}
        >
          {role} · {copy.homeTeamMembers.replace('{count}', String(team.memberCount))}
        </Text>
      </View>
      <Text aria-hidden style={{ color: colors.accentText, fontSize: 18 }}>
        →
      </Text>
    </PressLink>
  );
}

const styles = StyleSheet.create({
  pressed: { transform: [{ scale: 0.97 }] },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 24, lineHeight: 28, fontWeight: '800', flexShrink: 1 },
  ticker: {
    flex: 1,
    minWidth: 120,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  tickerWindow: { flex: 1, height: lineHeight, overflow: 'hidden' },
  tickerLine: { height: lineHeight, lineHeight, fontSize: 12.5 },
  need: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  needIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needCopy: { flex: 1, minWidth: 0, gap: 2 },
  needTitle: { fontSize: 14, lineHeight: 19 },
  needSub: { fontSize: 12.5, lineHeight: 17 },
  needButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needButtonText: { fontSize: 14 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionEyebrow: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 28, lineHeight: 31, fontWeight: '800' },
  sectionLink: { minHeight: 44, justifyContent: 'center', paddingLeft: 8 },
  sectionLinkText: { fontSize: 14 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  tileText: { fontSize: 12.5, lineHeight: 16, textAlign: 'center' },
  tileBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 4,
    backgroundColor: '#E5352B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', lineHeight: 14 },
  rail: { marginHorizontal: -20 },
  railContent: { paddingHorizontal: 20, gap: 12 },
  // Each open game is a small match ticket with a tear-off stub for the kick-off time.
  game: { width: 248, borderWidth: 1, borderRadius: 18, flexDirection: 'row', overflow: 'hidden' },
  gameMain: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 12,
    gap: 5,
  },
  gameFormat: { fontSize: 18, lineHeight: 20, fontWeight: '800' },
  gameName: { fontSize: 21, lineHeight: 24, fontWeight: '800' },
  gameMeta: { fontSize: 12.5 },
  gameOpen: { fontSize: 12.5 },
  gameStub: {
    width: 78,
    backgroundColor: '#070B09',
    borderLeftWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  gameTime: {
    color: '#CFFF4A',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gameDay: { color: '#B9C4B4', fontSize: 10, letterSpacing: 1.2 },
  notch: {
    position: 'absolute',
    right: 70,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  notchTop: { top: -9 },
  notchBottom: { bottom: -9 },
  team: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    minHeight: 68,
  },
  teamMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: { fontSize: 15 },
});
