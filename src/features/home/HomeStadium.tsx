import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { useEntrance, useLoop, useReducedMotion } from '@/components/motion';
import { translations } from '@/i18n';
import { formatLocalNumber, matchTicketParts } from '@/i18n/format';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import {
  countdownParts,
  pitchPlane,
  pitchPositions,
  projectOnPitch,
  type HomeMatch,
} from './home-logic';
import { PressLink } from './PressLink';

// The stadium is always night, in both themes, so its colours are fixed.
const night = {
  sky: '#050907',
  glow: '#0F2418',
  edge: '#1D2C23',
  text: '#F2F5EC',
  muted: '#B9C4B4',
  lime: '#CFFF4A',
  ink: '#0C1210',
  grassA: '#1E5A33',
  grassB: '#1A4E2C',
  chalk: 'rgba(255,255,255,0.62)',
};
const stripe = 38;
const emptyPitchPlayers = 10;

export function MiniBall({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="10.5" fill="#FFFFFF" stroke="#0C1210" strokeWidth="1.5" />
      <Path d="M12 7.2l4.2 3-1.6 4.9H9.4L7.8 10.2z" fill="#0C1210" />
      <Path
        d="M12 7.2V3M16.2 10.2l4-1.4M14.6 15.1l2.6 3.5M9.4 15.1l-2.6 3.5M7.8 10.2l-4-1.4"
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

/** One floodlight: it flickers on, then sways slowly. */
function Beam({ side, delay }: { side: 'left' | 'right'; delay: number }) {
  const [power] = useState(() => new Animated.Value(0));
  const reduced = useReducedMotion();
  const sway = useLoop(side === 'left' ? 7000 : 8000, { alternate: true });
  useEffect(() => {
    if (reduced) {
      power.setValue(1);
      return;
    }
    const step = (toValue: number, wait: number) =>
      Animated.sequence([
        Animated.delay(wait),
        Animated.timing(power, { toValue, duration: 0, useNativeDriver: true }),
      ]);
    const animation = Animated.sequence([
      step(1, delay + 160),
      step(0.15, 110),
      step(1, 140),
      step(0.5, 130),
      step(1, 200),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, power, reduced]);
  const base = side === 'left' ? -26 : 26;
  const id = `home-beam-${side}`;
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.beam,
          side === 'left' ? styles.beamLeft : styles.beamRight,
          {
            opacity: power,
            transform: [
              {
                rotate: sway.interpolate({
                  inputRange: [0, 1],
                  outputRange: [`${base - 4}deg`, `${base + 4}deg`],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width={210} height={420} viewBox="0 0 210 420">
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={night.lime} stopOpacity="0.3" />
              <Stop offset="0.55" stopColor={night.lime} stopOpacity="0.07" />
              <Stop offset="0.88" stopColor={night.lime} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Polygon points="105,0 0,420 210,420" fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.lamps,
          side === 'left' ? styles.lampsLeft : styles.lampsRight,
          { opacity: power },
        ]}
      >
        {[0, 1, 2].map((lamp) => (
          <View key={lamp} style={styles.lamp} />
        ))}
      </Animated.View>
    </>
  );
}

/** A player standing on the pitch; drops in when the page opens. */
function Pin({
  left,
  bottom,
  size,
  stem,
  away,
  label,
  delay,
  depth,
  fontFamily,
}: {
  left: number;
  bottom: number;
  size: number;
  stem: number;
  away: boolean;
  label: string | null;
  delay: number;
  depth: number;
  fontFamily: string;
}) {
  const enter = useEntrance(500, delay, Easing.out(Easing.back(1.6)));
  return (
    <Animated.View
      testID="home-pin"
      style={[
        styles.pin,
        {
          left: left - size / 2,
          bottom,
          width: size,
          zIndex: depth,
          opacity: enter,
          transform: [
            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-46, 0] }) },
          ],
        },
      ]}
    >
      {label ? (
        <View style={[styles.youTag, { left: (size - 34) / 2, bottom: size + stem + 3 }]}>
          <Text style={[styles.youText, { fontFamily }]}>{label}</Text>
        </View>
      ) : null}
      <View
        style={[
          styles.pinHead,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: away ? night.text : night.lime,
            boxShadow: label
              ? '0 0 0 3px rgba(207,255,74,0.35), 0 0 16px rgba(207,255,74,0.9)'
              : away
                ? '0 0 10px rgba(255,255,255,0.5)'
                : '0 0 12px rgba(207,255,74,0.7)',
          },
        ]}
      />
      <View style={[styles.pinStem, { height: stem }]} />
    </Animated.View>
  );
}

/**
 * The home hero: a night stadium. With a game, the scoreboard counts down and every player who is
 * in stands on the pitch, with empty places pulsing. Without one, the pitch is empty and waiting.
 */
export function HomeStadium({
  match,
  now,
  openChip,
}: {
  match: HomeMatch | null;
  now: number | null;
  openChip: string | null;
}) {
  const { locale } = useAppPreferences();
  const copy = translations[locale];
  const [width, setWidth] = useState(0);
  const tilt = useEntrance(1100, 80);
  const pulse = useLoop(700, { alternate: true });
  const bounce = useLoop(600, { alternate: true, easing: Easing.inOut(Easing.quad) });
  const blink = useLoop(1000, { easing: Easing.step0 });

  const display = displayFont(locale);
  const semibold = bodyFont(locale, 'semibold');
  const capacity = match ? match.capacity : emptyPitchPlayers;
  const filled = match ? Math.max(0, match.capacity - match.freeSpots) : 0;
  const spots = pitchPositions(capacity);
  const stageHeight = width > 0 ? Math.round(projectOnPitch(0, 1, width).bottom + 34) : 200;
  const centre = projectOnPitch(0, 0.5, width);
  const ballSize = Math.round(18 * centre.scale + 2);

  const parts = match ? matchTicketParts(match.startsAt, locale) : null;
  const left = match && now !== null ? countdownParts(Date.parse(match.startsAt) - now) : null;
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
  const openLabel = !match
    ? ''
    : match.freeSpots === 0
      ? copy.homeSquadFull
      : match.freeSpots === 1
        ? copy.homePlaceOpen
        : copy.homePlacesOpen.replace('{count}', String(match.freeSpots));
  const stageLabel = match
    ? copy.homeStageLabel
        .replace('{count}', String(filled))
        .replace('{capacity}', String(match.capacity))
    : copy.homeStageEmpty;

  return (
    <View testID={match ? 'home-next-game' : 'home-empty-stadium'} style={styles.stadium}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="home-stadium-sky" cx="50%" cy="100%" rx="120%" ry="70%">
            <Stop offset="0" stopColor={night.glow} />
            <Stop offset="0.62" stopColor={night.sky} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#home-stadium-sky)" />
      </Svg>
      <Beam side="left" delay={0} />
      <Beam side="right" delay={200} />

      <View style={styles.eyebrowRow}>
        <Animated.View
          style={[
            styles.liveDot,
            { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] }) },
          ]}
        />
        <Text style={[styles.eyebrow, { fontFamily: semibold }]}>
          {match ? copy.homeNextGame : copy.homeNoGameEyebrow}
        </Text>
        {match || openChip ? (
          <View style={styles.chip}>
            <Text style={[styles.chipText, { fontFamily: display }]}>
              {match ? `${match.sideSize}v${match.sideSize}` : openChip}
            </Text>
          </View>
        ) : null}
      </View>

      {match && parts ? (
        <>
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            style={[styles.title, { fontFamily: display }]}
          >
            {match.title}
          </Text>
          <Text style={[styles.venue, { fontFamily: bodyFont(locale) }]}>
            {locale === 'el' ? match.areaNameEl : match.areaNameEn} · {parts.weekday} {parts.day}{' '}
            {parts.month} · {parts.time} ·{' '}
            {match.priceEur === 0
              ? copy.matchFree
              : `€${formatLocalNumber(match.priceEur, locale)}`}{' '}
            · {match.isOrganizer ? copy.homeYouOrganise : copy.homeYouPlay}
          </Text>
          <View style={styles.score}>
            <Text style={[styles.scoreLabel, { fontFamily: semibold }]}>{copy.homeKickoffIn}</Text>
            <View
              accessible
              accessibilityRole="timer"
              accessibilityLabel={timerLabel}
              style={styles.digits}
            >
              {units.map((unit, index) => (
                <View key={unit.label} style={styles.unitRow}>
                  {index > 0 ? (
                    <Animated.Text
                      style={[
                        styles.colon,
                        {
                          fontFamily: display,
                          opacity: blink.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: [1, 0.25, 0.25],
                          }),
                        },
                      ]}
                    >
                      :
                    </Animated.Text>
                  ) : null}
                  <View style={styles.unit}>
                    <FlipNumber value={unit.value} fontFamily={display} />
                    <Text style={[styles.unitLabel, { fontFamily: semibold }]}>{unit.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : (
        <>
          <Text accessibilityRole="header" style={[styles.title, { fontFamily: display }]}>
            {copy.homePitchWaitingFirst}{' '}
            <Text style={{ color: night.lime }}>{copy.homePitchWaitingAccent}</Text>
          </Text>
          <Text style={[styles.venue, { fontFamily: bodyFont(locale) }]}>
            {copy.homePitchWaitingCopy}
          </Text>
        </>
      )}

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={stageLabel}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.stage, { height: stageHeight }]}
      >
        {width > 0 ? (
          <>
            <Animated.View
              style={[
                styles.plane,
                {
                  width,
                  height: pitchPlane.length,
                  opacity: tilt,
                  transform: [
                    { perspective: pitchPlane.distance },
                    {
                      rotateX: tilt.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['84deg', `${pitchPlane.tiltDeg}deg`],
                      }),
                    },
                  ],
                },
              ]}
            >
              {Array.from({ length: Math.ceil(pitchPlane.length / stripe) }, (_, row) => (
                <View
                  key={row}
                  style={{ height: stripe, backgroundColor: row % 2 ? night.grassB : night.grassA }}
                />
              ))}
              <View style={styles.touchline} />
              <View style={styles.halfway} />
              <View style={styles.centreCircle} />
              <View style={[styles.box, styles.boxNear]} />
              <View style={[styles.box, styles.boxFar]} />
            </Animated.View>
            {spots.map((spot, index) => {
              const point = projectOnPitch(spot.x, spot.t, width);
              const size = Math.round(15 * point.scale + 3);
              if (index < filled) {
                return (
                  <View key={index} pointerEvents="none" style={StyleSheet.absoluteFill}>
                    <View
                      style={[
                        styles.shadow,
                        {
                          left: point.left - size * 0.55,
                          bottom: point.bottom - size * 0.21,
                          width: size * 1.1,
                          height: size * 0.42,
                        },
                      ]}
                    />
                    <Pin
                      left={point.left}
                      bottom={point.bottom}
                      size={size}
                      stem={Math.round(11 * point.scale)}
                      away={spot.team === 'away'}
                      label={index === 0 ? copy.homeYou : null}
                      delay={900 + index * 70}
                      depth={100 - Math.round(spot.t * 100)}
                      fontFamily={display}
                    />
                  </View>
                );
              }
              return (
                <Animated.View
                  key={index}
                  testID="home-spot"
                  pointerEvents="none"
                  style={[
                    styles.spot,
                    {
                      left: point.left - size,
                      bottom: point.bottom - size * 0.45,
                      width: size * 2,
                      height: size * 0.9,
                      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }),
                    },
                  ]}
                />
              );
            })}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ball,
                {
                  left: centre.left - ballSize / 2,
                  bottom: centre.bottom,
                  transform: [
                    {
                      translateY: bounce.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }),
                    },
                  ],
                },
              ]}
            >
              <MiniBall size={ballSize} />
            </Animated.View>
          </>
        ) : null}
      </View>

      {match ? (
        <>
          <View style={styles.squadLabels}>
            <Text style={[styles.squadText, { fontFamily: bodyFont(locale) }]}>
              {copy.homePlayersIn
                .replace('{count}', String(filled))
                .replace('{capacity}', String(match.capacity))}
            </Text>
            <Text style={[styles.squadText, styles.squadOpen, { fontFamily: semibold }]}>
              {openLabel}
            </Text>
          </View>
          <View style={styles.actions}>
            <PressLink
              href={`/matches/${match.id}` as Href}
              style={[styles.action, styles.actionPrimary, styles.actionWide]}
            >
              <Text style={[styles.actionText, styles.actionInk, { fontFamily: semibold }]}>
                {copy.homeOpenGame}
              </Text>
              <Text aria-hidden style={[styles.actionText, styles.actionInk]}>
                →
              </Text>
            </PressLink>
            <PressLink href={`/chat/${match.id}` as Href} style={styles.action}>
              <Text style={[styles.actionText, { fontFamily: semibold }]}>
                {copy.homeSquadChat}
              </Text>
            </PressLink>
          </View>
        </>
      ) : (
        <View style={styles.actions}>
          <PressLink href={'/explore' as Href} style={[styles.action, styles.actionPrimary]}>
            <Text style={[styles.actionText, styles.actionInk, { fontFamily: semibold }]}>
              {copy.appExploreAction}
            </Text>
            <Text aria-hidden style={[styles.actionText, styles.actionInk]}>
              →
            </Text>
          </PressLink>
          <PressLink href={'/create' as Href} style={styles.action}>
            <Text style={[styles.actionText, { fontFamily: semibold }]}>
              {copy.appCreateAction}
            </Text>
          </PressLink>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stadium: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: night.edge,
    backgroundColor: night.sky,
    overflow: 'hidden',
    padding: 16,
    paddingBottom: 14,
    gap: 10,
  },
  beam: { position: 'absolute', top: -30, width: 210, height: 420, transformOrigin: '50% 0%' },
  beamLeft: { left: -74 },
  beamRight: { right: -74 },
  lamps: { position: 'absolute', top: 10, flexDirection: 'row', gap: 4 },
  lampsLeft: { left: 12 },
  lampsRight: { right: 12 },
  lamp: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 10px 3px rgba(207,255,74,0.75)',
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: night.lime },
  eyebrow: {
    flex: 1,
    color: night.muted,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  chip: { backgroundColor: night.lime, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { color: night.ink, fontSize: 14, lineHeight: 16, fontWeight: '800' },
  title: {
    color: night.text,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  venue: { color: night.muted, fontSize: 13.5, lineHeight: 19 },
  score: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5,9,7,0.72)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 9,
  },
  scoreLabel: { color: night.muted, fontSize: 10, letterSpacing: 2 },
  digits: { flexDirection: 'row', alignItems: 'flex-start' },
  unitRow: { flexDirection: 'row', alignItems: 'flex-start' },
  unit: { alignItems: 'center', minWidth: 50 },
  colon: { color: night.muted, fontSize: 38, lineHeight: 46, paddingHorizontal: 3 },
  digit: {
    color: night.lime,
    fontSize: 46,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(207,255,74,0.45)',
    textShadowRadius: 18,
  },
  unitLabel: { color: night.muted, fontSize: 9.5, letterSpacing: 1.6 },
  stage: { marginTop: -6 },
  plane: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    borderRadius: 10,
    overflow: 'hidden',
    transformOrigin: '50% 100%',
  },
  touchline: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 3,
    borderColor: night.chalk,
    borderRadius: 10,
  },
  halfway: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: pitchPlane.length / 2 - 1.5,
    height: 3,
    backgroundColor: night.chalk,
  },
  centreCircle: {
    position: 'absolute',
    left: '50%',
    top: pitchPlane.length / 2 - 48,
    marginLeft: -48,
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: night.chalk,
  },
  box: {
    position: 'absolute',
    left: '27%',
    right: '27%',
    height: '15%',
    borderWidth: 3,
    borderColor: night.chalk,
  },
  boxNear: { bottom: 0, borderBottomWidth: 0 },
  boxFar: { top: 0, borderTopWidth: 0 },
  pin: { position: 'absolute', alignItems: 'center' },
  pinHead: { borderWidth: 2, borderColor: night.ink },
  pinStem: { width: 2, backgroundColor: 'rgba(255,255,255,0.55)' },
  youTag: {
    position: 'absolute',
    width: 34,
    alignItems: 'center',
    backgroundColor: night.lime,
    borderRadius: 5,
    paddingVertical: 2,
  },
  youText: { color: night.ink, fontSize: 10, lineHeight: 11, fontWeight: '800', letterSpacing: 1 },
  shadow: { position: 'absolute', borderRadius: 99, backgroundColor: 'rgba(0,0,0,0.45)' },
  spot: {
    position: 'absolute',
    borderRadius: 99,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: night.lime,
    backgroundColor: 'rgba(207,255,74,0.16)',
  },
  ball: { position: 'absolute', zIndex: 60 },
  squadLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  squadText: { color: night.muted, fontSize: 13 },
  squadOpen: { color: night.lime },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(5,9,7,0.5)',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  actionPrimary: { backgroundColor: night.lime, borderColor: night.lime },
  actionWide: { flex: 1.25 },
  actionText: { color: night.text, fontSize: 15, fontWeight: '700' },
  actionInk: { color: night.ink },
});
