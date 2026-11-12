import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/toast/ToastProvider';
import { AppCard, AppPage, EmptyState } from '@/components/layout/AppPage';
import { getProfileCompletion } from '@/features/profile/profile-service';
import {
  createTeam,
  listMyTeamInvites,
  listMyTeams,
  listTeamDirectory,
  respondTeamInvite,
  type MyTeam,
  type TeamCity,
  type TeamDirectoryItem,
  type TeamInvite,
} from '@/features/teams/team-service';
import { validateTeamInput } from '@/features/teams/team-validation';
import { getSupabaseClient } from '@/lib/supabase';
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
  const [cities, setCities] = useState<TeamCity[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [publicTeams, cityResult] = await Promise.all([
        listTeamDirectory(),
        getSupabaseClient()
          .from('cities')
          .select('id,name_en,name_el')
          .order('name_en')
          .then(({ data, error }) => {
            if (error) throw error;
            return data;
          }),
      ]);
      setDirectory(publicTeams);
      setCities(cityResult);
      setSelectedCity((current) => current || cityResult[0]?.id || '');
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

  const onCreate = async () => {
    const validation = validateTeamInput({ name, cityId: selectedCity, description });
    if (validation) return showToast(copy[validation], 'error');
    setSaving(true);
    try {
      const id = await createTeam({
        name: name.trim(),
        cityId: selectedCity,
        description: description.trim(),
      });
      showToast(copy.teamCreateSuccess, 'success');
      router.push(`/teams/${id}` as Href);
    } catch {
      showToast(copy.teamActionError, 'error');
    } finally {
      setSaving(false);
    }
  };

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
  const cityName = (team: TeamDirectoryItem | MyTeam) =>
    locale === 'el' ? team.cityNameEl : team.cityNameEn;
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
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {copy.teamMine}
              </Text>
              {teams.length ? (
                teams.map((team) => (
                  <TeamCard
                    key={team.teamId}
                    title={team.name}
                    meta={`${cityName(team)} · ${team.memberCount}`}
                    role={team.role === 'captain' ? copy.teamCaptain : copy.teamMember}
                    onPress={() => router.push(`/teams/${team.teamId}` as Href)}
                    styles={styles}
                  />
                ))
              ) : (
                <EmptyState title={copy.teamNoMine} description={copy.teamNoDirectory} />
              )}
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                {copy.teamInvites}
              </Text>
              {invites.length ? (
                invites.map((invite) => (
                  <AppCard key={invite.inviteId}>
                    <Text style={styles.cardTitle}>{invite.teamName}</Text>
                    <Text style={styles.meta}>
                      {locale === 'el' ? invite.cityNameEl : invite.cityNameEn} ·{' '}
                      {invite.invitedByName}
                    </Text>
                    <View style={styles.actions}>
                      <Action
                        label={copy.teamInviteAccept}
                        onPress={() => void respond(invite.inviteId, 'accept')}
                        colors={colors}
                      />
                      <Action
                        label={copy.teamInviteDecline}
                        onPress={() => void respond(invite.inviteId, 'decline')}
                        colors={colors}
                        secondary
                      />
                    </View>
                  </AppCard>
                ))
              ) : (
                <EmptyState title={copy.teamNoInvites} description={copy.appTeamsIntro} />
              )}
              {profileComplete ? (
                <AppCard>
                  <Text accessibilityRole="header" style={styles.cardTitle}>
                    {copy.teamCreateTitle}
                  </Text>
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
                    {cities.map((city) => (
                      <Choice
                        key={city.id}
                        label={locale === 'el' ? city.name_el : city.name_en}
                        selected={selectedCity === city.id}
                        onPress={() => setSelectedCity(city.id)}
                        colors={colors}
                      />
                    ))}
                  </View>
                  <Action
                    label={saving ? copy.matchSaving : copy.teamCreateAction}
                    onPress={() => void onCreate()}
                    colors={colors}
                    disabled={saving || !name.trim() || !selectedCity}
                  />
                </AppCard>
              ) : (
                <Text style={styles.meta}>{copy.teamCreateSignIn}</Text>
              )}
            </>
          ) : (
            <Text style={styles.meta}>{copy.teamCreateSignIn}</Text>
          )}
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {copy.teamDirectory}
          </Text>
          {directory.length ? (
            directory.map((team) => (
              <TeamCard
                key={team.teamId}
                title={team.name}
                meta={`${cityName(team)} · ${team.memberCount}`}
                role=""
                onPress={() => router.push(`/teams/${team.teamId}` as Href)}
                styles={styles}
              />
            ))
          ) : (
            <EmptyState title={copy.teamNoDirectory} description={copy.appTeamsIntro} />
          )}
        </>
      )}
    </AppPage>
  );
}

function TeamCard({
  title,
  meta,
  role,
  onPress,
  styles,
}: {
  title: string;
  meta: string;
  role: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={styles.teamCard}>
      <View style={styles.cardRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        {role ? <Text style={styles.badge}>{role}</Text> : null}
      </View>
      <Text style={styles.meta}>{meta}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  multiline = false,
}: {
  label: string;
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
    sectionTitle: { color: colors.textPrimary, fontSize: 21, fontWeight: '800', marginTop: 8 },
    teamCard: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 18,
      gap: 8,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    cardTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', flexShrink: 1 },
    meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    badge: {
      color: colors.primaryButtonText,
      backgroundColor: colors.primaryButton,
      overflow: 'hidden',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      fontSize: 12,
      fontWeight: '700',
    },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
