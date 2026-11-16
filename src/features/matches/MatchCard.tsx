import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { useEntrance, useLoop } from '@/components/motion';
import { useToast } from '@/components/toast/ToastProvider';
import { formatLocalNumber, matchTicketParts } from '@/i18n/format';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import { requestMatchJoin, withdrawMatchJoinRequest } from './match-join-service';
import type { MatchDiscoveryItem } from './match-service';

type JoinState =
  { status: 'idle' } | { status: 'busy' } | { status: 'sent'; participantId: string };

export function MatchCard({ match, index = 0 }: { match: MatchDiscoveryItem; index?: number }) {
  const { colors, locale } = useAppPreferences();
  const { session } = useAuth();
  const { showToast } = useToast();
  const copy = translations[locale];
  const [join, setJoin] = useState<JoinState>({ status: 'idle' });
  const area = locale === 'el' ? match.areaNameEl : match.areaNameEn;
  const parts = matchTicketParts(match.startsAt, locale);
  const when = `${parts.weekday} ${parts.day} ${parts.month}, ${parts.time}`;
  const price =
    match.priceEur === 0 ? copy.matchFree : `€${formatLocalNumber(match.priceEur, locale)}`;
  const reserved = Math.max(0, match.capacity - match.activePlayers - match.freeSpots);
  const full = match.freeSpots === 0;
  const status: 'mine' | 'last' | 'full' | 'open' = match.isOrganizer
    ? 'mine'
    : full
      ? 'full'
      : match.freeSpots === 1
        ? 'last'
        : 'open';
  // The kick-off board is always dark, so its text uses the dark theme's bright colours in both modes.
  const boardAccent = status === 'open' || status === 'mine' ? '#CFFF4A' : null;
  const accent = status === 'last' ? '#ffb84a' : status === 'full' ? '#8a968d' : colors.accentText;
  const sticker =
    status === 'mine'
      ? copy.matchStickerMine
      : status === 'last'
        ? copy.matchStickerLast
        : status === 'full'
          ? copy.matchStickerFull
          : null;
  const pulse = useLoop(700, { alternate: true, enabled: !full });
  const playersLabel = copy.matchJoinedOf
    .replace('{active}', String(match.activePlayers))
    .replace('{total}', String(match.capacity));
  const openLabel = full
    ? copy.matchFullWaitlistOpen
    : match.freeSpots === 1
      ? copy.matchPlacesOpenSingle
      : copy.matchPlacesOpenCount.replace('{count}', String(match.freeSpots));
  const pitch =
    match.bookingStatus === 'confirmed'
      ? { text: `✓ ${copy.heroPitchConfirmed}`, color: colors.accentText }
      : match.bookingStatus === 'pending'
        ? { text: copy.heroPitchPending, color: '#ffb84a' }
        : { text: copy.heroPitchNotBooked, color: '#ffb84a' };
  const entrance = useEntrance(600, 80 + index * 70, Easing.bezier(0.2, 0.9, 0.2, 1));
  const detailsHref = `/matches/${match.id}` as Href;

  const toggleJoin = async () => {
    if (match.isOrganizer || full) {
      router.push(detailsHref);
      return;
    }
    if (!session) {
      router.push(`/sign-in?returnTo=${encodeURIComponent('/explore')}` as Href);
      return;
    }
    if (join.status === 'busy') return;
    const previous = join;
    setJoin({ status: 'busy' });
    try {
      if (previous.status === 'sent') {
        await withdrawMatchJoinRequest(match.id, previous.participantId);
        setJoin({ status: 'idle' });
        showToast(copy.matchRequestWithdrawn, 'success');
      } else {
        const participantId = await requestMatchJoin(match.id, null);
        setJoin({ status: 'sent', participantId });
        showToast(copy.matchRequestSentToast, 'success');
      }
    } catch (error) {
      setJoin(previous);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('verified_profile_required')) {
        router.push('/onboarding' as Href);
        return;
      }
      showToast(copy.matchRequestError, 'error');
    }
  };

  const sent = join.status === 'sent';
  const ctaLabel = match.isOrganizer
    ? copy.matchViewDetails
    : full
      ? copy.matchWaitlistJoin
      : sent
        ? copy.matchRequestSent
        : copy.matchJoinRequest;
  const slots = Math.min(match.capacity, 22);
  const heading = { color: colors.textPrimary, fontFamily: displayFont(locale) };

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.card,
          {
            borderColor: status === 'open' ? colors.border : accent,
            backgroundColor: colors.cardBottom,
          },
        ]}
      >
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${match.sideSize}v${match.sideSize} ${match.title}, ${area}, ${when}, ${playersLabel}, ${openLabel}, ${price}`}
          onPress={() => router.push(detailsHref)}
          style={styles.body}
        >
          <View style={styles.head}>
            <Text style={[styles.format, { color: accent, fontFamily: displayFont(locale) }]}>
              {match.sideSize}v{match.sideSize}
            </Text>
            <Text numberOfLines={1} style={[styles.name, heading]}>
              {match.title}
            </Text>
            <Text style={[styles.price, heading]}>{price}</Text>
          </View>
          <View style={styles.sub}>
            <Text
              numberOfLines={1}
              style={[styles.venue, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}
            >
              📍 {match.venueName ? `${match.venueName} · ` : ''}
              {area}
            </Text>
            <Text
              numberOfLines={1}
              style={[
                styles.pitch,
                { color: pitch.color, fontFamily: bodyFont(locale, 'semibold') },
              ]}
            >
              {pitch.text}
            </Text>
          </View>

          <View style={styles.board}>
            <View style={styles.boardCell}>
              <Text
                style={[
                  styles.boardDow,
                  { color: boardAccent ?? accent, fontFamily: bodyFont(locale, 'semibold') },
                ]}
              >
                {parts.weekday.toUpperCase()}
              </Text>
              <Text style={[styles.boardDay, heading, { color: '#F2F5EC' }]}>
                {parts.day} {parts.month.toUpperCase()}
              </Text>
            </View>
            <View style={styles.boardLine} />
            <View style={styles.boardCell}>
              <Text
                style={[
                  styles.boardTime,
                  { color: boardAccent ?? accent, fontFamily: displayFont(locale) },
                ]}
              >
                {parts.time}
              </Text>
              <Text
                style={[
                  styles.boardLabel,
                  { color: '#B9C4B4', fontFamily: bodyFont(locale, 'semibold') },
                ]}
              >
                {copy.matchKickoff}
              </Text>
            </View>
          </View>

          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.bar}
          >
            {Array.from({ length: slots }, (_, slot) => {
              if (slot < match.activePlayers) {
                return <View key={slot} style={[styles.seg, { backgroundColor: accent }]} />;
              }
              if (slot < match.activePlayers + reserved) {
                return (
                  <View
                    key={slot}
                    style={[styles.seg, { backgroundColor: colors.textPrimary, opacity: 0.17 }]}
                  />
                );
              }
              return (
                <Animated.View
                  key={slot}
                  style={[
                    styles.seg,
                    styles.segOpen,
                    {
                      borderColor: accent,
                      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }),
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.counts}>
            <Text
              numberOfLines={2}
              style={[styles.count, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}
            >
              {playersLabel}
              {reserved > 0 && match.isOrganizer
                ? ` · ${copy.matchHeldByOrganizer.replace('{count}', String(reserved))}`
                : ''}
            </Text>
            <Text
              style={[styles.open, { color: accent, fontFamily: bodyFont(locale, 'semibold') }]}
            >
              {openLabel}
            </Text>
          </View>
        </Pressable>

        <JoinButton
          label={ctaLabel}
          sent={sent}
          busy={join.status === 'busy'}
          ghost={match.isOrganizer || full}
          accent={accent}
          onPress={() => void toggleJoin()}
        />
      </View>
      {sticker ? (
        <View pointerEvents="none" style={[styles.sticker, { backgroundColor: accent }]}>
          <Text style={[styles.stickerText, { fontFamily: bodyFont(locale, 'semibold') }]}>
            {sticker}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

function JoinButton({
  label,
  sent,
  busy,
  ghost,
  accent,
  onPress,
}: {
  label: string;
  sent: boolean;
  busy: boolean;
  ghost: boolean;
  accent: string;
  onPress: () => void;
}) {
  const { colors, locale } = useAppPreferences();
  const pop = useEntrance(450, 0, Easing.bezier(0.2, 1.4, 0.3, 1), sent);
  const check = useEntrance(400, 100, Easing.ease, sent);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, selected: sent }}
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <Animated.View
        style={[
          styles.action,
          sent
            ? {
                borderColor: colors.accentText,
                backgroundColor: 'rgba(207,255,74,0.1)',
                transform: [
                  { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                ],
              }
            : ghost
              ? { borderColor: accent, backgroundColor: 'transparent' }
              : {
                  // Dark text sits on the bright lime button in both themes (accent is dark green in light mode).
                  backgroundColor:
                    status === 'open' || status === 'mine' ? colors.primaryButton : accent,
                  borderColor:
                    status === 'open' || status === 'mine' ? colors.primaryButton : accent,
                },
          { opacity: busy ? 0.7 : 1 },
        ]}
      >
        {sent ? (
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <AnimatedCheck progress={check} color={colors.accentText} />
          </Svg>
        ) : null}
        <Text
          numberOfLines={1}
          style={[
            styles.actionText,
            {
              color: sent ? colors.accentText : ghost ? accent : colors.primaryButtonText,
              fontFamily: bodyFont(locale, 'semibold'),
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

function AnimatedCheck({ progress, color }: { progress: Animated.Value; color: string }) {
  return (
    <AnimatedPath
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[22, 22]}
      strokeDashoffset={progress.interpolate({ inputRange: [0, 1], outputRange: [22, 0] })}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', paddingTop: 11 },
  card: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  sticker: {
    position: 'absolute',
    top: 0,
    right: 16,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: '3deg' }],
  },
  stickerText: { color: '#10170f', fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
  body: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: 9 },
  format: { fontSize: 26, lineHeight: 28, fontWeight: '800' },
  name: { flex: 1, minWidth: 0, fontSize: 24, lineHeight: 28, fontWeight: '800' },
  price: { fontSize: 22, lineHeight: 26, fontWeight: '800' },
  sub: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  venue: { flex: 1, minWidth: 0, fontSize: 14 },
  pitch: { flexShrink: 0, fontSize: 13, fontWeight: '600' },
  board: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070b09',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
  },
  boardCell: { flex: 1, alignItems: 'center', gap: 2 },
  boardLine: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.1)' },
  boardDow: { fontSize: 11, letterSpacing: 1.8, fontWeight: '700' },
  boardDay: { fontSize: 30, lineHeight: 32, fontWeight: '800' },
  boardTime: { fontSize: 36, lineHeight: 38, fontWeight: '800', letterSpacing: 1 },
  boardLabel: { fontSize: 10, letterSpacing: 1.8, fontWeight: '700' },
  bar: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 9, borderRadius: 5 },
  segOpen: { borderWidth: 1, borderStyle: 'dashed' },
  counts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  count: { flex: 1, fontSize: 13 },
  open: { flexShrink: 0, fontSize: 13, fontWeight: '600' },
  action: {
    height: 46,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  actionText: { fontSize: 16, fontWeight: '600', flexShrink: 1 },
});
