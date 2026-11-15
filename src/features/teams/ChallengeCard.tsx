import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { matchTicketParts } from '@/i18n/format';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont } from '@/theme/typography';

import type { TeamChallenge } from './challenge-service';
import { defaultCrest, FaceOff } from './FaceOff';
import type { TeamCrestDesign } from './team-service';

export { defaultCrest, OpenSpotCrest } from './FaceOff';

const amber = '#ffb84a';
const ink = '#10170f';
const dayMs = 24 * 60 * 60_000;

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
        <FaceOff
          home={{ name: challenge.homeTeamName, crest: look }}
          away={null}
          awayLabel={mine ? copy.challengeSlotWaiting : copy.challengeSlotQuestion}
          format={challenge.format}
          accent={accent}
        />

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
