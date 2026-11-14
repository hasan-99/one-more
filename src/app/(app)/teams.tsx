import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/toast/ToastProvider';
import { AppPage } from '@/components/layout/AppPage';
import { getProfileCompletion } from '@/features/profile/profile-service';
import {
  listMyTeamInvites,
  listMyTeams,
  listTeamDirectory,
  respondTeamInvite,
  type MyTeam,
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
        setProfileComplete(complete);
      } else {
        setTeams([]);
        setInvites([]);
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
  const players = (count: number) => copy.teamPlayersCount.replace('{count}', String(count));
  const cityOptions = Array.from(
    new Map(directory.map((team) => [team.cityId, cityName(team)])).entries(),
  );
  const shownDirectory = cityFilter
    ? directory.filter((team) => team.cityId === cityFilter)
    : directory;
  return (
    <AppPage title={copy.appTeamsTitle} description={copy.appTeamsIntro}>
      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel={copy.teamDetailLoading} />
      ) : loadError ? (
        <Action label={copy.teamRetry} onPress={() => void load()} colors={colors} />
      ) : (
        <>
          {session ? (
            <>
              {profileComplete ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push('/teams/create' as Href)}
                  style={({ pressed }) => [styles.createButton, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.createText}>{`+  ${copy.teamCreateAction}`}</Text>
                </Pressable>
              ) : (
                <Text style={styles.meta}>{copy.teamCreateSignIn}</Text>
              )}
              <SectionHeader title={copy.teamMine} count={teams.length} styles={styles} />
              {teams.length ? (
                teams.map((team) => (
                  <TeamCard
                    key={team.teamId}
                    title={team.name}
                    meta={`${cityName(team)} · ${players(team.memberCount)}`}
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
                      <Crest name={invite.teamName} styles={styles} />
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
                onPress={() => router.push(`/teams/${team.teamId}` as Href)}
                styles={styles}
              />
            ))
          ) : (
            <EmptyRow
              title={copy.teamNoDirectory}
              hint={cityFilter ? copy.teamNoCityTeams : copy.appTeamsIntro}
              styles={styles}
            />
          )}
        </>
      )}
    </AppPage>
  );
}

type Styles = ReturnType<typeof makeStyles>;
const crestColors = ['#cfff4a', '#3db8ff', '#ffb347', '#c79bff', '#3ff0c0'];

function Crest({ name, styles }: { name: string; styles: Styles }) {
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
  highlight = false,
  onPress,
  styles,
}: {
  title: string;
  meta: string;
  role: string;
  highlight?: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.teamCard}>
      <View style={styles.cardRow}>
        <Crest name={title} styles={styles} />
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.meta}>{meta}</Text>
        </View>
        {role ? (
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
