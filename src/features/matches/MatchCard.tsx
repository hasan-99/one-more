import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { useEntrance, useLoop } from '@/components/motion';
import { useToast } from '@/components/toast/ToastProvider';
import { formatLocalNumber, formatMatchCardTime } from '@/i18n/format';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import { requestMatchJoin, withdrawMatchJoinRequest } from './match-join-service';
import type { MatchDiscoveryItem } from './match-service';

type JoinState = { status: 'idle' } | { status: 'busy' } | { status: 'sent'; participantId: string };

export function MatchCard({ match, index = 0 }: { match: MatchDiscoveryItem; index?: number }) {
  const { colors, locale } = useAppPreferences();
  const { session } = useAuth();
  const { showToast } = useToast();
  const copy = translations[locale];
  const [join, setJoin] = useState<JoinState>({ status: 'idle' });
  const entrance = useEntrance(600, 80 + index * 70, Easing.bezier(0.2, 0.9, 0.2, 1));
  const pulse = useLoop(700, { alternate: true, enabled: match.freeSpots > 0 });
  const area = locale === 'el' ? match.areaNameEl : match.areaNameEn;
  const when = formatMatchCardTime(match.startsAt, locale);
  const price =
    match.priceEur === 0 ? copy.matchFree : `€${formatLocalNumber(match.priceEur, locale)}`;
  const visibleSlots = Math.min(match.capacity, 22);
  const playersLabel = copy.matchPlayersOfTotal
    .replace('{active}', String(match.activePlayers))
    .replace('{total}', String(match.capacity));
  const openLabel =
    match.freeSpots === 1
      ? copy.matchPlacesOpenSingle
      : copy.matchPlacesOpenCount.replace('{count}', String(match.freeSpots));
  const detailsHref = `/matches/${match.id}` as Href;

  const toggleJoin = async () => {
    if (match.isOrganizer) {
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

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderColor: colors.border,
          opacity: entrance,
          transform: [
            { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) },
            { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
          ],
        },
      ]}
    >
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id={`card-${match.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.cardTop} />
            <Stop offset="1" stopColor={colors.cardBottom} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#card-${match.id})`} />
      </Svg>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${area}, ${match.sideSize}v${match.sideSize}, ${when}, ${playersLabel}, ${openLabel}, ${price} ${copy.matchPerPlayer}`}
        onPress={() => router.push(detailsHref)}
        style={styles.body}
      >
        <View style={styles.topRow}>
          <FormatTile sideSize={match.sideSize} locale={locale} />
          <View style={styles.matchInfo}>
            <Text
              numberOfLines={1}
              style={[styles.area, { color: colors.textPrimary, fontFamily: displayFont(locale) }]}
            >
              {area}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.time, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}
            >
              {when}
            </Text>
          </View>
          <View style={styles.priceBox}>
            <Text style={[styles.price, { color: colors.accentText, fontFamily: displayFont(locale) }]}>
              {price}
            </Text>
            <Text
              style={[styles.perPlayer, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}
            >
              {copy.matchPerPlayer}
            </Text>
          </View>
        </View>

        <View style={[styles.slotsBlock, { borderTopColor: colors.border }]}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.slots}
          >
            {Array.from({ length: visibleSlots }, (_, slot) => {
              const filled = slot < match.activePlayers;
              return filled ? (
                <View key={slot} style={[styles.slot, { backgroundColor: colors.accentText }]} />
              ) : (
                <Animated.View
                  key={slot}
                  style={[
                    styles.slot,
                    styles.openSlot,
                    {
                      borderColor: colors.accentText,
                      opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }),
                      transform: [
                        { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) },
                      ],
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.availabilityRow}>
            <Text style={[styles.playerCount, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}>
              {playersLabel}
            </Text>
            <Text
              style={[styles.openPlaces, { color: colors.accentText, fontFamily: bodyFont(locale, 'semibold') }]}
            >
              {openLabel}
            </Text>
          </View>
        </View>
      </Pressable>

      <JoinButton
        label={match.isOrganizer ? copy.matchOwnGame : sent ? copy.matchRequestSent : copy.matchJoinRequest}
        sent={sent}
        busy={join.status === 'busy'}
        onPress={() => void toggleJoin()}
      />
    </Animated.View>
  );
}

function JoinButton({
  label,
  sent,
  busy,
  onPress,
}: {
  label: string;
  sent: boolean;
  busy: boolean;
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
                transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
              }
            : { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
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
              color: sent ? colors.accentText : colors.primaryButtonText,
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

function FormatTile({ sideSize, locale }: { sideSize: number; locale: 'en' | 'el' }) {
  const { colors } = useAppPreferences();
  return (
    <View style={[styles.formatTile, { backgroundColor: colors.pitch }]}>
      <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
        <G stroke={colors.pitchLine} strokeWidth={1.5} opacity={0.7}>
          <Line x1="32" y1="0" x2="32" y2="64" />
          <Circle cx="32" cy="32" r="13" />
          <Rect x="-1" y="20" width="9" height="24" />
          <Rect x="56" y="20" width="9" height="24" />
        </G>
      </Svg>
      <Text
        style={[
          styles.tileFormat,
          { color: colors.pitchText, fontFamily: displayFont(locale), textShadowColor: 'rgba(0,0,0,0.6)' },
        ]}
      >
        {sideSize}v{sideSize}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 22,
    padding: 14,
    gap: 12,
    overflow: 'hidden',
  },
  body: { gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  formatTile: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    overflow: 'hidden',
  },
  tileFormat: {
    position: 'absolute',
    fontSize: 24,
    fontWeight: '800',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  matchInfo: { flex: 1, minWidth: 0, gap: 2 },
  area: { fontSize: 24, lineHeight: 25, fontWeight: '800' },
  time: { fontSize: 14, lineHeight: 19 },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 24, lineHeight: 25, fontWeight: '800' },
  perPlayer: { fontSize: 12, lineHeight: 16 },
  slotsBlock: { gap: 8, borderTopWidth: 1, paddingTop: 12 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  slot: { width: 10, height: 10, borderRadius: 5 },
  openSlot: { borderWidth: 1.5, borderStyle: 'dashed' },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  playerCount: { flexShrink: 1, fontSize: 14 },
  openPlaces: { flexShrink: 0, fontSize: 14, fontWeight: '600' },
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
