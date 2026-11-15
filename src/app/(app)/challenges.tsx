import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppPage } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import { getProfileCompletion } from '@/features/profile/profile-service';
import { ChallengeCard, OpenSpotCrest } from '@/features/teams/ChallengeCard';
import { listTeamChallenges, type TeamChallenge } from '@/features/teams/challenge-service';
import {
  listMyTeams,
  listTeamDirectory,
  type TeamCrestDesign,
} from '@/features/teams/team-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont } from '@/theme/typography';

const formats = [5, 8, 11] as const;

export default function ChallengesScreen() {
  const { locale, colors } = useAppPreferences();
  const { session } = useAuth();
  const { showToast } = useToast();
  const copy = translations[locale];
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [crests, setCrests] = useState<Record<string, TeamCrestDesign | null>>({});
  const [captainOf, setCaptainOf] = useState<string[]>([]);
  const [canPost, setCanPost] = useState(false);
  const [format, setFormat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [open, directory] = await Promise.all([
        listTeamChallenges(),
        listTeamDirectory().catch(() => []),
      ]);
      setChallenges(open);
      setCrests(Object.fromEntries(directory.map((team) => [team.teamId, team.crest ?? null])));
      if (session) {
        const [mine, complete] = await Promise.all([
          listMyTeams(),
          getProfileCompletion(session.user.id),
        ]);
        const captained = mine.filter((team) => team.role === 'captain');
        setCaptainOf(captained.map((team) => team.teamId));
        setCanPost(complete && captained.length > 0);
      } else {
        setCaptainOf([]);
        setCanPost(false);
      }
    } catch {
      setLoadError(true);
      showToast(copy.challengeLoadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [copy.challengeLoadError, session, showToast]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visible = challenges.filter((item) => format === null || item.format === format);
  const post = () => router.push('/challenges/create' as Href);
  const count =
    visible.length === 1
      ? copy.challengeCountOne
      : copy.challengeCountMany.replace('{count}', String(visible.length));

  return (
    <AppPage
      title={copy.challengeDirectory}
      heading={
        <View style={{ gap: 8 }}>
          <View style={styles.headRow}>
            <Text
              accessibilityRole="header"
              style={[styles.headTitle, locale === 'el' && styles.headTitleGreek]}
            >
              {copy.challengeDirectory}
            </Text>
            {canPost ? (
              <Pressable
                accessibilityRole="button"
                onPress={post}
                style={({ pressed }) => [styles.add, pressed && { opacity: 0.88 }]}
              >
                <Text style={[styles.addText, { fontFamily: bodyFont(locale, 'semibold') }]}>
                  {copy.challengeAddShort}
                </Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={[styles.sub, { fontFamily: bodyFont(locale) }]}>
            {copy.challengeListSub}
          </Text>
        </View>
      }
    >
      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel={copy.chatLoading} />
      ) : loadError ? (
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.retry}>
          <Text style={styles.retryText}>{copy.challengeRetry}</Text>
        </Pressable>
      ) : (
        <>
          {challenges.length > 0 ? (
            <View accessibilityRole="radiogroup" style={styles.chips}>
              {[null, ...formats].map((value) => {
                const selected = format === value;
                return (
                  <Pressable
                    key={String(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setFormat(value)}
                    style={[styles.chip, selected && styles.chipOn]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { fontFamily: bodyFont(locale, 'semibold') },
                        selected && styles.chipTextOn,
                      ]}
                    >
                      {value === null ? copy.challengeAllFormats : `${value}v${value}`}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {challenges.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyVs}>
                <OpenSpotCrest size={52} color={colors.accentText} />
                <Text style={[styles.emptyVsText, { fontFamily: 'BarlowCondensed_800ExtraBold' }]}>
                  VS
                </Text>
                <OpenSpotCrest size={52} color={colors.accentText} />
              </View>
              <Text style={[styles.emptyTitle, { fontFamily: bodyFont(locale, 'semibold') }]}>
                {copy.appNoChallengesTitle}
              </Text>
              <Text style={[styles.emptyCopy, { fontFamily: bodyFont(locale) }]}>
                {copy.challengeEmptyCopy}
              </Text>
              {canPost ? (
                <Pressable accessibilityRole="button" onPress={post} style={styles.emptyButton}>
                  <Text style={[styles.addText, { fontFamily: bodyFont(locale, 'semibold') }]}>
                    {copy.challengeCreate}
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.emptyCopy, { fontFamily: bodyFont(locale) }]}>
                  {session ? copy.challengeNoCaptainTeams : copy.challengeSignIn}
                </Text>
              )}
            </View>
          ) : (
            <>
              <Text style={[styles.count, { fontFamily: bodyFont(locale) }]}>{count}</Text>
              <View style={styles.list}>
                {visible.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    crest={crests[challenge.homeTeamId] ?? null}
                    mine={captainOf.includes(challenge.homeTeamId)}
                  />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </AppPage>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    headRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    headTitle: {
      color: colors.textPrimary,
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 40,
      lineHeight: 44,
      fontWeight: '700',
      flexShrink: 1,
    },
    headTitleGreek: { fontFamily: 'Inter_600SemiBold', fontSize: 28, lineHeight: 36 },
    add: {
      flexShrink: 0,
      minHeight: 44,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.primaryButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: { color: colors.primaryButtonText, fontSize: 15, fontWeight: '700' },
    sub: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipOn: { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
    chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
    chipTextOn: { color: colors.primaryButtonText },
    count: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
    list: { gap: 14 },
    empty: {
      alignItems: 'center',
      gap: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: 'rgba(207,255,74,0.35)',
      borderRadius: 22,
      padding: 20,
    },
    emptyVs: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      alignSelf: 'stretch',
      backgroundColor: '#070b09',
      borderRadius: 18,
      paddingVertical: 16,
    },
    emptyVsText: { color: colors.accentText, fontSize: 30 },
    emptyTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center' },
    emptyCopy: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    emptyButton: {
      minHeight: 48,
      paddingHorizontal: 24,
      borderRadius: 14,
      backgroundColor: colors.primaryButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retry: {
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: colors.primaryButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: { color: colors.primaryButtonText, fontWeight: '700' },
  });
}
