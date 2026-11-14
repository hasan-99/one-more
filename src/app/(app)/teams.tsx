import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/toast/ToastProvider';
import { AppPage } from '@/components/layout/AppPage';
import { listTeamChallenges, type TeamChallenge } from '@/features/teams/challenge-service';
import { CaptainBadge, Crest as CrestArt, crestInitials } from '@/features/teams/TeamCrest';
import { isSkillLevel, levelLabel } from '@/features/profile/PlayerProfile';
import { getProfileCompletion } from '@/features/profile/profile-service';
import {
  listMyTeamInvites,
  listMyTeams,
  listTeamDirectory,
  respondTeamInvite,
  type MyTeam,
  type TeamCrestDesign,
  type TeamDirectoryItem,
  type TeamInvite,
} from '@/features/teams/team-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function TeamsScreen() {
  const { locale, colors } = useAppPreferences();
  const { session } = useAuth();
  const { showToast } = useToast();
  const copy = translations[locale];
  const [directory, setDirectory] = useState<TeamDirectoryItem[]>([]);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const publicTeams = await listTeamDirectory();
      setDirectory(publicTeams);
      if (session) {
        const [myTeams, myInvites, complete] = await Promise.all([
          listMyTeams(),
          listMyTeamInvites(),
          getProfileCompletion(session.user.id),
        ]);
        setTeams(myTeams);
        setInvites(myInvites);
        // Challenges are a bonus on this page: a failure here must not hide the teams.
        setChallenges(
          myTeams.some((team) => team.role === 'captain')
            ? await listTeamChallenges().catch(() => [])
            : [],
        );
        setProfileComplete(complete);
      } else {
        setTeams([]);
        setInvites([]);
        setChallenges([]);
        setProfileComplete(false);
      }
    } catch {
      setLoadError(true);
      showToast(copy.teamLoadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [copy.teamLoadError, session, showToast]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const respond = async (inviteId: string, decision: 'accept' | 'decline') => {
    try {
      const result = await respondTeamInvite(inviteId, decision);
      showToast(
        result === 'expired'
          ? copy.teamInviteExpired
          : decision === 'accept'
            ? copy.teamInviteAccepted
            : copy.teamInviteDeclined,
        result === 'expired' || decision === 'decline' ? 'info' : 'success',
      );
      await load();
    } catch {
      showToast(copy.teamActionError, 'error');
    }
  };

  const styles = makeStyles(colors);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const cityName = (team: TeamDirectoryItem | MyTeam) =>
    locale === 'el' ? team.cityNameEl : team.cityNameEn;
  const isCaptain = teams.some((team) => team.role === 'captain');
  const myTeamIds = new Set(teams.map((team) => team.teamId));
  const openChallenges = challenges.filter(
    (challenge) => challenge.status === 'open' && !myTeamIds.has(challenge.homeTeamId),
  );
  const players = (count: number) =>
    count === 1 ? copy.teamPlayerOne : copy.teamPlayersCount.replace('{count}', String(count));
  const cityOptions = Array.from(
    new Map(directory.map((team) => [team.cityId, cityName(team)])).entries(),
  );
  const shownDirectory = cityFilter
    ? directory.filter((team) => team.cityId === cityFilter)
    : directory;
  return (
    <AppPage
      title={copy.appTeamsTitle}
      heading={
        <View style={styles.headWrap}>
          <View style={styles.headRow}>
            <Text
              accessibilityRole="header"
              style={[styles.headTitle, locale === 'el' && styles.headTitleGreek]}
            >
              {copy.appTeamsTitle}
            </Text>
            {session && profileComplete ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/teams/create' as Href)}
                style={({ pressed }) => [styles.headCreate, pressed && { opacity: 0.88 }]}
              >
                <View style={styles.headCreatePlus}>
                  <Text style={styles.headCreatePlusText}>+</Text>
                </View>
                <Text style={styles.createText}>{copy.teamCreateShort}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      }
    >
      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel={copy.teamDetailLoading} />
      ) : loadError ? (
        <Action label={copy.teamRetry} onPress={() => void load()} colors={colors} />
      ) : (
        <>
          {session ? (
            <>
              {profileComplete ? null : <Text style={styles.meta}>{copy.teamCreateSignIn}</Text>}
              <SectionHeader title={copy.teamMine} count={teams.length} styles={styles} />
              {teams.length ? (
                teams.map((team) => (
                  <TeamCard
                    key={team.teamId}
                    title={team.name}
                    meta={`${cityName(team)} · ${players(team.memberCount)}`}
                    crest={team.crest}
                    captain={team.role === 'captain'}
                    role={team.role === 'captain' ? copy.teamCaptain : copy.teamMember}
                    highlight={team.role === 'captain'}
                    onPress={() => router.push(`/teams/${team.teamId}` as Href)}
                    styles={styles}
                  />
                ))
              ) : (
                <EmptyRow title={copy.teamNoMineShort} hint={copy.teamNoMineHint} styles={styles} />
              )}
              <SectionHeader
                title={copy.teamInvites}
                count={invites.length}
                hot={invites.length > 0}
                styles={styles}
              />
              {invites.length ? (
                invites.map((invite) => (
                  <View key={invite.inviteId} style={styles.inviteCard}>
                    <View style={styles.cardRow}>
                      <NameTile name={invite.teamName} styles={styles} />
                      <View style={styles.cardCopy}>
                        <Text style={styles.cardTitle}>{invite.teamName}</Text>
                        <Text style={styles.meta}>
                          {locale === 'el' ? invite.cityNameEl : invite.cityNameEn} ·{' '}
                          {invite.invitedByName}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.actions}>
                      <View style={styles.actionHalf}>
                        <Action
                          label={copy.teamInviteAccept}
                          onPress={() => void respond(invite.inviteId, 'accept')}
                          colors={colors}
                        />
                      </View>
                      <View style={styles.actionHalf}>
                        <Action
                          label={copy.teamInviteDecline}
                          onPress={() => void respond(invite.inviteId, 'decline')}
                          colors={colors}
                          secondary
                        />
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <EmptyRow
                  title={copy.teamNoInvitesShort}
                  hint={copy.teamNoInvitesHint}
                  styles={styles}
                />
              )}
              {isCaptain ? (
                <>
                  <View style={styles.hero}>
                    <View style={styles.heroRing} pointerEvents="none" />
                    <Text style={styles.heroKicker}>{copy.teamChallengeKicker}</Text>
                    <Text style={styles.heroTitle}>{copy.teamChallengeHeroTitle}</Text>
                    <Text style={styles.heroCopy}>{copy.teamChallengeHeroCopy}</Text>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push('/challenges' as Href)}
                      style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.88 }]}
                    >
                      <Text style={styles.heroButtonText}>{`⚡  ${copy.challengeCreate}`}</Text>
                    </Pressable>
                  </View>
                  <View style={styles.sectionHead}>
                    <Text accessibilityRole="header" style={styles.sectionTitle}>
                      {copy.challengeDirectory}
                    </Text>
                    <Text style={styles.count}>{openChallenges.length}</Text>
                    <Pressable
                      accessibilityRole="link"
                      onPress={() => router.push('/challenges' as Href)}
                      style={styles.seeAll}
                    >
                      <Text style={styles.seeAllText}>{`${copy.teamSeeAll} ›`}</Text>
                    </Pressable>
                  </View>
                  {openChallenges.slice(0, 3).map((challenge) => (
                    <Pressable
                      key={challenge.id}
                      accessibilityRole="link"
                      onPress={() => router.push(`/challenges/${challenge.id}` as Href)}
                      style={styles.teamCard}
                    >
                      <View style={styles.cardRow}>
                        <NameTile name={challenge.homeTeamName} styles={styles} />
                        <View style={styles.cardCopy}>
                          <Text style={styles.cardTitle}>{challenge.homeTeamName}</Text>
                          <Text style={styles.meta}>
                            {`${locale === 'el' ? challenge.cityNameEl : challenge.cityNameEn} · ${formatWindow(challenge, locale)}`}
                          </Text>
                        </View>
                        <Text style={styles.vs}>VS</Text>
                      </View>
                      <View style={styles.tags}>
                        <Text style={styles.tag}>{`${challenge.format}v${challenge.format}`}</Text>
                        {isSkillLevel(challenge.skillLevel) ? (
                          <Text style={styles.tag}>{levelLabel(challenge.skillLevel, copy)}</Text>
                        ) : null}
                        <Text style={styles.tag}>
                          {locale === 'el' ? challenge.areaNameEl : challenge.areaNameEn}
                        </Text>
                      </View>
                      <View style={styles.fightButton}>
                        <Text style={styles.fightText}>{`⚔  ${copy.teamChallengeThem}`}</Text>
                      </View>
                    </Pressable>
                  ))}
                  {openChallenges.length === 0 ? (
                    <EmptyRow
                      title={copy.challengeNoOpen}
                      hint={copy.teamChallengeHint}
                      styles={styles}
                    />
                  ) : null}
                </>
              ) : null}
            </>
          ) : (
            <Text style={styles.meta}>{copy.teamCreateSignIn}</Text>
          )}
          <SectionHeader title={copy.teamDirectory} count={directory.length} styles={styles} />
          {cityOptions.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              accessibilityRole="radiogroup"
            >
              {[[null, copy.teamFilterAll] as const, ...cityOptions].map(([id, label]) => {
                const on = cityFilter === id;
                return (
                  <Pressable
                    key={id ?? 'all'}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    aria-checked={on}
                    onPress={() => setCityFilter(id)}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          {shownDirectory.length ? (
            shownDirectory.map((team) => (
              <TeamCard
                key={team.teamId}
                title={team.name}
                meta={`${cityName(team)} · ${players(team.memberCount)}`}
                role=""
                crest={team.crest}
                onPress={() => router.push(`/teams/${team.teamId}` as Href)}
                styles={styles}
              />
            ))
          ) : (
            <EmptyRow
              title={copy.teamNoDirectoryShort}
              hint={cityFilter ? copy.teamNoCityTeams : copy.teamNoDirectoryHint}
              styles={styles}
            />
          )}
        </>
      )}
    </AppPage>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function formatWindow(challenge: TeamChallenge, locale: string) {
  const first = challenge.windows[0];
  if (!first) return '';
  const start = new Date(first.startsAt);
  const end = new Date(first.endsAt);
  const day = start.toLocaleDateString(locale === 'el' ? 'el-GR' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Nicosia',
  });
  const time = (date: Date) =>
    date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Nicosia',
    });
  return `${day} ${time(start)}–${time(end)}`;
}
const crestColors = ['#cfff4a', '#3db8ff', '#ffb347', '#c79bff', '#3ff0c0'];

function NameTile({ name, styles }: { name: string; styles: Styles }) {
  const initials = name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  const colour =
    crestColors[
      Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % crestColors.length
    ];
  return (
    <View accessible={false} style={[styles.crest, { backgroundColor: colour }]}>
      <Text style={styles.crestText}>{initials}</Text>
    </View>
  );
}

function SectionHeader({
  title,
  count,
  hot = false,
  styles,
}: {
  title: string;
  count: number;
  hot?: boolean;
  styles: Styles;
}) {
  return (
    <View style={styles.sectionHead}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      <Text style={[styles.count, hot && styles.countHot]}>{count}</Text>
    </View>
  );
}

function EmptyRow({ title, hint, styles }: { title: string; hint: string; styles: Styles }) {
  return (
    <View style={styles.emptyRow}>
      <View style={styles.cardCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.meta}>{hint}</Text>
      </View>
    </View>
  );
}

function TeamCard({
  title,
  meta,
  role,
  crest = null,
  captain = false,
  highlight = false,
  onPress,
  styles,
}: {
  title: string;
  meta: string;
  role: string;
  crest?: TeamCrestDesign | null;
  captain?: boolean;
  highlight?: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.teamCard}>
      <View style={styles.cardRow}>
        {crest ? (
          <View style={styles.crestSlot}>
            <CrestArt {...crest} initials={crestInitials(title)} size={44} />
          </View>
        ) : (
          <NameTile name={title} styles={styles} />
        )}
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {captain ? (
          <CaptainBadge label={role} />
        ) : role ? (
          <Text style={[styles.badge, highlight && styles.badgeHot]}>{role}</Text>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </View>
    </Pressable>
  );
}

function Action({
  label,
  onPress,
  colors,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: secondary ? colors.surfaceRaised : colors.primaryButton,
        borderColor: colors.border,
        borderWidth: secondary ? 1 : 0,
        borderRadius: 10,
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 14,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text
        style={{
          textAlign: 'center',
          fontWeight: '700',
          color: secondary ? colors.textPrimary : colors.primaryButtonText,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    headWrap: { gap: 14 },
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
    headTitleGreek: { fontFamily: 'Inter_600SemiBold', fontSize: 30, lineHeight: 38 },
    headCreate: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 48,
      paddingLeft: 6,
      paddingRight: 16,
      borderRadius: 24,
      backgroundColor: colors.primaryButton,
    },
    headCreatePlus: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryButtonText,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headCreatePlusText: {
      color: colors.primaryButton,
      fontSize: 22,
      lineHeight: 24,
      fontWeight: '800',
    },
    createButton: {
      alignSelf: 'flex-start',
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.primaryButton,
    },
    createText: { color: colors.primaryButtonText, fontSize: 15, fontWeight: '700' },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    sectionTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '800' },
    count: {
      color: colors.textSecondary,
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderWidth: 1,
      overflow: 'hidden',
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      fontSize: 12,
      fontWeight: '700',
    },
    countHot: {
      color: colors.primaryButtonText,
      backgroundColor: colors.primaryButton,
      borderColor: colors.primaryButton,
    },
    teamCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 12,
    },
    inviteCard: {
      borderWidth: 1,
      borderColor: colors.primaryButton,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 12,
      gap: 12,
    },
    emptyRow: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 18,
      padding: 14,
    },
    emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardCopy: { flexShrink: 1, flexGrow: 1, gap: 2 },
    crestSlot: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    crest: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    crestText: { color: '#10170f', fontSize: 16, fontWeight: '800' },
    cardTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
    meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    chevron: { color: colors.textSecondary, fontSize: 24 },
    badge: {
      color: colors.textSecondary,
      backgroundColor: colors.surfaceRaised,
      overflow: 'hidden',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      fontSize: 12,
      fontWeight: '700',
    },
    badgeHot: { color: colors.accentText, backgroundColor: colors.cardTop },
    actions: { flexDirection: 'row', gap: 8 },
    actionHalf: { flex: 1 },
    hero: {
      overflow: 'hidden',
      borderRadius: 22,
      padding: 18,
      gap: 4,
      backgroundColor: '#a8ec2a',
    },
    heroRing: {
      position: 'absolute',
      right: -40,
      top: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 18,
      borderColor: 'rgba(16,23,15,0.1)',
    },
    heroKicker: {
      color: '#10170f',
      opacity: 0.7,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.6,
    },
    heroTitle: { color: '#10170f', fontSize: 26, lineHeight: 29, fontWeight: '800' },
    heroCopy: { color: '#10170f', opacity: 0.85, fontSize: 14, lineHeight: 20, maxWidth: 260 },
    heroButton: {
      marginTop: 12,
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: '#10170f',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroButtonText: { color: '#cfff4a', fontSize: 16, fontWeight: '800' },
    vs: {
      flexShrink: 0,
      color: '#ff8a3d',
      borderColor: 'rgba(255,138,61,0.4)',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 3,
      fontSize: 12,
      fontWeight: '800',
      overflow: 'hidden',
    },
    fightButton: {
      marginTop: 12,
      minHeight: 46,
      borderRadius: 13,
      backgroundColor: '#ff6a3d',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fightText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
    seeAll: { marginLeft: 'auto', minHeight: 36, justifyContent: 'center' },
    seeAllText: { color: colors.accentText, fontSize: 13, fontWeight: '700' },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    tag: {
      color: colors.textSecondary,
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderWidth: 1,
      overflow: 'hidden',
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 11,
      fontWeight: '700',
    },
    chips: { gap: 8, paddingVertical: 2 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 14,
      minHeight: 36,
      justifyContent: 'center',
    },
    chipOn: { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
    chipText: { color: colors.textSecondary, fontSize: 13 },
    chipTextOn: { color: colors.primaryButtonText, fontWeight: '700' },
  });
}
