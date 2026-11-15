import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import { Crest, crestInitials } from './TeamCrest';
import type { TeamCrestDesign } from './team-service';

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

type Side = { name: string; crest: TeamCrestDesign | null };

/** Home team against the opponent, or against an empty spot while nobody has joined. */
export function FaceOff({
  home,
  away,
  awayLabel,
  awayTag,
  format,
  accent,
}: {
  home: Side;
  away: Side | null;
  awayLabel?: string;
  awayTag?: string;
  format: number;
  accent: string;
}) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const semibold = { fontFamily: bodyFont(locale, 'semibold') };
  return (
    <View style={styles.vs}>
      <View style={styles.side}>
        <Crest {...(home.crest ?? defaultCrest)} initials={crestInitials(home.name)} size={52} />
        <Text numberOfLines={2} style={[styles.sideName, semibold]}>
          {home.name}
        </Text>
        <Text style={[styles.sideTag, semibold]}>{copy.challengeHomeLabel}</Text>
      </View>
      <View style={styles.mid}>
        <Text style={[styles.vsText, { color: accent, fontFamily: displayFont(locale) }]}>VS</Text>
        <View style={styles.formatPill}>
          <Text style={[styles.formatText, semibold]}>
            {format}v{format}
          </Text>
        </View>
      </View>
      <View style={styles.side}>
        {away ? (
          <Crest {...(away.crest ?? defaultCrest)} initials={crestInitials(away.name)} size={52} />
        ) : (
          <OpenSpotCrest size={52} color={accent} />
        )}
        <Text numberOfLines={2} style={[styles.sideName, semibold]}>
          {away ? away.name : awayLabel}
        </Text>
        <Text style={[styles.sideTag, semibold]}>
          {away ? (awayTag ?? copy.challengeAwayLabel) : copy.challengeOpenSpot}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
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
  });
}
