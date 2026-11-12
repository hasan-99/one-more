import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppCard, AppPage, EmptyState } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import {
  createTeamChallenge,
  listTeamChallenges,
  type TeamChallenge,
} from '@/features/teams/challenge-service';
import {
  toChallengeWindows,
  type ChallengeWindowForm,
} from '@/features/teams/challenge-validation';
import { listMyTeams, type MyTeam } from '@/features/teams/team-service';
import { loadMatchFilters, type MatchArea, type MatchCity } from '@/features/matches/match-service';
import { getProfileCompletion } from '@/features/profile/profile-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

function defaultWindow(): ChallengeWindowForm {
  const date = new Date(Date.now() + 24 * 60 * 60_000);
  const dateValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { startDate: dateValue, startTime: '19:00', endDate: dateValue, endTime: '22:00' };
}

export default function ChallengesScreen() {
  const { locale, colors } = useAppPreferences();
  const { session } = useAuth();
  const { showToast } = useToast();
  const copy = translations[locale];
  const [challenges, setChallenges] = useState<TeamChallenge[]>([]);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [cities, setCities] = useState<MatchCity[]>([]);
  const [areas, setAreas] = useState<MatchArea[]>([]);
  const [teamId, setTeamId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [format, setFormat] = useState(5);
  const [skill, setSkill] = useState('intermediate');
  const [note, setNote] = useState('');
  const [windows, setWindows] = useState<ChallengeWindowForm[]>([defaultWindow()]);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const [open, filters] = await Promise.all([listTeamChallenges(), loadMatchFilters()]);
      setChallenges(open);
      setCities(filters.cities);
      setAreas(filters.areas);
      if (session) {
        const [myTeams, complete] = await Promise.all([
          listMyTeams(),
          getProfileCompletion(session.user.id),
        ]);
        const captained = myTeams.filter((team) => team.role === 'captain');
        setTeams(captained);
        setProfileComplete(complete);
        setTeamId((previous) =>
          captained.some((team) => team.teamId === previous)
            ? previous
            : (captained[0]?.teamId ?? ''),
        );
        const currentTeam = captained.find((team) => team.teamId === teamId) ?? captained[0];
        const teamAreas = filters.areas.filter((area) => area.city_id === currentTeam?.cityId);
        setAreaId((previous) =>
          teamAreas.some((area) => area.id === previous) ? previous : (teamAreas[0]?.id ?? ''),
        );
      } else {
        setTeams([]);
        setProfileComplete(false);
      }
    } catch {
      setLoadError(true);
      showToast(copy.challengeLoadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [copy.challengeLoadError, session, showToast, teamId]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const selectedTeam = teams.find((team) => team.teamId === teamId);
  const teamAreas = areas.filter((area) => area.city_id === selectedTeam?.cityId);
  const localeName = (item: { name_en: string; name_el: string }) =>
    locale === 'el' ? item.name_el : item.name_en;

  const submitChallenge = async () => {
    const parsedWindows = toChallengeWindows(windows);
    if (!teamId || !selectedTeam || !areaId)
      return showToast(copy.challengeValidationFields, 'error');
    if (!parsedWindows) return showToast(copy.challengeValidationWindows, 'error');
    setWorking(true);
    try {
      const id = await createTeamChallenge({
        homeTeamId: teamId,
        format,
        cityId: selectedTeam.cityId,
        areaId,
        skillLevel: skill,
        note: note.trim(),
        windows: parsedWindows,
      });
      showToast(copy.challengeCreateSuccess, 'success');
      setNote('');
      await load();
      router.push(`/challenges/${id}` as Href);
    } catch {
      showToast(copy.challengeCreateError, 'error');
    } finally {
      setWorking(false);
    }
  };

  const styles = makeStyles(colors);
  return (
    <AppPage title={copy.challengeDirectory} description={copy.challengeIntro}>
      {loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel={copy.chatLoading} />
      ) : loadError ? (
        <Action label={copy.challengeRetry} onPress={() => void load()} colors={colors} />
      ) : (
        <>
          {challenges.length ? (
            challenges.map((challenge) => (
              <Pressable
                key={challenge.id}
                accessibilityRole="link"
                onPress={() => router.push(`/challenges/${challenge.id}` as Href)}
                style={styles.challengeCard}
              >
                <View style={styles.cardRow}>
                  <Text style={styles.teamTitle}>{challenge.homeTeamName}</Text>
                  <Text style={styles.format}>
                    {challenge.format}v{challenge.format}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {locale === 'el' ? challenge.cityNameEl : challenge.cityNameEn} ·{' '}
                  {locale === 'el' ? challenge.areaNameEl : challenge.areaNameEn}
                </Text>
                {challenge.note ? <Text style={styles.meta}>{challenge.note}</Text> : null}
                <Text style={styles.meta}>
                  {copy.challengeRequestsCount.replace('{count}', String(challenge.requestCount))}
                </Text>
              </Pressable>
            ))
          ) : (
            <EmptyState title={copy.challengeNoOpen} description={copy.challengeIntro} />
          )}
          {session && profileComplete ? (
            teams.length ? (
              <AppCard>
                <Text accessibilityRole="header" style={styles.cardHeading}>
                  {copy.challengeCreate}
                </Text>
                <Text style={styles.meta}>{copy.challengeHomeTeam}</Text>
                <View style={styles.chips}>
                  {teams.map((team) => (
                    <Choice
                      key={team.teamId}
                      label={team.name}
                      selected={teamId === team.teamId}
                      onPress={() => {
                        setTeamId(team.teamId);
                        const first = areas.find((area) => area.city_id === team.cityId);
                        setAreaId(first?.id ?? '');
                      }}
                      colors={colors}
                    />
                  ))}
                </View>
                <Text style={styles.meta}>{copy.challengeArea}</Text>
                <View style={styles.chips}>
                  {teamAreas.map((area) => (
                    <Choice
                      key={area.id}
                      label={localeName(area)}
                      selected={areaId === area.id}
                      onPress={() => setAreaId(area.id)}
                      colors={colors}
                    />
                  ))}
                </View>
                <Text style={styles.meta}>{copy.challengeFormat}</Text>
                <View style={styles.chips}>
                  {[5, 7, 8, 11].map((size) => (
                    <Choice
                      key={size}
                      label={`${size}v${size}`}
                      selected={format === size}
                      onPress={() => setFormat(size)}
                      colors={colors}
                    />
                  ))}
                </View>
                <Text style={styles.meta}>{copy.challengeSkill}</Text>
                <View style={styles.chips}>
                  {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                    <Choice
                      key={level}
                      label={
                        copy[
                          level === 'beginner'
                            ? 'profileBeginner'
                            : level === 'intermediate'
                              ? 'profileIntermediate'
                              : 'profileAdvanced'
                        ]
                      }
                      selected={skill === level}
                      onPress={() => setSkill(level)}
                      colors={colors}
                    />
                  ))}
                </View>
                <Text style={styles.meta}>{copy.challengeWindow}</Text>
                {windows.map((window, index) => (
                  <AppCard key={index}>
                    <Text style={styles.meta}>
                      {copy.challengeWindow} {index + 1}
                    </Text>
                    <Field
                      label={copy.challengeWindowStartDate}
                      value={window.startDate}
                      onChangeText={(value) => updateWindow(setWindows, index, 'startDate', value)}
                      colors={colors}
                      placeholder="YYYY-MM-DD"
                    />
                    <Field
                      label={copy.challengeWindowStartTime}
                      value={window.startTime}
                      onChangeText={(value) => updateWindow(setWindows, index, 'startTime', value)}
                      colors={colors}
                      placeholder="HH:MM"
                    />
                    <Field
                      label={copy.challengeWindowEndDate}
                      value={window.endDate}
                      onChangeText={(value) => updateWindow(setWindows, index, 'endDate', value)}
                      colors={colors}
                      placeholder="YYYY-MM-DD"
                    />
                    <Field
                      label={copy.challengeWindowEndTime}
                      value={window.endTime}
                      onChangeText={(value) => updateWindow(setWindows, index, 'endTime', value)}
                      colors={colors}
                      placeholder="HH:MM"
                    />
                    {windows.length > 1 ? (
                      <Action
                        label={copy.challengeRemoveWindow}
                        onPress={() =>
                          setWindows((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                        colors={colors}
                        secondary
                      />
                    ) : null}
                  </AppCard>
                ))}
                {windows.length < 5 ? (
                  <Action
                    label={copy.challengeAddWindow}
                    onPress={() => setWindows((current) => [...current, defaultWindow()])}
                    colors={colors}
                    secondary
                  />
                ) : null}
                <Field
                  label={copy.challengeNote}
                  value={note}
                  onChangeText={setNote}
                  colors={colors}
                  multiline
                />
                <Action
                  label={working ? copy.matchSaving : copy.challengeSend}
                  disabled={working}
                  onPress={() => void submitChallenge()}
                  colors={colors}
                />
              </AppCard>
            ) : (
              <Text style={styles.meta}>{copy.challengeNoCaptainTeams}</Text>
            )
          ) : (
            <Text style={styles.meta}>{copy.challengeCreateSignIn}</Text>
          )}
          {cities.length === 0 ? <Text style={styles.meta}>{copy.profileNoCities}</Text> : null}
        </>
      )}
    </AppPage>
  );
}

function updateWindow(
  setWindows: (update: (current: ChallengeWindowForm[]) => ChallengeWindowForm[]) => void,
  index: number,
  field: keyof ChallengeWindowForm,
  value: string,
) {
  setWindows((current) =>
    current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSecondary }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
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
    challengeCard: {
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
      gap: 8,
    },
    teamTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', flexShrink: 1 },
    format: {
      color: colors.primaryButtonText,
      backgroundColor: colors.primaryButton,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      fontWeight: '700',
    },
    cardHeading: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
    meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
