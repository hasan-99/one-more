import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { matchTicketParts } from '@/i18n/format';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import type { TeamChallenge } from './challenge-service';
import { Crest, crestInitials } from './TeamCrest';
import type { TeamCrestDesign } from './team-service';

const amber = '#ffb84a';
const ink = '#10170f';
const dayMs = 24 * 60 * 60_000;

export const defaultCrest: TeamCrestDesign = {
  shape: 'shield',
  color: '#cfff4a',
  pattern: 'plain',
  emblem: 'initials',
};

/** The empty shield where the opponent will go. */
export function OpenSpotCrest({ size, color }: { size: number; color: string }) {
  return (
    <View
      style={{
        width: size,
        height: size * 1.1,
        borderRadius: size * 0.28,
        borderBottomLeftRadius: size * 0.5,
        borderBottomRightRadius: size * 0.5,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color, fontSize: size * 0.5, fontWeight: '800' }}>?</Text>
    </View>
  );
}

/** One open challenge as a face-off: the home team against an empty spot, with its time slots. */
export function ChallengeCard({
  challenge,
  crest,
  mine,
}: {
  challenge: TeamChallenge;
  crest: TeamCrestDesign | null;
  mine: boolean;
}) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [now] = useState(() => Date.now());
  const isNew = now - Date.parse(challenge.createdAt) < 2 * dayMs;
  const accent = mine ? colors.accentText : isNew ? amber : colors.accentText;
  const sticker = mine ? copy.challengeStickerMine : isNew ? copy.challengeStickerNew : null;
  const area = locale === 'el' ? challenge.areaNameEl : challenge.areaNameEn;
  const city = locale === 'el' ? challenge.cityNameEl : challenge.cityNameEn;
  const asks =
    challenge.requestCount === 0
      ? copy.challengeNoAsks
      : challenge.requestCount === 1
        ? copy.challengeAsksOne
        : copy.challengeAsksMany.replace('{count}', String(challenge.requestCount));
  const label = `${challenge.homeTeamName}, ${challenge.format}v${challenge.format}, ${area}, ${asks}`;
  const look = crest ?? defaultCrest;

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={() => router.push(`/challenges/${challenge.id}` as Href)}
        style={({ pressed }) => [
          styles.card,
          {
            borderColor: mine || isNew ? accent : colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.vs}>
          <View style={styles.side}>
            <Crest {...look} initials={crestInitials(challenge.homeTeamName)} size={52} />
            <Text
              numberOfLines={2}
              style={[styles.sideName, { fontFamily: bodyFont(locale, 'semibold') }]}
            >
              {challenge.homeTeamName}
            </Text>
            <Text style={[styles.sideTag, { fontFamily: bodyFont(locale, 'semibold') }]}>
              {copy.challengeHomeLabel}
            </Text>
          </View>
          <View style={styles.mid}>
            <Text style={[styles.vsText, { color: accent, fontFamily: displayFont(locale) }]}>
              VS
            </Text>
            <View style={styles.formatPill}>
              <Text style={[styles.formatText, { fontFamily: bodyFont(locale, 'semibold') }]}>
                {challenge.format}v{challenge.format}
              </Text>
            </View>
          </View>
          <View style={styles.side}>
            <OpenSpotCrest size={52} color={accent} />
            <Text
              numberOfLines={2}
              style={[styles.sideName, { fontFamily: bodyFont(locale, 'semibold') }]}
            >
              {mine ? copy.challengeSlotWaiting : copy.challengeSlotQuestion}
            </Text>
            <Text style={[styles.sideTag, { fontFamily: bodyFont(locale, 'semibold') }]}>
              {copy.challengeOpenSpot}
            </Text>
          </View>
        </View>

        <Text numberOfLines={1} style={[styles.where, { fontFamily: bodyFont(locale) }]}>
          📍 <Text style={{ color: colors.textPrimary }}>{`${area}, ${city}`}</Text>
        </Text>

        <View style={styles.slots}>
          {challenge.windows.slice(0, 5).map((window) => {
            const start = matchTicketParts(window.startsAt, locale);
            const end = matchTicketParts(window.endsAt, locale);
            return (
              <View key={window.startsAt} style={styles.slot}>
                <Text style={[styles.slotText, { fontFamily: bodyFont(locale, 'semibold') }]}>
                  {`${start.weekday} ${start.day}  `}
                  <Text style={{ color: accent }}>{`${start.time}–${end.time}`}</Text>
                </Text>
              </View>
            );
          })}
        </View>

        {challenge.note ? (
          <Text numberOfLines={2} style={[styles.note, { fontFamily: bodyFont(locale) }]}>
            “{challenge.note}”
          </Text>
        ) : null}

        <View style={styles.foot}>
          <Text style={[styles.asks, { color: accent, fontFamily: bodyFont(locale, 'semibold') }]}>
            {asks}
          </Text>
          <View
            style={[
              styles.cta,
              mine
                ? { borderColor: accent, borderWidth: 1.5 }
                : { backgroundColor: accent, borderColor: accent, borderWidth: 1.5 },
            ]}
          >
            <Text
              style={[
                styles.ctaText,
                { color: mine ? accent : ink, fontFamily: bodyFont(locale, 'semibold') },
              ]}
            >
              {mine ? copy.challengeManage : copy.challengeChallengeThem}
            </Text>
          </View>
        </View>
      </Pressable>
      {sticker ? (
        <View pointerEvents="none" style={[styles.sticker, { backgroundColor: accent }]}>
          <Text style={[styles.stickerText, { fontFamily: bodyFont(locale, 'semibold') }]}>
            {sticker}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    wrap: { width: '100%', paddingTop: 11 },
    card: {
      borderWidth: 1.5,
      borderRadius: 22,
      padding: 14,
      gap: 11,
      backgroundColor: colors.cardBottom,
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
    stickerText: { color: ink, fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
    vs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#070b09',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    side: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5 },
    sideName: { color: colors.textPrimary, fontSize: 14, maxWidth: '100%', textAlign: 'center' },
    sideTag: { color: colors.textSecondary, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
    mid: { alignItems: 'center', gap: 4 },
    vsText: { fontSize: 26, lineHeight: 28, fontWeight: '800' },
    formatPill: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    formatText: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
    where: { color: colors.textSecondary, fontSize: 13 },
    slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    slot: {
      borderColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    slotText: { color: colors.textPrimary, fontSize: 12, fontWeight: '700' },
    note: { color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' },
    foot: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    asks: { flex: 1, fontSize: 13, fontWeight: '700' },
    cta: {
      height: 40,
      borderRadius: 12,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: { fontSize: 14, fontWeight: '700' },
  });
}
