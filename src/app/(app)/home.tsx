import type { Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { SkeletonList } from '@/components/loading/Skeleton';
import { Rise } from '@/components/motion';
import {
  HomeGameRail,
  HomeGreeting,
  HomeNeedBar,
  HomeSectionHead,
  HomeTeamRow,
  HomeTiles,
} from '@/features/home/HomeParts';
import { HomeStadium } from '@/features/home/HomeStadium';
import {
  firstName,
  greetingKey,
  openGames,
  tickerFacts,
  type HomeMatch,
} from '@/features/home/home-logic';
import { loadHomeMatches, loadHomePersonal, type HomePersonal } from '@/features/home/home-service';
import { useNow } from '@/features/home/use-now';
import { useUnreadCount } from '@/features/notifications/unread-store';
import { translations } from '@/i18n';
import { withTimeout } from '@/lib/with-timeout';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont } from '@/theme/typography';

const loadTimeoutMs = 15_000;
type Loaded<T> = { key: string; value: T | null };

export default function AppHomeScreen() {
  const { locale, colors } = useAppPreferences();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const copy = translations[locale];
  const unread = useUnreadCount();
  const now = useNow(1000);
  const [attempt, setAttempt] = useState(0);
  const [games, setGames] = useState<Loaded<HomeMatch[]> | null>(null);
  const [personal, setPersonal] = useState<Loaded<HomePersonal> | null>(null);

  // `value: null` means the load failed; a different key means it is still loading.
  const gamesKey = `games:${attempt}`;
  const personalKey = user ? `${user.id}:${attempt}` : null;
  const gamesLoading = games?.key !== gamesKey;
  const upcoming = gamesLoading ? null : games.value;
  const mine = personalKey && personal?.key === personalKey ? personal : null;
  const personalLoading = Boolean(personalKey) && !gamesLoading && !mine;

  useEffect(() => {
    let active = true;
    void withTimeout(loadHomeMatches(), loadTimeoutMs)
      .then((value) => {
        if (active) setGames({ key: gamesKey, value });
      })
      .catch(() => {
        if (active) setGames({ key: gamesKey, value: null });
      });
    return () => {
      active = false;
    };
  }, [gamesKey]);

  useEffect(() => {
    if (!user || !personalKey || gamesLoading) return;
    let active = true;
    void withTimeout(loadHomePersonal(user.id, upcoming ?? []), loadTimeoutMs)
      .then((value) => {
        if (active) setPersonal({ key: personalKey, value });
      })
      .catch(() => {
        if (active) setPersonal({ key: personalKey, value: null });
      });
    return () => {
      active = false;
    };
  }, [gamesLoading, personalKey, upcoming, user]);

  const retry = () => setAttempt((value) => value + 1);
  const next = mine?.value?.next ?? null;
  const open = upcoming && now !== null ? openGames(upcoming, next?.id ?? null, 8, now) : [];
  const name = firstName(user?.user_metadata?.display_name);
  const greeting = name ? `${copy[greetingKey(now)]}, ${name}` : copy[greetingKey(now)];
  const lines = tickerFacts(open, unread).map((fact) => {
    if (fact.kind === 'open') {
      return fact.count === 1
        ? copy.homeTickerOpenOne
        : copy.homeTickerOpen.replace('{count}', String(fact.count));
    }
    if (fact.kind === 'last') return copy.homeTickerLast.replace('{title}', fact.title);
    if (fact.kind === 'unread') {
      return fact.count === 1
        ? copy.homeTickerUnreadOne
        : copy.homeTickerUnread.replace('{count}', String(fact.count));
    }
    return copy.homeTickerNone;
  });
  const pending = mine?.value?.pendingRequests ?? 0;
  const invite = mine?.value?.invites[0] ?? null;
  const teams = mine?.value?.teams ?? [];
  const openChip =
    open.length === 0
      ? null
      : open.length === 1
        ? copy.homeOpenCountOne
        : copy.homeOpenCount.replace('{count}', String(open.length));
  const semibold = bodyFont(locale, 'semibold');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={StyleSheet.flatten([
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 112 },
        ])}
        showsVerticalScrollIndicator={false}
      >
        <Rise>
          <HomeGreeting greeting={greeting} lines={lines} />
        </Rise>

        {gamesLoading || personalLoading ? (
          <SkeletonList kind="detail" label={copy.homeLoading} />
        ) : (
          <Rise delay={80}>
            <HomeStadium match={next} now={now} openChip={openChip} />
          </Rise>
        )}

        {mine && mine.value === null ? (
          <HomeNeedBar
            tone="error"
            title={copy.homePersonalError}
            action={copy.homeRetry}
            onPress={retry}
          />
        ) : next && pending > 0 ? (
          <Rise delay={160}>
            <HomeNeedBar
              title={
                pending === 1
                  ? copy.homeNeedApprovalsOne
                  : copy.homeNeedApprovals.replace('{count}', String(pending))
              }
              subtitle={copy.homeNeedApprovalsSub.replace('{title}', next.title)}
              action={copy.homeNeedReview}
              href={`/matches/${next.id}` as Href}
            />
          </Rise>
        ) : invite ? (
          <Rise delay={160}>
            <HomeNeedBar
              title={copy.homeNeedInvite.replace('{team}', invite.teamName)}
              subtitle={copy.homeNeedInviteSub}
              action={copy.homeNeedView}
              href={'/teams' as Href}
            />
          </Rise>
        ) : null}

        <Rise delay={220} style={styles.section}>
          <HomeSectionHead eyebrow={copy.homeQuickEyebrow} title={copy.homeQuickTitle} />
          <HomeTiles />
        </Rise>

        <Rise delay={300} style={styles.section}>
          <HomeSectionHead
            eyebrow={copy.homeRailEyebrow}
            title={copy.homeRailTitle}
            link={{ label: copy.appHomeSeeGames, href: '/explore' as Href }}
          />
          {gamesLoading ? (
            <SkeletonList kind="row" count={2} label={copy.matchLoading} />
          ) : upcoming === null ? (
            <HomeNeedBar
              tone="error"
              title={copy.homeRailError}
              action={copy.homeRetry}
              onPress={retry}
            />
          ) : open.length > 0 ? (
            <HomeGameRail games={open} />
          ) : (
            <View
              style={[
                styles.empty,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: semibold }]}
              >
                {copy.appNoGamesTitle}
              </Text>
              <Text
                style={[
                  styles.emptyCopy,
                  { color: colors.textSecondary, fontFamily: bodyFont(locale) },
                ]}
              >
                {copy.appNoGamesCopy}
              </Text>
            </View>
          )}
        </Rise>

        {teams.length > 0 ? (
          <Rise delay={360} style={styles.section}>
            <HomeSectionHead
              eyebrow={copy.homeTeamsEyebrow}
              title={copy.homeTeamsTitle}
              link={{ label: copy.homeTeamsAll, href: '/teams' as Href }}
            />
            {teams.slice(0, 2).map((team) => (
              <HomeTeamRow key={team.teamId} team={team} />
            ))}
          </Rise>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 18,
  },
  section: { gap: 12 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 6 },
  emptyTitle: { fontSize: 16 },
  emptyCopy: { fontSize: 14, lineHeight: 20 },
});
