import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppAction, AppCard, AppPage, EmptyState } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import { loadMatchFilters, type MatchArea } from '@/features/matches/match-service';
import {
  cancelTeamChallenge,
  confirmChallengeMatch,
  loadTeamChallengeDetails,
  proposeChallengeMatch,
  requestTeamChallenge,
  respondChallengeRequest,
  withdrawChallengeRequest,
  type TeamChallengeDetails,
} from '@/features/teams/challenge-service';
import { cyprusLocalTimeToUtc } from '@/features/teams/challenge-validation';
import { listMyTeams, type MyTeam } from '@/features/teams/team-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

function cyprusDateTime(instant: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Nicosia',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(instant))
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function challengeStatusText(
  status: string,
  copy: {
    challengeNegotiating: string;
    challengeMatched: string;
    challengeCancelled: string;
    challengeExpired: string;
    challengeOpen: string;
  },
): string {
  if (status === 'negotiating') return copy.challengeNegotiating;
  if (status === 'matched') return copy.challengeMatched;
  if (status === 'cancelled') return copy.challengeCancelled;
  if (status === 'expired') return copy.challengeExpired;
  return copy.challengeOpen;
}

export default function ChallengeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, colors } = useAppPreferences();
  const { showToast } = useToast();
  const copy = translations[locale];
  const [challenge, setChallenge] = useState<TeamChallengeDetails | null>(null);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [areas, setAreas] = useState<MatchArea[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [slotAreaId, setSlotAreaId] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [detail, filters, myTeams] = await Promise.all([
        loadTeamChallengeDetails(id),
        loadMatchFilters(),
        listMyTeams(),
      ]);
      setChallenge(detail);
      setAreas(filters.areas);
      const captainTeams = myTeams.filter(
        (team) => team.role === 'captain' && team.teamId !== detail?.homeTeamId,
      );
      setTeams(captainTeams);
      setSelectedTeamId((current) =>
        captainTeams.some((team) => team.teamId === current)
          ? current
          : (captainTeams[0]?.teamId ?? ''),
      );
      if (detail?.windows[0]) {
        const local = cyprusDateTime(detail.windows[0].startsAt);
        setSlotDate((current) => current || local.date);
        setSlotTime((current) => current || local.time);
      }
      setSlotAreaId((current) => current || detail?.areaId || '');
    } catch {
      setLoadError(true);
      showToast(copy.challengeLoadError, 'error');
    } finally {
      setLoading(false);
    }
  }, [copy.challengeLoadError, id, showToast]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const perform = async (operation: () => Promise<void>, success: string) => {
    setWorking(true);
    try {
      await operation();
      showToast(success, 'success');
      await load();
    } catch {
      showToast(copy.challengeRequestError, 'error');
    } finally {
      setWorking(false);
    }
  };

  const postExactSlot = async () => {
    const startsAt = cyprusLocalTimeToUtc(slotDate, slotTime);
    if (!startsAt || !slotAreaId || !venueName.trim() || !venueAddress.trim()) {
      showToast(copy.challengeProposeError, 'error');
      return;
    }
    await perform(
      () =>
        proposeChallengeMatch({
          challengeId: id,
          startsAt,
          areaId: slotAreaId,
          venueName: venueName.trim(),
          venueAddress: venueAddress.trim(),
        }),
      copy.challengeProposed,
    );
  };

  const confirmExactSlot = async () => {
    setWorking(true);
    try {
      const matchId = await confirmChallengeMatch(id);
      showToast(copy.challengeMatchCreated, 'success');
      router.push(`/matches/${matchId}` as Href);
    } catch {
      showToast(copy.challengeConfirmError, 'error');
    } finally {
      setWorking(false);
    }
  };

  const styles = makeStyles(colors);
  const localeArea = (area: MatchArea) => (locale === 'el' ? area.name_el : area.name_en);
  if (loading)
    return (
      <AppPage backHref="/teams" title={copy.challengeDetails}>
        <View accessibilityRole="progressbar" accessibilityLabel={copy.teamDetailLoading} />
      </AppPage>
    );
  if (loadError)
    return (
      <AppPage backHref="/teams" title={copy.challengeDetails}>
        <Action label={copy.challengeRetry} onPress={() => void load()} colors={colors} />
      </AppPage>
    );
  if (!challenge)
    return (
      <AppPage backHref="/teams" title={copy.challengeDetails}>
        <EmptyState title={copy.challengeUnavailable} description={copy.challengeIntro} />
        <Action
          label={copy.appGoTeams}
          onPress={() => router.replace('/challenges' as Href)}
          colors={colors}
          secondary
        />
      </AppPage>
    );

  const isHomeCaptain = challenge.viewerHomeRole === 'captain';
  const myRequest = challenge.myRequestStatus;
  const opponentName = isHomeCaptain
    ? challenge.requests.find((request) => request.status === 'accepted')?.teamName
    : challenge.myTeamName;
  const proposal = challenge.proposedStartsAt ? cyprusDateTime(challenge.proposedStartsAt) : null;
  const matchArea = areas.find((area) => area.id === challenge.proposedAreaId);
  return (
    <AppPage
      backHref="/teams"
      title={`${challenge.homeTeamName} ${copy.challengeVs} ${opponentName ?? '…'}`}
      description={`${challenge.format}v${challenge.format} · ${locale === 'el' ? challenge.cityNameEl : challenge.cityNameEn} · ${locale === 'el' ? challenge.areaNameEl : challenge.areaNameEn}`}
    >
      <AppCard>
        <Text style={styles.status}>
          {copy.challengeStatus}: {challengeStatusText(challenge.status, copy)}
        </Text>
        {challenge.skillLevel ? (
          <Text style={styles.meta}>
            {copy.challengeSkill}:{' '}
            {
              copy[
                challenge.skillLevel === 'beginner'
                  ? 'profileBeginner'
                  : challenge.skillLevel === 'advanced'
                    ? 'profileAdvanced'
                    : 'profileIntermediate'
              ]
            }
          </Text>
        ) : null}
        {challenge.note ? <Text style={styles.meta}>{challenge.note}</Text> : null}
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {copy.challengeWindow}
        </Text>
        {challenge.windows.map((window) => {
          const start = cyprusDateTime(window.startsAt);
          const end = cyprusDateTime(window.endsAt);
          return (
            <Text key={window.startsAt} style={styles.meta}>
              {start.date} · {start.time}–{end.time}
            </Text>
          );
        })}
      </AppCard>

      {isHomeCaptain && challenge.status === 'open' ? (
        <AppCard>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {copy.challengeHomeRequests}
          </Text>
          {challenge.requests.filter((request) => request.status === 'pending').length ? (
            challenge.requests
              .filter((request) => request.status === 'pending')
              .map((request) => (
                <View key={request.id} style={styles.requestRow}>
                  <Text style={styles.meta}>{request.teamName}</Text>
                  <View style={styles.actions}>
                    <Action
                      label={copy.challengeAccept}
                      disabled={working}
                      onPress={() =>
                        void perform(
                          () => respondChallengeRequest(request.id, 'accept'),
                          copy.challengeAccepted,
                        )
                      }
                      colors={colors}
                    />
                    <Action
                      label={copy.challengeDecline}
                      disabled={working}
                      onPress={() =>
                        void perform(
                          () => respondChallengeRequest(request.id, 'decline'),
                          copy.challengeDeclined,
                        )
                      }
                      colors={colors}
                      secondary
                    />
                  </View>
                </View>
              ))
          ) : (
            <Text style={styles.meta}>{copy.challengeNoRequests}</Text>
          )}
          <Action
            label={copy.challengeCancelled}
            disabled={working}
            onPress={() => void perform(() => cancelTeamChallenge(id), copy.challengeCancelled)}
            colors={colors}
            secondary
          />
        </AppCard>
      ) : null}

      {challenge.status === 'open' && !isHomeCaptain && !myRequest && teams.length ? (
        <AppCard>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {copy.challengeChooseAwayTeam}
          </Text>
          <View style={styles.chips}>
            {teams.map((team) => (
              <Choice
                key={team.teamId}
                label={team.name}
                selected={selectedTeamId === team.teamId}
                onPress={() => setSelectedTeamId(team.teamId)}
                colors={colors}
              />
            ))}
          </View>
          <Action
            label={copy.challengeRequest}
            disabled={working || !selectedTeamId}
            onPress={() =>
              void perform(async () => {
                await requestTeamChallenge(id, selectedTeamId);
              }, copy.challengeRequestSent)
            }
            colors={colors}
          />
        </AppCard>
      ) : null}

      {myRequest === 'pending' && challenge.myRequestId ? (
        <Action
          label={copy.challengeWithdraw}
          disabled={working}
          onPress={() =>
            void perform(
              () => withdrawChallengeRequest(challenge.myRequestId as string),
              copy.challengeWithdrawn,
            )
          }
          colors={colors}
          secondary
        />
      ) : null}
      {myRequest === 'accepted' &&
      !isHomeCaptain &&
      challenge.status === 'negotiating' &&
      proposal ? (
        <AppCard>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {copy.challengeProposeSlot}
          </Text>
          <Text style={styles.meta}>
            {proposal.date} · {proposal.time} · {challenge.proposedVenueName} ·{' '}
            {matchArea ? localeArea(matchArea) : ''} · {challenge.proposedVenueAddress}
          </Text>
          <Action
            label={copy.challengeConfirmSlot}
            disabled={working}
            onPress={() => void confirmExactSlot()}
            colors={colors}
          />
        </AppCard>
      ) : null}
      {isHomeCaptain && challenge.status === 'negotiating' ? (
        <AppCard>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {copy.challengeProposeSlot}
          </Text>
          <Field
            label={copy.challengeExactDate}
            value={slotDate}
            onChangeText={setSlotDate}
            colors={colors}
            placeholder="YYYY-MM-DD"
          />
          <Field
            label={copy.challengeExactTime}
            value={slotTime}
            onChangeText={setSlotTime}
            colors={colors}
            placeholder="HH:MM"
          />
          <Text style={styles.meta}>{copy.challengeArea}</Text>
          <View style={styles.chips}>
            {areas
              .filter((area) => area.city_id === challenge.cityId)
              .map((area) => (
                <Choice
                  key={area.id}
                  label={localeArea(area)}
                  selected={slotAreaId === area.id}
                  onPress={() => setSlotAreaId(area.id)}
                  colors={colors}
                />
              ))}
          </View>
          <Field
            label={copy.challengeFieldName}
            value={venueName}
            onChangeText={setVenueName}
            colors={colors}
          />
          <Field
            label={copy.challengeFieldAddress}
            value={venueAddress}
            onChangeText={setVenueAddress}
            colors={colors}
          />
          <Action
            label={copy.challengePropose}
            disabled={working}
            onPress={() => void postExactSlot()}
            colors={colors}
          />
        </AppCard>
      ) : null}

      {challenge.status === 'matched' && challenge.linkedMatchId ? (
        <AppAction labelKey="challengeMatchLink" href={`/matches/${challenge.linkedMatchId}`} />
      ) : null}
      {!isHomeCaptain && !teams.length && challenge.status === 'open' ? (
        <Text style={styles.meta}>{copy.challengeNoCaptainTeams}</Text>
      ) : null}
      <Action
        label={copy.challengeDirectory}
        onPress={() => router.replace('/challenges' as Href)}
        colors={colors}
        secondary
      />
    </AppPage>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
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
        style={{
          color: colors.textPrimary,
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          minHeight: 46,
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
    status: { color: colors.accentText, fontWeight: '800' },
    sectionTitle: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
    meta: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    requestRow: { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, gap: 8 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  });
}
