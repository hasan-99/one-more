import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppPage, EmptyState } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import { loadMatchFilters, type MatchArea } from '@/features/matches/match-service';
import { defaultCrest, FaceOff } from '@/features/teams/FaceOff';
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
import { Crest, crestInitials } from '@/features/teams/TeamCrest';
import {
  listMyTeams,
  listTeamDirectory,
  type MyTeam,
  type TeamCrestDesign,
} from '@/features/teams/team-service';
import { translations } from '@/i18n';
import { matchTicketParts } from '@/i18n/format';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont } from '@/theme/typography';
import { SkeletonList } from '@/components/loading/Skeleton';

const grey = '#8a968d';
const lime = '#cfff4a';
const ink = '#10170f';
const stepMs = 30 * 60_000;
const minimumPlayMs = 60 * 60_000;

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

export default function ChallengeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { locale, colors } = useAppPreferences();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { showToast } = useToast();
  const copy = translations[locale];
  const [challenge, setChallenge] = useState<TeamChallengeDetails | null>(null);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [areas, setAreas] = useState<MatchArea[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [slotAreaId, setSlotAreaId] = useState('');
  const [windowIndex, setWindowIndex] = useState(0);
  const [offsetMs, setOffsetMs] = useState(0);
  const [crests, setCrests] = useState<{
    byId: Record<string, TeamCrestDesign | null>;
    byName: Record<string, TeamCrestDesign | null>;
  }>({ byId: {}, byName: {} });
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
      const [detail, filters, myTeams, directory] = await Promise.all([
        loadTeamChallengeDetails(id),
        loadMatchFilters(),
        listMyTeams(),
        listTeamDirectory().catch(() => []),
      ]);
      const byId: Record<string, TeamCrestDesign | null> = {};
      const byName: Record<string, TeamCrestDesign | null> = {};
      for (const team of [...directory, ...myTeams]) {
        byId[team.teamId] = team.crest;
        byName[team.name] = team.crest;
      }
      setCrests({ byId, byName });
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
    const picked = challenge?.windows[windowIndex];
    if (!picked || !slotAreaId || !venueName.trim() || !venueAddress.trim()) {
      showToast(copy.challengeProposeError, 'error');
      return;
    }
    const startsAt = new Date(Date.parse(picked.startsAt) + offsetMs).toISOString();
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

  const localeArea = (area: MatchArea) => (locale === 'el' ? area.name_el : area.name_en);
  const semibold = { fontFamily: bodyFont(locale, 'semibold') };
  if (loading)
    return (
      <AppPage backHref="/teams" title={copy.challengeDetails}>
        <SkeletonList kind="detail" label={copy.teamDetailLoading} />
      </AppPage>
    );
  if (loadError)
    return (
      <AppPage backHref="/teams" title={copy.challengeDetails}>
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.btn}>
          <Text style={styles.btnText}>{copy.challengeRetry}</Text>
        </Pressable>
      </AppPage>
    );
  if (!challenge)
    return (
      <AppPage backHref="/teams" title={copy.challengeDetails}>
        <EmptyState title={copy.challengeUnavailable} description={copy.challengeIntro} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/challenges' as Href)}
          style={[styles.btn, styles.btnGhost]}
        >
          <Text style={[styles.btnText, styles.btnGhostText]}>{copy.challengeDirectory}</Text>
        </Pressable>
      </AppPage>
    );

  const isHomeCaptain = challenge.viewerHomeRole === 'captain';
  const myRequest = challenge.myRequestStatus;
  const acceptedRequest = challenge.requests.find((request) => request.status === 'accepted');
  const opponentName = isHomeCaptain ? acceptedRequest?.teamName : challenge.myTeamName;
  const proposal = challenge.proposedStartsAt ? cyprusDateTime(challenge.proposedStartsAt) : null;
  const matchArea = areas.find((area) => area.id === challenge.proposedAreaId);
  const pending = challenge.requests.filter((request) => request.status === 'pending');
  const open = challenge.status === 'open';
  const negotiating = challenge.status === 'negotiating';
  const matched = challenge.status === 'matched';
  const closed = challenge.status === 'cancelled' || challenge.status === 'expired';
  const accent = closed ? grey : lime;
  const awayVisible = !open || myRequest === 'pending';
  const away =
    awayVisible && (opponentName ?? challenge.myTeamName)
      ? {
          name: (opponentName ?? challenge.myTeamName) as string,
          crest: crests.byName[(opponentName ?? challenge.myTeamName) as string] ?? null,
        }
      : null;
  const sticker = closed
    ? challenge.status === 'cancelled'
      ? copy.challengeStickerCancelled
      : copy.challengeStickerExpired
    : matched
      ? copy.challengeStickerReady
      : negotiating
        ? proposal
          ? copy.challengeStickerProposal
          : copy.challengeStickerFound
        : myRequest === 'pending'
          ? copy.challengeStickerRequested
          : isHomeCaptain
            ? copy.challengeStickerMine
            : copy.challengeStickerOpen;
  const stage = matched ? 3 : negotiating ? 2 : 1;
  const stageLabels = [
    copy.challengeStagePosted,
    copy.challengeStageOpponent,
    copy.challengeStageTime,
    copy.challengeStageReady,
  ];
  const slotLabel = (instant: string) => {
    const p = matchTicketParts(instant, locale);
    return `${p.weekday} ${p.day}`;
  };
  const window0 = challenge.windows[windowIndex] ?? challenge.windows[0];
  const windowSpan = window0 ? Date.parse(window0.endsAt) - Date.parse(window0.startsAt) : 0;
  const maxOffset = Math.max(0, windowSpan - minimumPlayMs);
  const kickoff = window0 ? new Date(Date.parse(window0.startsAt) + offsetMs) : null;
  const kickoffParts = kickoff ? matchTicketParts(kickoff, locale) : null;
  const areaText = `${locale === 'el' ? challenge.areaNameEl : challenge.areaNameEn}, ${locale === 'el' ? challenge.cityNameEl : challenge.cityNameEn}`;
  const homeCrest = crests.byId[challenge.homeTeamId] ?? null;
  const myTeam = teams.find((team) => team.teamId === selectedTeamId);

  return (
    <AppPage
      backHref="/teams"
      title={copy.challengeDetails}
      heading={
        <Text accessibilityRole="header" style={[styles.title, semibold]}>
          {copy.challengeDetails}
        </Text>
      }
    >
      <View style={styles.cardWrap}>
        <View style={[styles.card, { borderColor: accent }]}>
          <FaceOff
            home={{ name: challenge.homeTeamName, crest: homeCrest }}
            away={away}
            awayLabel={isHomeCaptain ? copy.challengeSlotWaiting : copy.challengeSlotQuestion}
            format={challenge.format}
            accent={accent}
          />
          <View style={styles.facts}>
            <Text numberOfLines={1} style={[styles.factText, { fontFamily: bodyFont(locale) }]}>
              📍 <Text style={{ color: colors.textPrimary }}>{areaText}</Text>
            </Text>
            <Text style={[styles.factText, { fontFamily: bodyFont(locale) }]}>
              {matched && proposal && kickoffParts
                ? `${slotLabel(challenge.proposedStartsAt as string)} · ${proposal.time}`
                : challenge.windows[0]
                  ? `${slotLabel(challenge.windows[0].startsAt)} · ${cyprusDateTime(challenge.windows[0].startsAt).time}${challenge.windows.length > 1 ? ` +${challenge.windows.length - 1}` : ''}`
                  : ''}
            </Text>
          </View>
        </View>
        <View pointerEvents="none" style={[styles.sticker, { backgroundColor: accent }]}>
          <Text style={[styles.stickerText, semibold]}>{sticker}</Text>
        </View>
      </View>

      {closed ? null : (
        <View accessibilityRole="progressbar" style={styles.progress}>
          {stageLabels.map((label, index) => (
            <View key={label} style={styles.stage}>
              {index < 3 ? (
                <View style={[styles.stageLine, index < stage && { backgroundColor: lime }]} />
              ) : null}
              <View
                style={[
                  styles.stageDot,
                  index < stage && { backgroundColor: lime, borderColor: lime },
                  index === stage && { borderColor: lime },
                ]}
              >
                {index < stage ? <Text style={styles.stageTick}>✓</Text> : null}
              </View>
              <Text
                style={[
                  styles.stageLabel,
                  semibold,
                  index === stage && { color: colors.textPrimary },
                ]}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.panel}>
        {closed ? (
          <Text style={[styles.info, { fontFamily: bodyFont(locale) }]}>
            {copy.challengeClosedInfo}
          </Text>
        ) : null}

        {open ? (
          <>
            <Text style={[styles.label, semibold]}>{copy.challengeTimeSlots}</Text>
            <View style={styles.chips}>
              {challenge.windows.map((window) => {
                const start = cyprusDateTime(window.startsAt);
                const end = cyprusDateTime(window.endsAt);
                return (
                  <View key={window.startsAt} style={styles.slotChip}>
                    <Text style={[styles.slotChipText, semibold]}>
                      {`${slotLabel(window.startsAt)}  `}
                      <Text style={{ color: lime }}>{`${start.time}–${end.time}`}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
            {challenge.note ? (
              <Text style={[styles.note, { fontFamily: bodyFont(locale) }]}>
                “{challenge.note}”
              </Text>
            ) : null}
          </>
        ) : null}

        {open && isHomeCaptain ? (
          <>
            <Text style={[styles.label, semibold]}>
              {copy.challengeRequestsLabel.replace('{count}', String(pending.length))}
            </Text>
            {pending.length ? (
              pending.map((request) => (
                <View key={request.id} style={styles.row}>
                  <Crest
                    {...(crests.byName[request.teamName] ?? defaultCrest)}
                    initials={crestInitials(request.teamName)}
                    size={38}
                  />
                  <Text numberOfLines={2} style={[styles.rowTitle, semibold]}>
                    {request.teamName}
                  </Text>
                  <View style={styles.rowActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${copy.challengeAccept}: ${request.teamName}`}
                      disabled={working}
                      onPress={() =>
                        void perform(
                          () => respondChallengeRequest(request.id, 'accept'),
                          copy.challengeAccepted,
                        )
                      }
                      style={[styles.btn, styles.btnSmall, working && styles.disabled]}
                    >
                      <Text style={[styles.btnText, styles.btnTextSmall]}>✓</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${copy.challengeDecline}: ${request.teamName}`}
                      disabled={working}
                      onPress={() =>
                        void perform(
                          () => respondChallengeRequest(request.id, 'decline'),
                          copy.challengeDeclined,
                        )
                      }
                      style={[
                        styles.btn,
                        styles.btnSmall,
                        styles.btnGhost,
                        working && styles.disabled,
                      ]}
                    >
                      <Text style={[styles.btnText, styles.btnTextSmall, styles.btnGhostText]}>
                        ✕
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.info, { fontFamily: bodyFont(locale) }]}>
                {copy.challengeNoRequests}
              </Text>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={() => void perform(() => cancelTeamChallenge(id), copy.challengeCancelled)}
              style={[styles.btn, styles.btnBig, styles.btnDanger, working && styles.disabled]}
            >
              <Text style={[styles.btnText, styles.btnDangerText]}>
                {copy.challengeCancelAction}
              </Text>
            </Pressable>
          </>
        ) : null}

        {open && !isHomeCaptain && !myRequest ? (
          teams.length ? (
            <>
              <Text style={[styles.label, semibold]}>{copy.challengePlayAs}</Text>
              {teams.map((team) => {
                const selected = selectedTeamId === team.teamId;
                return (
                  <Pressable
                    key={team.teamId}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setSelectedTeamId(team.teamId)}
                    style={[styles.row, selected && { borderColor: lime }]}
                  >
                    <Crest
                      {...(team.crest ?? defaultCrest)}
                      initials={crestInitials(team.name)}
                      size={38}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[styles.rowTitle, semibold]}>
                        {team.name}
                      </Text>
                      <Text style={styles.rowSub}>{copy.challengeYouCaptain}</Text>
                    </View>
                  </Pressable>
                );
              })}
              <Pressable
                accessibilityRole="button"
                disabled={working || !myTeam}
                onPress={() =>
                  void perform(async () => {
                    await requestTeamChallenge(id, selectedTeamId);
                  }, copy.challengeRequestSent)
                }
                style={[styles.btn, styles.btnBig, (working || !myTeam) && styles.disabled]}
              >
                <Text style={styles.btnText}>{copy.challengeRequest}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.info, { fontFamily: bodyFont(locale) }]}>
              {copy.challengeNoCaptainTeams}
            </Text>
          )
        ) : null}

        {open && myRequest === 'pending' && challenge.myRequestId ? (
          <>
            <Text style={[styles.info, { fontFamily: bodyFont(locale) }]}>
              ⏳ {copy.challengeWaitingSent}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={() =>
                void perform(
                  () => withdrawChallengeRequest(challenge.myRequestId as string),
                  copy.challengeWithdrawn,
                )
              }
              style={[styles.btn, styles.btnBig, styles.btnGhost, working && styles.disabled]}
            >
              <Text style={[styles.btnText, styles.btnGhostText]}>{copy.challengeWithdraw}</Text>
            </Pressable>
          </>
        ) : null}

        {negotiating && isHomeCaptain ? (
          <>
            <Text style={[styles.info, { fontFamily: bodyFont(locale) }]}>
              ✓ {copy.challengeAcceptedInfo.replace('{team}', opponentName ?? '')}
            </Text>
            {challenge.windows.length > 1 ? (
              <>
                <Text style={[styles.label, semibold]}>{copy.challengePickDay}</Text>
                <View style={styles.chips}>
                  {challenge.windows.map((window, index) => {
                    const start = cyprusDateTime(window.startsAt);
                    const end = cyprusDateTime(window.endsAt);
                    const selected = windowIndex === index;
                    return (
                      <Pressable
                        key={window.startsAt}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        onPress={() => {
                          setWindowIndex(index);
                          setOffsetMs(0);
                        }}
                        style={[styles.slotChip, selected && styles.slotChipOn]}
                      >
                        <Text style={[styles.slotChipText, semibold, selected && { color: ink }]}>
                          {`${slotLabel(window.startsAt)}  `}
                          <Text style={{ color: selected ? ink : lime }}>
                            {`${start.time}–${end.time}`}
                          </Text>
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}
            <Text style={[styles.label, semibold]}>{copy.challengeExactKickoff}</Text>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.challengeEarlier}
                onPress={() => setOffsetMs((value) => Math.max(0, value - stepMs))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepValue}>{kickoffParts?.time}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.challengeLater}
                onPress={() => setOffsetMs((value) => Math.min(maxOffset, value + stepMs))}
                style={styles.stepBtn}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
            </View>
            <Text style={[styles.label, semibold]}>{copy.challengePitchLabel}</Text>
            <View style={styles.chips}>
              {areas
                .filter((area) => area.city_id === challenge.cityId)
                .map((area) => {
                  const selected = slotAreaId === area.id;
                  return (
                    <Pressable
                      key={area.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setSlotAreaId(area.id)}
                      style={[styles.slotChip, selected && styles.slotChipOn]}
                    >
                      <Text style={[styles.slotChipText, semibold, selected && { color: ink }]}>
                        {localeArea(area)}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
            <TextInput
              accessibilityLabel={copy.challengeFieldName}
              placeholder={copy.challengeFieldName}
              placeholderTextColor={colors.textSecondary}
              value={venueName}
              onChangeText={setVenueName}
              style={styles.field}
            />
            <TextInput
              accessibilityLabel={copy.challengeFieldAddress}
              placeholder={copy.challengeFieldAddress}
              placeholderTextColor={colors.textSecondary}
              value={venueAddress}
              onChangeText={setVenueAddress}
              style={styles.field}
            />
            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={() => void postExactSlot()}
              style={[styles.btn, styles.btnBig, working && styles.disabled]}
            >
              <Text style={styles.btnText}>{copy.challengePropose}</Text>
            </Pressable>
          </>
        ) : null}

        {negotiating && !isHomeCaptain && myRequest === 'accepted' ? (
          proposal ? (
            <>
              <View style={styles.proposal}>
                <Text style={[styles.label, semibold]}>{copy.challengeProposedLabel}</Text>
                <Text style={[styles.proposalTime, semibold]}>{proposal.time}</Text>
                <Text style={[styles.proposalDay, semibold]}>
                  {slotLabel(challenge.proposedStartsAt as string)}
                </Text>
                <Text style={styles.rowSub}>
                  📍 {challenge.proposedVenueName}
                  {matchArea ? ` · ${localeArea(matchArea)}` : ''} ·{' '}
                  {challenge.proposedVenueAddress}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={working}
                onPress={() => void confirmExactSlot()}
                style={[styles.btn, styles.btnBig, working && styles.disabled]}
              >
                <Text style={styles.btnText}>{copy.challengeConfirmSlot}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.info, { fontFamily: bodyFont(locale) }]}>
              ⏳ {copy.challengeWaitingProposal}
            </Text>
          )
        ) : null}

        {matched ? (
          <>
            {proposal ? (
              <View style={styles.proposal}>
                <Text style={[styles.label, semibold]}>{copy.matchKickoff}</Text>
                <Text style={[styles.proposalTime, semibold]}>{proposal.time}</Text>
                <Text style={[styles.proposalDay, semibold]}>
                  {`${slotLabel(challenge.proposedStartsAt as string)} · ${challenge.format}v${challenge.format}`}
                </Text>
                <Text style={styles.rowSub}>
                  📍 {challenge.proposedVenueName}
                  {matchArea ? ` · ${localeArea(matchArea)}` : ''} ·{' '}
                  {challenge.proposedVenueAddress}
                </Text>
              </View>
            ) : null}
            {challenge.linkedMatchId ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push(`/matches/${challenge.linkedMatchId}` as Href)}
                style={[styles.btn, styles.btnBig]}
              >
                <Text style={styles.btnText}>{copy.challengeMatchLink}</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </View>
    </AppPage>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    title: { color: colors.textSecondary, fontSize: 15 },
    cardWrap: { paddingTop: 11 },
    card: {
      borderWidth: 1.5,
      borderRadius: 22,
      padding: 14,
      gap: 11,
      backgroundColor: colors.cardBottom,
    },
    sticker: {
      position: 'absolute',
      top: 0,
      right: 16,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      transform: [{ rotate: '3deg' }],
    },
    stickerText: { color: ink, fontSize: 11, letterSpacing: 1.4, fontWeight: '800' },
    facts: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    factText: { color: colors.textSecondary, fontSize: 13, flexShrink: 1 },
    progress: { flexDirection: 'row', marginTop: 6 },
    stage: { flex: 1, alignItems: 'center', gap: 6 },
    stageLine: {
      position: 'absolute',
      top: 10,
      left: '50%',
      width: '100%',
      height: 2,
      backgroundColor: colors.border,
    },
    stageDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageTick: { color: ink, fontSize: 11, fontWeight: '800' },
    stageLabel: {
      color: colors.textSecondary,
      fontSize: 10.5,
      fontWeight: '700',
      textAlign: 'center',
    },
    panel: { gap: 12, marginTop: 6 },
    label: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    slotChip: {
      borderColor: 'rgba(255,255,255,0.18)',
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.surface,
    },
    slotChipOn: { backgroundColor: lime, borderColor: lime },
    slotChipText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
    note: { color: colors.textSecondary, fontSize: 14, fontStyle: 'italic' },
    info: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      backgroundColor: 'rgba(207,255,74,0.06)',
      borderColor: 'rgba(207,255,74,0.18)',
      borderWidth: 1,
      borderRadius: 16,
      padding: 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 10,
    },
    rowTitle: { flex: 1, minWidth: 0, color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
    rowSub: { color: colors.textSecondary, fontSize: 13, lineHeight: 19 },
    rowActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    btn: {
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: 16,
      backgroundColor: lime,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnBig: { minHeight: 52, borderRadius: 16 },
    btnSmall: { minHeight: 38, paddingHorizontal: 12 },
    btnText: { color: ink, fontSize: 16, fontWeight: '800' },
    btnTextSmall: { fontSize: 14 },
    btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    btnGhostText: { color: colors.textPrimary },
    btnDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#5a2a2a' },
    btnDangerText: { color: '#ff8a8a' },
    disabled: { opacity: 0.5 },
    stepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 6,
    },
    stepBtn: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
    stepValue: { color: colors.textPrimary, fontSize: 26, fontWeight: '800' },
    field: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: 14,
      fontSize: 15,
    },
    proposal: {
      borderWidth: 1.5,
      borderColor: lime,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 14,
      gap: 4,
    },
    proposalTime: { color: lime, fontSize: 32, fontWeight: '800' },
    proposalDay: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  });
}
