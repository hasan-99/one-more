import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useToast } from '@/components/toast/ToastProvider';
import { AppCard, AppPage, EmptyState } from '@/components/layout/AppPage';
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
  return (
    <AppPage
      title={team.name}
      description={`${locale === 'el' ? team.cityNameEl : team.cityNameEn}${team.description ? ` · ${team.description}` : ''}`}
    >
      <AppCard>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {copy.teamMembers} · {team.members.length}
        </Text>
        {team.members.map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.memberName}>{member.displayName}</Text>
              <Text style={styles.meta}>
                {member.role === 'captain' ? copy.teamCaptain : copy.teamMember}
              </Text>
            </View>
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
                />
                <Action
                  label={copy.teamRemove}
                  onPress={() =>
                    void action(() => removeTeamMember(id, member.id), copy.teamRemovedMember)
                  }
                  colors={colors}
                  secondary
                />
              </View>
            ) : null}
          </View>
        ))}
        {isMember ? (
          <Action
            label={copy.teamLeave}
            onPress={() =>
              void action(async () => {
                await leaveTeam(id);
                router.replace('/teams' as Href);
              }, copy.teamLeft)
            }
            colors={colors}
            secondary
            disabled={working}
          />
        ) : null}
        {isCaptain ? <Text style={styles.meta}>{copy.teamRoleChangeHint}</Text> : null}
      </AppCard>

      {isCaptain ? (
        <>
          <AppCard>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {copy.teamEdit}
            </Text>
            <Field label={copy.teamName} value={name} onChangeText={setName} colors={colors} />
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
          </AppCard>
          <AppCard>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {copy.teamSearchPlayers}
            </Text>
            <Field
              label={copy.teamSearchPlayers}
              placeholder={copy.teamSearchPlaceholder}
              value={query}
              onChangeText={setQuery}
              colors={colors}
            />
            <Action
              label={copy.teamSearch}
              disabled={working || query.trim().length < 3}
              onPress={() => void doSearch()}
              colors={colors}
              secondary
            />
            {candidates.length ? (
              candidates.map((candidate) => (
                <View key={candidate.userId} style={styles.memberRow}>
                  <Text style={styles.memberName}>{candidate.displayName}</Text>
                  <Action
                    label={copy.teamInvitePlayer}
                    disabled={working}
                    onPress={() =>
                      void action(() => inviteTeamMember(id, candidate.userId), copy.teamInviteSent)
                    }
                    colors={colors}
                  />
                </View>
              ))
            ) : query.trim().length >= 3 ? (
              <Text style={styles.meta}>{copy.teamNoCandidates}</Text>
            ) : null}
          </AppCard>
          <AppCard>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {copy.teamPendingInvites}
            </Text>
            {team.invites.length ? (
              team.invites.map((invite) => (
                <View key={invite.id} style={styles.memberRow}>
                  <Text style={styles.memberName}>{invite.displayName}</Text>
                  <Action
                    label={copy.teamRevokeInvite}
                    disabled={working}
                    onPress={() =>
                      void action(() => revokeTeamInvite(id, invite.id), copy.teamInviteRevoked)
                    }
                    colors={colors}
                    secondary
                  />
                </View>
              ))
            ) : (
              <Text style={styles.meta}>{copy.teamNoInvites}</Text>
            )}
          </AppCard>
        </>
      ) : null}
      <Action
        label={copy.appGoTeams}
        onPress={() => router.replace('/teams' as Href)}
        colors={colors}
        secondary
      />
    </AppPage>
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
        minHeight: 42,
        justifyContent: 'center',
        paddingHorizontal: 12,
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
    sectionTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    memberName: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
    meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
