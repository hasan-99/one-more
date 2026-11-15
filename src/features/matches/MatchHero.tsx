import { useMemo } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useEntrance, useLoop } from '@/components/motion';
import { translations, type Locale } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import type { ThemeColors } from '@/theme/tokens';

type Copy = { [Key in keyof typeof translations.en]: string };

export type MatchHeroData = {
  title: string;
  sideSize: number;
  startsAt: string;
  venueName: string;
  areaLabel: string;
  cityLabel: string;
  durationMinutes: number;
  priceEur: number;
  /** Places taken (players plus places the organizer already filled). */
  taken: number;
  capacity: number;
  bookingStatus: 'not_booked' | 'pending' | 'confirmed';
  /** "Draft" / "Published" badge, only shown for the organizer. */
  statusLabel?: string;
};

/**
 * The top of a game: the match ticket, three fact cards and the players number with its bar.
 * Used by the game page and the edit page so both look the same.
 */
export function MatchHero({ data, locale }: { data: MatchHeroData; locale: Locale }) {
  const { colors } = useAppPreferences();
  const copy = translations[locale] as Copy;
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const shine = useLoop(4500, { easing: Easing.inOut(Easing.ease) });
  const rise = useEntrance(500);
  const start = new Date(data.startsAt);
  const tag = locale === 'el' ? 'el-GR' : 'en-GB';
  const weekday = new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: 'Asia/Nicosia' })
    .format(start)
    .toUpperCase();
  const month = new Intl.DateTimeFormat(tag, { month: 'short', timeZone: 'Asia/Nicosia' })
    .format(start)
    .toUpperCase();
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', timeZone: 'Asia/Nicosia' }).format(
    start,
  );
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Nicosia',
  }).format(start);
  const open = Math.max(0, data.capacity - data.taken);
  const confirmed = data.bookingStatus === 'confirmed';
  const label = `${data.sideSize}v${data.sideSize} · ${data.title} · ${weekday} ${day} ${month} ${time}`;
  const priceText =
    data.priceEur > 0
      ? `€${data.priceEur % 1 ? data.priceEur.toFixed(2) : data.priceEur}`
      : copy.gameWizFree;

  return (
    <Animated.View
      style={{
        gap: 12,
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.ticket}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="hero-bg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#25521f" />
              <Stop offset="0.55" stopColor="#12261a" />
              <Stop offset="1" stopColor="#0b130e" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#hero-bg)" />
        </Svg>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shine,
            {
              transform: [
                { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-120, 460] }) },
                { skewX: '-18deg' },
              ],
            },
          ]}
        />
        <View style={styles.row}>
          <View style={styles.main}>
            <View style={styles.badges}>
              <Text style={styles.matchBadge}>{copy.gameWizMatchDay}</Text>
              {data.statusLabel ? <Text style={styles.statusBadge}>{data.statusLabel}</Text> : null}
            </View>
            <View style={styles.formatRow}>
              <Text style={styles.format}>{`${data.sideSize}v${data.sideSize}`}</Text>
              <Text numberOfLines={2} style={styles.title}>
                {data.title}
              </Text>
            </View>
            <Text numberOfLines={2} style={styles.place}>
              {`📍 ${data.venueName} · ${data.areaLabel}, ${data.cityLabel}`}
            </Text>
            <Text style={[styles.pitch, confirmed && styles.pitchOn]}>
              {confirmed
                ? `✓ ${copy.heroPitchConfirmed}`
                : data.bookingStatus === 'pending'
                  ? copy.heroPitchPending
                  : copy.heroPitchNotBooked}
            </Text>
          </View>
          <View style={styles.perf}>
            <View style={[styles.notch, { top: -9 }]} />
            <View style={[styles.notch, { bottom: -9 }]} />
          </View>
          <View style={styles.stub}>
            <Text style={styles.stubSmall}>{weekday}</Text>
            <Text style={styles.stubDay}>{day}</Text>
            <Text style={styles.stubSmall}>{month}</Text>
            <Text style={styles.stubTime}>{time}</Text>
          </View>
        </View>
      </View>

      <View style={styles.facts}>
        <Fact
          label={copy.heroDuration}
          value={String(data.durationMinutes)}
          note={copy.matchMinutes}
          styles={styles}
        />
        <Fact
          label={copy.heroOpenSpots}
          value={String(open)}
          note={copy.heroOfTotal.replace('{n}', String(data.capacity))}
          hot={open > 0}
          styles={styles}
        />
        <Fact label={copy.heroPrice} value={priceText} note={copy.heroPerPlayer} styles={styles} />
      </View>

      <View
        style={styles.players}
        accessible
        accessibilityLabel={`${copy.heroPlayers}: ${data.taken}/${data.capacity}`}
      >
        <Text style={styles.playersTitle}>{copy.heroPlayers}</Text>
        <View style={styles.big}>
          <Text style={styles.bigNumber}>{data.taken}</Text>
          <Text style={styles.bigNote}>
            {copy.heroPlayersOf.replace('{n}', String(data.capacity))}
          </Text>
          {open > 0 ? (
            <Text style={styles.spotBadge}>
              {open === 1 ? copy.heroOneSpotLeft : copy.heroSpotsLeft.replace('{n}', String(open))}
            </Text>
          ) : (
            <Text style={[styles.spotBadge, styles.fullBadge]}>{copy.heroFull}</Text>
          )}
        </View>
        <View style={styles.segments}>
          {Array.from({ length: data.capacity }, (_, index) => (
            <View key={index} style={[styles.segment, index >= data.taken && styles.segmentOpen]} />
          ))}
        </View>
        {open > 0 ? <Text style={styles.playersHint}>{copy.heroCompleteHint}</Text> : null}
      </View>
    </Animated.View>
  );
}

