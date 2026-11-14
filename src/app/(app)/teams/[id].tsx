import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';

import { useToast } from '@/components/toast/ToastProvider';
import { AppPage, EmptyState } from '@/components/layout/AppPage';
import { loadMatchFilters, type MatchCity } from '@/features/matches/match-service';
import {
  inviteTeamMember,
  leaveTeam,
  loadTeamDetails,
  removeTeamMember,
  revokeTeamInvite,
  saveTeam,
  searchTeamCandidates,
  transferTeamCaptain,
  type TeamCandidate,
  type TeamDetails,
} from '@/features/teams/team-service';
import {
  CaptainBadge,
  Crest,
  crestInitials,
  scoreOf,
  scoreTiers,
} from '@/features/teams/TeamCrest';
import { validateTeamInput } from '@/features/teams/team-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function TeamDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, colors } = useAppPreferences();
  const { showToast } = useToast();
  const copy = translations[locale];
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [cities, setCities] = useState<MatchCity[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cityId, setCityId] = useState('');
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<TeamCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [inviteY, setInviteY] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [detail, filters] = await Promise.all([loadTeamDetails(id), loadMatchFilters()]);
      setTeam(detail);
      setCities(filters.cities);
      if (detail) {
        setName(detail.name);
        setDescription(detail.description ?? '');
        setCityId(detail.cityId);
      }
    } catch {
      setLoadError(true);
      showToast(copy.teamLoadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [copy.teamLoadError, id, showToast]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const action = async (operation: () => Promise<void>, success: string) => {
    setWorking(true);
    try {
      await operation();
      showToast(success, 'success');
      await load();
    } catch {
      showToast(copy.teamActionError, 'error');
    } finally {
      setWorking(false);
    }
  };

  const doSearch = async () => {
    if (query.trim().length < 3) return showToast(copy.teamActionError, 'error');
    try {
      setCandidates(await searchTeamCandidates(id, query.trim()));
    } catch {
      showToast(copy.teamActionError, 'error');
    }
  };

  const saveDetails = () => {
    const validation = validateTeamInput({ name, cityId, description });
    if (validation) return showToast(copy[validation], 'error');
    void action(
      () => saveTeam(id, { name: name.trim(), cityId, description: description.trim() }),
      copy.teamSaveSuccess,
    );
  };

  const styles = makeStyles(colors);
  const city = (item: Pick<MatchCity, 'name_en' | 'name_el'>) =>
    locale === 'el' ? item.name_el : item.name_en;
  if (loading)
    return (
      <AppPage title={copy.appTeamDetailsTitle}>
        <View accessibilityRole="progressbar" accessibilityLabel={copy.teamDetailLoading} />
      </AppPage>
    );
  if (loadError)
    return (
      <AppPage title={copy.appTeamDetailsTitle}>
        <Action label={copy.teamRetry} onPress={() => void load()} colors={colors} />
        <Action
          label={copy.appGoTeams}
          onPress={() => router.replace('/teams' as Href)}
          colors={colors}
          secondary
        />
      </AppPage>
    );
  if (!team)
    return (
      <AppPage title={copy.appTeamDetailsTitle}>
        <EmptyState title={copy.teamDetailUnavailable} description={copy.appTeamUnavailable} />
        <Action
          label={copy.appGoTeams}
          onPress={() => router.replace('/teams' as Href)}
          colors={colors}
          secondary
        />
      </AppPage>
    );

  const isCaptain = team.viewerRole === 'captain';
  const isMember = team.viewerRole === 'member';
  const cityLabel = locale === 'el' ? team.cityNameEl : team.cityNameEn;
  const crest = team.crest ?? {
    shape: 'shield',
    color: '#cfff4a',
    pattern: 'plain',
    emblem: 'initials',
  };
  const initials = crestInitials(team.name);
  const score = scoreOf(crest);
  const tier = scoreTiers.find((item) => score >= item.from) ?? scoreTiers[scoreTiers.length - 1];
  const subtitle = [
    cityLabel,
    team.format ? `${team.format}v${team.format}` : null,
    team.openToPlayers === null ? null : team.openToPlayers ? copy.teamOpenTag : copy.teamClosedTag,
  ]
    .filter(Boolean)
    .join(' · ');
  const shareTeam = async () => {
    try {
      await Share.share({ message: copy.teamShareMessage.replace('{name}', team.name) });
    } catch {
      // The share sheet being dismissed or unavailable is not an error worth a message.
    }
  };
  const goToInvite = () =>
    scrollRef.current?.scrollTo({ y: Math.max(inviteY - 12, 0), animated: true });

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <View accessibilityLabel={team.name} style={styles.hero}>
          <Crest
            {...crest}
            initials={initials}
            size={112}
            label={`${copy.teamWizardCrestLabel}: ${team.name}`}
          />
          <Text accessibilityRole="header" style={styles.heroName}>
            {team.name}
          </Text>
          <Text style={styles.meta}>{subtitle}</Text>
          {team.description ? <Text style={styles.heroDescription}>{team.description}</Text> : null}
          <View style={styles.heroChips}>
            {isCaptain || isMember ? (
              <Text style={[styles.chip, isCaptain && styles.chipHot]}>
                {isCaptain ? copy.teamYouCaptain : copy.teamYouMember}
              </Text>
            ) : null}
            <Text style={styles.chip}>
              {team.members.length === 1
                ? copy.teamPlayerOne
                : copy.teamPlayersCount.replace('{count}', String(team.members.length))}
            </Text>
            {team.crest ? (
              <Text style={styles.chip}>{`${copy[tier.label]} · ${score}`}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.quickActions}>
          {isCaptain ? (
            <>
              <Pressable
                accessibilityRole="button"
                onPress={goToInvite}
                style={[styles.quick, styles.quickPrimary]}
              >
                <Text style={styles.quickPrimaryText}>{`+  ${copy.teamInviteHero}`}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/challenges' as Href)}
                style={[styles.quick, styles.quickFight]}
              >
                <Text style={styles.quickFightText}>{`⚔  ${copy.teamChallengeHero}`}</Text>
              </Pressable>
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.teamShareHero}
            onPress={() => void shareTeam()}
            style={[styles.quick, styles.quickShare, !isCaptain && { flex: 1 }]}
          >
            <Text style={styles.quickShareText}>
              {isCaptain ? '⇪' : `⇪  ${copy.teamShareHero}`}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {copy.teamMembers}
            </Text>
            <Text style={styles.count}>{team.members.length}</Text>
          </View>
          <View style={styles.listCard}>
            {team.members.map((member, index) => (
              <View key={member.id} style={[styles.memberRow, index > 0 && styles.rowDivider]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {Array.from(member.displayName)[0]?.toUpperCase() ?? '?'}
                  </Text>
                </View>
                <View style={styles.memberCopy}>
                  <Text style={styles.memberName}>{member.displayName}</Text>
                  {isCaptain && member.role !== 'captain' ? (
                    <View style={styles.actions}>
                      <Action
                        label={copy.teamTransferCaptain}
                        disabled={working || !member.userId}
                        onPress={() =>
                          member.userId &&
                          void action(
                            () => transferTeamCaptain(id, member.userId as string),
                            copy.teamCaptainTransferred,
                          )
                        }
                        colors={colors}
                        secondary
                        small
                      />
                      <Action
                        label={copy.teamRemove}
                        onPress={() =>
                          void action(() => removeTeamMember(id, member.id), copy.teamRemovedMember)
                        }
                        colors={colors}
                        secondary
                        small
                      />
                    </View>
                  ) : null}
                </View>
                {member.role === 'captain' ? (
                  <CaptainBadge label={copy.teamCaptain} />
                ) : (
                  <Text style={styles.badge}>{copy.teamMember}</Text>
                )}
              </View>
            ))}
          </View>
          {isCaptain && team.members.length === 1 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.meta}>{copy.teamSquadHint}</Text>
            </View>
          ) : null}
        </View>

        {isCaptain ? (
          <>
            <View
              style={styles.section}
              onLayout={(event) => setInviteY(event.nativeEvent.layout.y)}
            >
              <View style={styles.sectionHead}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  {copy.teamSearchPlayers}
                </Text>
              </View>
              <View style={styles.searchRow}>
                <TextInput
                  accessibilityLabel={copy.teamSearchPlayers}
                  placeholder={copy.teamSearchPlaceholder}
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                  onSubmitEditing={() => void doSearch()}
                  style={styles.searchInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.teamSearch}
                  disabled={working || query.trim().length < 3}
                  onPress={() => void doSearch()}
                  style={[
                    styles.searchButton,
                    (working || query.trim().length < 3) && { opacity: 0.55 },
                  ]}
                >
                  <Text style={styles.searchButtonText}>{copy.teamSearch}</Text>
                </Pressable>
              </View>
              {candidates.length ? (
                <View style={[styles.listCard, { marginTop: 10 }]}>
                  {candidates.map((candidate, index) => (
                    <View
                      key={candidate.userId}
                      style={[styles.memberRow, index > 0 && styles.rowDivider]}
                    >
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {Array.from(candidate.displayName)[0]?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <Text style={[styles.memberName, styles.memberCopy]}>
                        {candidate.displayName}
                      </Text>
                      <Action
                        label={copy.teamInvitePlayer}
                        disabled={working}
                        onPress={() =>
                          void action(
                            () => inviteTeamMember(id, candidate.userId),
                            copy.teamInviteSent,
                          )
                        }
                        colors={colors}
                        small
                      />
                    </View>
                  ))}
                </View>
              ) : query.trim().length >= 3 ? (
                <Text style={[styles.meta, { marginTop: 8 }]}>{copy.teamNoCandidates}</Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text accessibilityRole="header" style={styles.sectionTitle}>
                  {copy.teamPendingInvites}
                </Text>
                <Text style={styles.count}>{team.invites.length}</Text>
              </View>
              {team.invites.length ? (
                <View style={styles.listCard}>
                  {team.invites.map((invite, index) => (
                    <View
                      key={invite.id}
                      style={[styles.memberRow, index > 0 && styles.rowDivider]}
                    >
                      <Text style={[styles.memberName, styles.memberCopy]}>
                        {invite.displayName}
                      </Text>
                      <Action
                        label={copy.teamRevokeInvite}
                        disabled={working}
                        onPress={() =>
                          void action(() => revokeTeamInvite(id, invite.id), copy.teamInviteRevoked)
                        }
                        colors={colors}
                        secondary
                        small
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyRow}>
                  <Text style={styles.meta}>{copy.teamNoInvites}</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: editing }}
                onPress={() => setEditing((open) => !open)}
                style={styles.editToggle}
              >
                <Text style={styles.editToggleText}>{`✎  ${copy.teamEditToggle}`}</Text>
                <Text style={styles.editToggleText}>{editing ? '⌄' : '›'}</Text>
              </Pressable>
              {editing ? (
                <View style={styles.form}>
                  <Field
                    label={copy.teamName}
                    value={name}
                    onChangeText={setName}
                    colors={colors}
                  />
                  <Field
                    label={copy.teamDescription}
                    value={description}
                    onChangeText={setDescription}
                    colors={colors}
                    multiline
                  />
                  <Text style={styles.meta}>{copy.teamCity}</Text>
                  <View style={styles.chips}>
                    {cities.map((item) => (
                      <Choice
                        key={item.id}
                        label={city(item)}
                        selected={cityId === item.id}
                        onPress={() => setCityId(item.id)}
                        colors={colors}
                      />
                    ))}
                  </View>
                  <Action
                    label={copy.teamSave}
                    disabled={working}
                    onPress={saveDetails}
                    colors={colors}
                  />
                </View>
              ) : null}
            </View>
            <Text style={[styles.meta, styles.footNote]}>{copy.teamRoleChangeHint}</Text>
          </>
        ) : null}

        {isMember ? (
          <Pressable
            accessibilityRole="button"
            disabled={working}
            onPress={() =>
              void action(async () => {
                await leaveTeam(id);
                router.replace('/teams' as Href);
              }, copy.teamLeft)
            }
            style={styles.leave}
          >
            <Text style={styles.leaveText}>{copy.teamLeave}</Text>
          </Pressable>
        ) : null}
        <Action
          label={copy.appGoTeams}
          onPress={() => router.replace('/teams' as Href)}
          colors={colors}
          secondary
        />
      </View>
    </ScrollView>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  colors,
  multiline = false,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={{
          color: colors.textPrimary,
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          minHeight: multiline ? 78 : 46,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

function Action({
  label,
  onPress,
  colors,
  secondary = false,
  disabled = false,
  small = false,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  secondary?: boolean;
  disabled?: boolean;
  small?: boolean;
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
        borderRadius: small ? 10 : 12,
        minHeight: small ? 36 : 46,
        justifyContent: 'center',
        paddingHorizontal: small ? 10 : 14,
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

function Choice({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        backgroundColor: selected ? colors.primaryButton : colors.surfaceRaised,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}
    >
      <Text style={{ color: selected ? colors.primaryButtonText : colors.textPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    page: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 36, alignItems: 'center' },
    content: { width: '100%', maxWidth: 720, gap: 4 },
    hero: { alignItems: 'center', gap: 6, paddingTop: 12, paddingBottom: 16 },
    heroName: {
      color: colors.textPrimary,
      fontSize: 34,
      lineHeight: 38,
      fontWeight: '800',
      textAlign: 'center',
    },
    heroDescription: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 320,
    },
    heroChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      marginTop: 6,
    },
    chip: {
      color: colors.textPrimary,
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderWidth: 1,
      overflow: 'hidden',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      fontSize: 12,
      fontWeight: '700',
    },
    chipHot: {
      color: colors.accentText,
      backgroundColor: colors.cardTop,
      borderColor: 'transparent',
    },
    quickActions: { flexDirection: 'row', gap: 10 },
    quick: {
      minHeight: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
    },
    quickPrimary: { flex: 1, backgroundColor: colors.primaryButton },
    quickPrimaryText: { color: colors.primaryButtonText, fontSize: 15, fontWeight: '800' },
    quickFight: { flex: 1, backgroundColor: '#ff6a3d' },
    quickFightText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
    quickShare: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
    quickShareText: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    section: { marginTop: 18 },
    sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
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
    listCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 18,
      paddingHorizontal: 12,
    },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primaryButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.primaryButtonText, fontSize: 17, fontWeight: '800' },
    memberCopy: { flex: 1, gap: 6 },
    memberName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
    badge: {
      color: colors.textSecondary,
      backgroundColor: colors.surfaceRaised,
      overflow: 'hidden',
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontSize: 11,
      fontWeight: '700',
    },
    badgeHot: { color: colors.accentText, backgroundColor: colors.cardTop },
    emptyRow: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginTop: 10,
    },
    searchRow: { flexDirection: 'row', gap: 8 },
    searchInput: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: 14,
      fontSize: 15,
    },
    searchButton: {
      flexShrink: 0,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.primaryButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    searchButtonText: { color: colors.primaryButtonText, fontWeight: '800' },
    editToggle: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
    },
    editToggleText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
    form: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 14,
      marginTop: 8,
      gap: 12,
    },
    footNote: { textAlign: 'center', marginTop: 12 },
    leave: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 16 },
    leaveText: { color: colors.errorText, fontSize: 14, fontWeight: '700' },
    meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
