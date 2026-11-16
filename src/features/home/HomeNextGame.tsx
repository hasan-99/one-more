import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useEntrance, useLoop, useReducedMotion } from '@/components/motion';
import { translations } from '@/i18n';
import { formatLocalNumber, matchTicketParts } from '@/i18n/format';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import { PressLink } from './PressLink';
import { countdownParts, journeyProgress, type HomeMatch } from './home-logic';

// The scoreboard is always dark, so its colours are fixed and readable in both themes.
const board = { bg: '#070B09', line: 'rgba(255,255,255,0.12)', lime: '#CFFF4A', text: '#B9C4B4' };
const ballSize = 22;

export function MiniBall({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10.5" fill="#FFFFFF" stroke="#0C1210" strokeWidth="1.5" />
      <Path d="M12 7.2l4.2 3-1.6 4.9H9.4L7.8 10.2z" fill="#0C1210" />
      <Path
        d="M12 7.2V3M16.2 10.2l4-1.4M14.6 15.1l2.6 3.5M9.4 15.1l-2.6 3.500M7.8 10.2l-4-1.4"
        stroke="#0C1210"
        strokeWidth="1.3"
        fill="none"
      />
    </Svg>
  );
}

function pad(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

/** A number that drops in each time it changes, like a scoreboard tile. */
function FlipNumber({ value, fontFamily }: { value: string; fontFamily: string }) {
  const [drop] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    drop.setValue(0);
    const animation = Animated.timing(drop, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [drop, reduced, value]);
  return (
    <Animated.Text
      style={[
        styles.digit,
        {
          fontFamily,
          opacity: drop.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
          transform: [
            { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
          ],
        },
      ]}
    >
      {value}
    </Animated.Text>
  );
}

/** The player's next game: a ticking scoreboard, the ball rolling to kick-off and the squad bar. */
export function HomeNextGame({ match, now }: { match: HomeMatch; now: number | null }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const [trackWidth, setTrackWidth] = useState(0);
  const enter = useEntrance(1300, 250);
  const pulse = useLoop(700, { alternate: true });

  const area = locale === 'el' ? match.areaNameEl : match.areaNameEn;
  const parts = matchTicketParts(match.startsAt, locale);
  const price =
    match.priceEur === 0 ? copy.matchFree : `€${formatLocalNumber(match.priceEur, locale)}`;
  const left = now === null ? null : countdownParts(Date.parse(match.startsAt) - now);
  const progress =
    now === null
      ? 0
      : Math.min(0.97, Math.max(0.03, journeyProgress(match.createdAt, match.startsAt, now)));
  const filled = Math.max(0, match.capacity - match.freeSpots);
  const openLabel =
    match.freeSpots === 0
      ? copy.homeSquadFull
      : match.freeSpots === 1
        ? copy.homePlaceOpen
        : copy.homePlacesOpen.replace('{count}', String(match.freeSpots));
  const units = [
    { label: copy.homeDays, value: left ? pad(left.days) : '--' },
    { label: copy.homeHours, value: left ? pad(left.hours) : '--' },
    { label: copy.homeMinutes, value: left ? pad(left.minutes) : '--' },
    { label: copy.homeSeconds, value: left ? pad(left.seconds) : '--' },
  ];
  const timerLabel = left
    ? copy.homeCountdownLabel
        .replace('{days}', String(left.days))
        .replace('{hours}', String(left.hours))
        .replace('{minutes}', String(left.minutes))
    : copy.homeNextGame;
  const semibold = bodyFont(locale, 'semibold');

  return (
    <View
      testID="home-next-game"
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.eyebrowRow}>
        <Animated.View
          style={[
            styles.liveDot,
            {
              backgroundColor: colors.accentText,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }),
            },
          ]}
        />
        <Text style={[styles.eyebrow, { color: colors.textSecondary, fontFamily: semibold }]}>
          {copy.homeNextGame}
        </Text>
        <View style={[styles.chip, { backgroundColor: colors.primaryButton }]}>
          <Text
            style={[
              styles.chipText,
              { color: colors.primaryButtonText, fontFamily: displayFont(locale) },
            ]}
          >
            {match.sideSize}v{match.sideSize}
          </Text>
        </View>
      </View>

      <Text
        accessibilityRole="header"
        numberOfLines={2}
        style={[styles.title, { color: colors.textPrimary, fontFamily: displayFont(locale) }]}
      >
        {match.title}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}>
        {area} · {parts.weekday} {parts.day} {parts.month} · {price} ·{' '}
        {match.isOrganizer ? copy.homeYouOrganise : copy.homeYouPlay}
      </Text>

      <View style={styles.board}>
        <View
          accessible
          accessibilityRole="timer"
          accessibilityLabel={timerLabel}
          style={styles.digits}
        >
          {units.map((unit, index) => (
            <View key={unit.label} style={styles.unit}>
              {index > 0 ? (
                <Text style={[styles.colon, { fontFamily: displayFont(locale) }]}>:</Text>
              ) : null}
              <FlipNumber value={unit.value} fontFamily={displayFont(locale)} />
              <Text style={[styles.unitLabel, { fontFamily: semibold }]}>{unit.label}</Text>
            </View>
          ))}
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          style={styles.track}
        >
          <View style={styles.trackLine} />
          <View style={styles.trackClip}>
            <Animated.View
              style={[
                styles.trackDone,
                {
                  transform: [
                    {
                      translateX: enter.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-trackWidth, -trackWidth * (1 - progress)],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <Animated.View
            style={[
              styles.ball,
              {
                transform: [
                  {
                    translateX: enter.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, trackWidth * progress],
                    }),
                  },
                  {
                    rotate: enter.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-720deg', '0deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <MiniBall size={ballSize} />
          </Animated.View>
        </View>
        <View style={styles.trackLabels}>
          <Text style={[styles.trackLabel, { fontFamily: semibold }]}>{copy.homeJourneyStart}</Text>
          <Text style={[styles.trackLabel, { fontFamily: semibold }]}>
            {copy.homeKickoffAt.replace('{time}', parts.time)}
          </Text>
        </View>
      </View>

      <View style={styles.squad}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.segments}
        >
          {Array.from({ length: match.capacity }, (_, slot) =>
            slot < filled ? (
              <View key={slot} style={[styles.segment, { backgroundColor: colors.accentText }]} />
            ) : (
              <Animated.View
                key={slot}
                style={[
                  styles.segment,
                  styles.segmentOpen,
                  {
                    borderColor: colors.accentText,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }),
                  },
                ]}
              />
            ),
          )}
        </View>
        <View style={styles.squadLabels}>
          <Text
            style={[
              styles.squadText,
              { color: colors.textSecondary, fontFamily: bodyFont(locale) },
            ]}
          >
            {copy.homePlayersIn
              .replace('{count}', String(filled))
              .replace('{capacity}', String(match.capacity))}
          </Text>
          <Text style={[styles.squadText, { color: colors.accentText, fontFamily: semibold }]}>
            {openLabel}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PressLink
          href={`/matches/${match.id}` as Href}
          style={[
            styles.action,
            styles.actionPrimary,
            { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
          ]}
        >
          <Text
            style={[styles.actionText, { color: colors.primaryButtonText, fontFamily: semibold }]}
          >
            {copy.homeOpenGame}
          </Text>
          <Text aria-hidden style={[styles.actionText, { color: colors.primaryButtonText }]}>
            →
          </Text>
        </PressLink>
        <PressLink
          href={`/chat/${match.id}` as Href}
          style={[styles.action, { borderColor: colors.border }]}
        >
          <Text style={[styles.actionText, { color: colors.textPrimary, fontFamily: semibold }]}>
            {copy.homeSquadChat}
          </Text>
        </PressLink>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, padding: 16, gap: 12 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', flexShrink: 1 },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 14, lineHeight: 16, fontWeight: '800' },
  title: { fontSize: 38, lineHeight: 40, fontWeight: '800' },
  meta: { fontSize: 14, lineHeight: 20 },
  board: {
    backgroundColor: board.bg,
    borderColor: board.line,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  digits: { flexDirection: 'row' },
  unit: { flex: 1, alignItems: 'center', gap: 2 },
  colon: {
    position: 'absolute',
    left: -4,
    top: 0,
    color: board.text,
    fontSize: 30,
    lineHeight: 40,
  },
  digit: {
    color: board.lime,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  unitLabel: { color: board.text, fontSize: 10, letterSpacing: 1.6 },
  track: { height: ballSize, justifyContent: 'center' },
  trackLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  trackClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackDone: { width: '100%', height: 4, backgroundColor: board.lime },
  ball: { position: 'absolute', left: -ballSize / 2, width: ballSize, height: ballSize },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  trackLabel: { color: board.text, fontSize: 11 },
  squad: { gap: 6 },
  segments: { flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 8, borderRadius: 4 },
  segmentOpen: { borderWidth: 1, borderStyle: 'dashed' },
  squadLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  squadText: { fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  actionPrimary: { flex: 1.25 },
  actionText: { fontSize: 15, fontWeight: '700' },
});