function Fact({
  label,
  value,
  note,
  hot = false,
  styles,
}: {
  label: string;
  value: string;
  note: string;
  hot?: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value} ${note}`} style={styles.fact}>
      <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.factValue, hot && styles.factValueHot]}>{value}</Text>
      <Text style={styles.factNote}>{note}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  const lime = colors.primaryButton;
  return StyleSheet.create({
    ticket: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(207,255,74,0.35)',
      overflow: 'hidden',
      backgroundColor: '#0b130e',
    },
    shine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 60,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    row: { flexDirection: 'row', alignItems: 'stretch' },
    main: {
      flex: 1,
      minWidth: 0,
      paddingTop: 14,
      paddingBottom: 14,
      paddingLeft: 16,
      paddingRight: 12,
      gap: 8,
    },
    badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    matchBadge: {
      color: '#cfff4a',
      fontSize: 9.5,
      fontWeight: '900',
      letterSpacing: 1.8,
      borderWidth: 1,
      borderColor: 'rgba(207,255,74,0.5)',
      borderRadius: 7,
      paddingHorizontal: 7,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    statusBadge: {
      color: '#10170f',
      backgroundColor: '#cfff4a',
      fontSize: 9.5,
      fontWeight: '900',
      letterSpacing: 1,
      borderRadius: 7,
      paddingHorizontal: 7,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    formatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    format: { color: '#cfff4a', fontSize: 34, lineHeight: 36, fontWeight: '900' },
    title: { flex: 1, color: '#ffffff', fontSize: 19, lineHeight: 22, fontWeight: '800' },
    place: { color: '#d6dccf', fontSize: 12.5, lineHeight: 18 },
    pitch: {
      alignSelf: 'flex-start',
      color: '#d6dccf',
      backgroundColor: 'rgba(255,255,255,0.12)',
      fontSize: 11,
      fontWeight: '800',
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    pitchOn: { backgroundColor: '#cfff4a', color: '#10170f' },
    perf: {
      width: 2,
      marginVertical: 10,
      borderLeftWidth: 2,
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.2)',
    },
    notch: {
      position: 'absolute',
      left: -9,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    stub: {
      width: 86,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      backgroundColor: 'rgba(207,255,74,0.08)',
    },
    stubSmall: {
      color: 'rgba(207,255,74,0.85)',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.6,
    },
    stubDay: { color: '#ffffff', fontSize: 40, lineHeight: 44, fontWeight: '900' },
    stubTime: {
      marginTop: 6,
      color: '#10170f',
      backgroundColor: '#cfff4a',
      fontSize: 15,
      fontWeight: '800',
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    facts: { flexDirection: 'row', gap: 8 },
    fact: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 10,
      paddingHorizontal: 6,
    },
    factLabel: {
      color: colors.textSecondary,
      fontSize: 9.5,
      fontWeight: '800',
      letterSpacing: 1.3,
    },
    factValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', marginTop: 3 },
    factValueHot: { color: colors.accentText },
    factNote: { color: colors.textSecondary, fontSize: 11 },
    players: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
    },
    playersTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
    big: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 2, marginBottom: 12 },
    bigNumber: { color: colors.accentText, fontSize: 56, lineHeight: 62, fontWeight: '900' },
    bigNote: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
    spotBadge: {
      marginLeft: 'auto',
      alignSelf: 'center',
      color: colors.primaryButtonText,
      backgroundColor: lime,
      fontSize: 12,
      fontWeight: '900',
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    fullBadge: { backgroundColor: colors.surfaceRaised, color: colors.textSecondary },
    segments: { flexDirection: 'row', gap: 5 },
    segment: { flex: 1, height: 14, borderRadius: 7, backgroundColor: lime },
    segmentOpen: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: lime,
    },
    playersHint: { color: colors.textSecondary, fontSize: 12.5, marginTop: 8 },
  });
}
