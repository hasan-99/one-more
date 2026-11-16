import { Link, router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppAction, AppCard, AppPage, EmptyState } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import { useAuth } from '@/auth/AuthProvider';
import { MatchHero } from '@/features/matches/MatchHero';
import {
  loadMatchJoinRequests,
  loadOwnJoinRequest,
  loadOwnWaitlistState,
  joinMatchWaitlist,
  leaveMatchWaitlist,
  leaveActiveMatch,
  answerWaitlistOffer,
  requestMatchJoin,
  reviewMatchJoinRequest,
  withdrawMatchJoinRequest,
  type MatchJoinRequest,
  type OwnJoinRequest,
  type WaitlistState,
} from '@/features/matches/match-join-service';
import { cancelMatch, loadMatch, type MatchDiscoveryItem } from '@/features/matches/match-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function MatchDetailsScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { locale, colors } = useAppPreferences();
  const { user } = useAuth();
  const copy = translations[locale];
  const { showToast } = useToast();
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [selectedPositionSlotId, setSelectedPositionSlotId] = useState<string | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinRetry, setJoinRetry] = useState(0);
  const [joinState, setJoinState] = useState<{
    key: string;
    own: OwnJoinRequest | null;
    waitlist: WaitlistState | null;
    requests: MatchJoinRequest[];
    error: boolean;
  } | null>(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<{
    id: string | undefined;
    match: MatchDiscoveryItem | null;
    error: boolean;
  } | null>(null);
  const currentJoinState = user && joinState?.key === `${id}:${user.id}` ? joinState : null;
  const [retry, setRetry] = useState(0);
  const current = result?.id === id ? result : null;
  const match = current?.match ?? null;
  const loading = current === null;
  const error = current?.error ?? false;

  useEffect(() => {
    let active = true;
    void (id ? loadMatch(id) : Promise.resolve(null))
      .then((matchResult) => {
        if (active) setResult({ id, match: matchResult, error: false });
      })
      .catch(() => {
        if (active) setResult({ id, match: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [id, retry]);

  useEffect(() => {
    if (!id || !match || !user) return;
    let active = true;
    // Each part fails on its own: the organizer's request list must not break because the
    // player's own join state could not be read (or the other way round).
    const key = `${id}:${user.id}`;
    const attempt = <T,>(task: Promise<T>, fallback: T) =>
      task
        .then((value) => ({ value, failed: false }))
        .catch(() => ({ value: fallback, failed: true }));
    void Promise.all([
      attempt(loadOwnJoinRequest(id, user.id), null as OwnJoinRequest | null),
      attempt(
        match.isOrganizer ? loadMatchJoinRequests(id) : Promise.resolve([] as MatchJoinRequest[]),
        [] as MatchJoinRequest[],
      ),
      attempt(loadOwnWaitlistState(id), null as WaitlistState | null),
    ]).then(([own, requests, waitlist]) => {
      if (!active) return;
      setJoinState({
        key,
        own: own.value,
        waitlist: waitlist.value,
        requests: requests.value,
        error: match.isOrganizer ? requests.failed : own.failed || waitlist.failed,
      });
    });
    return () => {
      active = false;
    };
  }, [id, match, user, joinRetry]);

  useEffect(() => {
    if (!currentJoinState?.waitlist?.expires_at) return;
    const initial = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [currentJoinState?.waitlist?.expires_at]);

  const styles = makeStyles(colors);
  if (loading) {
    return (
      <AppPage title={copy.matchDetails} description={copy.matchDetailsIntro}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={copy.matchLoading}
          style={styles.stateBox}
        >
          <Text style={styles.stateText}>{copy.matchLoading}</Text>
        </View>
      </AppPage>
    );
  }
  if (error) {
    return (
      <AppPage title={copy.matchDetails} description={copy.matchDetailsIntro}>
        <View accessibilityRole="alert" style={styles.stateBox}>
          <Text style={styles.error}>{copy.matchLoadError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setRetry((attempt) => attempt + 1)}
            style={styles.retry}
          >
            <Text style={styles.retryText}>{copy.matchRetry}</Text>
          </Pressable>
        </View>
        <AppAction labelKey="matchBackToExplore" href="/explore" secondary />
      </AppPage>
    );
  }
  if (!match) {
    return (
      <AppPage title={copy.matchDetails} description={copy.matchDetailsIntro}>
        <EmptyState title={copy.matchDetails} description={copy.matchUnavailable} />
        <AppAction labelKey="matchBackToExplore" href="/explore" secondary />
      </AppPage>
    );
  }

  const city = locale === 'el' ? match.cityNameEl : match.cityNameEn;
  const area = locale === 'el' ? match.areaNameEl : match.areaNameEn;
  const positionCopy = {
    goalkeeper: copy.matchGoalkeeper,
    defender: copy.matchDefender,
    midfielder: copy.matchMidfielder,
    forward: copy.matchForward,
    any: copy.matchAnyPosition,
  };
  const refreshJoinState = () => setJoinRetry((attempt) => attempt + 1);
  const sendJoinRequest = async () => {
    if (!user) return;
    setJoinBusy(true);
    try {
      await requestMatchJoin(match.id, selectedPositionSlotId);
      showToast(copy.matchJoinSentToast, 'success');
      refreshJoinState();
    } catch {
      showToast(copy.matchJoinError, 'error');
    } finally {
      setJoinBusy(false);
    }
  };
  const withdrawJoinRequest = async () => {
    if (!currentJoinState?.own) return;
    setJoinBusy(true);
    try {
      await withdrawMatchJoinRequest(match.id, currentJoinState.own.id);
      showToast(copy.matchJoinWithdrawToast, 'success');
      refreshJoinState();
    } catch {
      showToast(copy.matchJoinActionError, 'error');
    } finally {
      setJoinBusy(false);
    }
  };
  const waitlistAction = async (
    action: 'join' | 'leave' | 'accept' | 'decline' | 'leave_match',
  ) => {
    if (!user) return;
    const offerId = currentJoinState?.waitlist?.offer_id;
    setJoinBusy(true);
    try {
      if (action === 'join') await joinMatchWaitlist(match.id, null);
      if (action === 'leave') await leaveMatchWaitlist(match.id);
      if (action === 'leave_match') await leaveActiveMatch(match.id);
      if (action === 'accept' && offerId) await answerWaitlistOffer(offerId, true);
      if (action === 'decline' && offerId) await answerWaitlistOffer(offerId, false);
      showToast(
        action === 'join' ? copy.matchWaitlistJoinedToast : copy.matchWaitlistUpdatedToast,
        'success',
      );
      refreshJoinState();
      setRetry((attempt) => attempt + 1);
    } catch {
      showToast(copy.matchWaitlistActionError, 'error');
      refreshJoinState();
    } finally {
      setJoinBusy(false);
    }
  };
  const reviewRequest = async (participantId: string, decision: 'approve' | 'reject') => {
    setJoinBusy(true);
    try {
      await reviewMatchJoinRequest(match.id, participantId, decision);
      showToast(
        decision === 'approve' ? copy.matchJoinApprovedToast : copy.matchJoinRejectedToast,
        'success',
      );
      setRetry((attempt) => attempt + 1);
      refreshJoinState();
    } catch {
      showToast(copy.matchJoinActionError, 'error');
    } finally {
      setJoinBusy(false);
    }
  };
  const joinSettled = Boolean(currentJoinState && !currentJoinState.error);
  const waitlistStatus = currentJoinState?.waitlist?.status;
  const canAskToJoin =
    !match.isOrganizer &&
    joinSettled &&
    currentJoinState?.own?.status !== 'pending' &&
    currentJoinState?.own?.status !== 'active' &&
    waitlistStatus !== 'offered' &&
    waitlistStatus !== 'waiting' &&
    waitlistStatus !== 'accepted' &&
    waitlistStatus !== 'left';
  const canChat = Boolean(
    user && (match.isOrganizer || currentJoinState?.own?.status === 'active'),
  );
  const barLabel = joinBusy
    ? copy.matchSaving
    : match.freeSpots > 0
      ? copy.matchJoinRequest
      : copy.matchWaitlistJoin;
  const showBar = match.isOrganizer || canChat || canAskToJoin || !user;
  return (
    <View style={{ flex: 1 }}>
      {/* The ticket below already carries the title, so the page heading is left out. */}
      <AppPage title={match.title} heading={<View style={{ height: 0, marginBottom: -14 }} />}>
        <MatchHero
          locale={locale}
          data={{
            title: match.title,
            sideSize: match.sideSize,
            startsAt: match.startsAt,
            venueName: match.venueName,
            areaLabel: area,
            cityLabel: city,
            durationMinutes: match.durationMinutes,
            priceEur: match.priceEur,
            taken: Math.max(0, match.capacity - match.freeSpots),
            capacity: match.capacity,
            bookingStatus: match.bookingStatus,
            statusLabel: match.isOrganizer ? copy.heroStatusPublished : undefined,
          }}
        />
        {match.notes ? (
          <Text style={styles.detail}>
            {copy.matchNotesLabel}: {match.notes}
          </Text>
        ) : null}
        {!match.isOrganizer ? (
          <AppCard>
            <Text style={styles.sectionTitle}>{copy.matchJoinRequest}</Text>
            {!user ? (
              <>
                <Text style={styles.detail}>{copy.authProtectedDescription}</Text>
                <AppAction
                  labelKey="authEntry"
                  href={`/sign-in?returnTo=${encodeURIComponent(`/matches/${match.id}`)}`}
                />
              </>
            ) : currentJoinState?.error ? (
              <View accessibilityRole="alert" style={styles.stateBox}>
                <Text style={styles.error}>{copy.matchJoinActionError}</Text>
                <Button label={copy.matchJoinRetry} onPress={refreshJoinState} colors={colors} />
              </View>
            ) : !currentJoinState ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={copy.matchLoading}
                style={styles.stateBox}
              >
                <Text style={styles.stateText}>{copy.matchLoading}</Text>
              </View>
            ) : (
              <>
                {currentJoinState.waitlist?.status === 'offered' &&
                currentJoinState.waitlist.offer_id ? (
                  <>
                    <Text accessibilityRole="status" style={styles.detail}>
                      {copy.matchWaitlistOffer} ·{' '}
                      {copy.matchWaitlistTimeLeft.replace(
                        '{time}',
                        formatCountdown(
                          Math.max(0, Date.parse(currentJoinState.waitlist.expires_at ?? '') - now),
                        ),
                      )}
                    </Text>
                    {Date.parse(currentJoinState.waitlist.expires_at ?? '') <= now ? (
                      <Button
                        label={copy.matchJoinRetry}
                        onPress={refreshJoinState}
                        colors={colors}
                      />
                    ) : null}
                    <View style={styles.ownerActions}>
                      <Button
                        label={copy.matchWaitlistAccept}
                        onPress={() => void waitlistAction('accept')}
                        colors={colors}
                        disabled={
                          joinBusy || Date.parse(currentJoinState.waitlist.expires_at ?? '') <= now
                        }
                        primary
                      />
                      <Button
                        label={copy.matchWaitlistDecline}
                        onPress={() => void waitlistAction('decline')}
                        colors={colors}
                        disabled={
                          joinBusy || Date.parse(currentJoinState.waitlist.expires_at ?? '') <= now
                        }
                      />
                    </View>
                  </>
                ) : currentJoinState.waitlist?.status === 'waiting' ? (
                  <>
                    <Text accessibilityRole="status" style={styles.detail}>
                      {copy.matchWaitlistPosition.replace(
                        '{position}',
                        String(currentJoinState.waitlist.queue_position ?? '—'),
                      )}
                    </Text>
                    <Button
                      label={copy.matchWaitlistLeave}
                      onPress={() => void waitlistAction('leave')}
                      colors={colors}
                      disabled={joinBusy}
                    />
                  </>
                ) : currentJoinState.own?.status === 'pending' ? (
                  <>
                    <Text accessibilityRole="status" style={styles.detail}>
                      {copy.matchJoinPending}
                    </Text>
                    <Button
                      label={copy.matchJoinWithdraw}
                      onPress={() => void withdrawJoinRequest()}
                      colors={colors}
                      disabled={joinBusy}
                    />
                  </>
                ) : currentJoinState.own?.status === 'active' ? (
                  <>
                    <Text accessibilityRole="status" style={styles.detail}>
                      {copy.matchJoinAccepted}
                    </Text>
                    <Button
                      label={copy.matchLeaveActive}
                      onPress={() => void waitlistAction('leave_match')}
                      colors={colors}
                      disabled={joinBusy}
                    />
                  </>
                ) : currentJoinState.waitlist?.status === 'accepted' ? (
                  <Text accessibilityRole="status" style={styles.detail}>
                    {copy.matchJoinAccepted}
                  </Text>
                ) : (
                  <>
                    {currentJoinState.own?.status === 'rejected' ? (
                      <Text accessibilityRole="status" style={styles.detail}>
                        {copy.matchJoinRejected}
                      </Text>
                    ) : currentJoinState.own?.status === 'cancelled' ? (
                      <Text accessibilityRole="status" style={styles.detail}>
                        {copy.matchJoinCancelled}
                      </Text>
                    ) : null}
                    <Text style={styles.detail}>{copy.matchJoinPosition}</Text>
                    <View style={styles.ownerActions}>
                      <Choice
                        label={copy.matchJoinNone}
                        selected={selectedPositionSlotId === null}
                        onPress={() => setSelectedPositionSlotId(null)}
                        colors={colors}
                      />
                      {match.openPositions.slice(0, Math.max(0, match.freeSpots)).map((slot) => (
                        <Choice
                          key={slot.id}
                          label={positionCopy[slot.position]}
                          selected={selectedPositionSlotId === slot.id}
                          onPress={() => setSelectedPositionSlotId(slot.id)}
                          colors={colors}
                        />
                      ))}
                    </View>
                    {currentJoinState.waitlist?.status === 'expired' ||
                    currentJoinState.waitlist?.status === 'declined' ? (
                      <Text accessibilityRole="status" style={styles.detail}>
                        {copy.matchWaitlistOfferEnded}
                      </Text>
                    ) : null}
                    {match.freeSpots > 0 ? (
                      <Button
                        label={joinBusy ? copy.matchSaving : copy.matchJoinRequest}
                        onPress={() => void sendJoinRequest()}
                        colors={colors}
                        disabled={joinBusy}
                        primary
                      />
                    ) : (
                      <Button
                        label={joinBusy ? copy.matchSaving : copy.matchWaitlistJoin}
                        onPress={() => void waitlistAction('join')}
                        colors={colors}
                        disabled={joinBusy || currentJoinState.waitlist?.status === 'left'}
                        primary
                      />
                    )}
                  </>
                )}
              </>
            )}
          </AppCard>
        ) : null}
        {match.isOrganizer ? (
          <AppCard>
            <Text style={styles.sectionTitle}>{copy.matchJoinRequestsTitle}</Text>
            {currentJoinState?.error ? (
              <View accessibilityRole="alert" style={styles.stateBox}>
                <Text style={styles.error}>{copy.matchJoinListError}</Text>
                <Button label={copy.matchJoinRetry} onPress={refreshJoinState} colors={colors} />
              </View>
            ) : !currentJoinState ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel={copy.matchLoading}
                style={styles.stateBox}
              >
                <Text style={styles.stateText}>{copy.matchLoading}</Text>
              </View>
            ) : currentJoinState.requests.length === 0 ? (
              <Text style={styles.detail}>{copy.matchJoinEmpty}</Text>
            ) : (
              currentJoinState.requests.map((request) => (
                <View key={request.participant_id} style={styles.requestRow}>
                  <View style={styles.requestCopy}>
                    <Text style={styles.sectionTitle}>{request.display_name}</Text>
                    <Text style={styles.detail}>
                      {request.status === 'pending'
                        ? copy.matchJoinPending
                        : copy.matchJoinAccepted}
                      {request.position_label
                        ? ` · ${positionCopy[request.position_label as keyof typeof positionCopy] ?? ''}`
                        : ''}
                    </Text>
                  </View>
                  {request.status === 'pending' ? (
                    <View style={styles.ownerActions}>
                      <Button
                        label={copy.matchJoinApprove}
                        onPress={() => void reviewRequest(request.participant_id, 'approve')}
                        colors={colors}
                        disabled={joinBusy}
                        primary
                      />
                      <Button
                        label={copy.matchJoinReject}
                        onPress={() => void reviewRequest(request.participant_id, 'reject')}
                        colors={colors}
                        disabled={joinBusy}
                      />
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </AppCard>
        ) : null}
        {match.isOrganizer && cancelPending ? (
          <Text style={[styles.error, styles.cancelConfirm]}>{copy.matchCancelConfirm}</Text>
        ) : null}
        <View style={styles.footerRow}>
          {match.isOrganizer && cancelPending ? (
            <>
              <Pressable
                accessibilityRole="button"
                disabled={cancelling}
                onPress={() => setCancelPending(false)}
                style={styles.footerButton}
              >
                <Text numberOfLines={2} style={styles.footerText}>
                  {copy.matchCancelKeep}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={cancelling}
                onPress={() => {
                  setCancelling(true);
                  void cancelMatch(match.id)
                    .then(() => {
                      showToast(copy.matchCancelSuccess, 'success');
                      router.replace('/explore');
                    })
                    .catch(() => showToast(copy.matchCancelError, 'error'))
                    .finally(() => setCancelling(false));
                }}
                style={[styles.footerButton, styles.footerDanger]}
              >
                <Text numberOfLines={2} style={[styles.footerText, styles.footerDangerText]}>
                  {cancelling ? copy.matchSaving : copy.matchCancel}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Link href={'/explore' as Href} asChild>
                <Pressable accessibilityRole="link" style={styles.footerButton}>
                  <Text numberOfLines={2} style={styles.footerText}>
                    {copy.matchBackToExplore}
                  </Text>
                </Pressable>
              </Link>
              {match.isOrganizer ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setCancelPending(true)}
                  style={[styles.footerButton, styles.footerDanger]}
                >
                  <Text numberOfLines={2} style={[styles.footerText, styles.footerDangerText]}>
                    {copy.matchCancel}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </AppPage>
      {showBar ? (
        <View style={styles.bar}>
          {match.isOrganizer ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/create?matchId=${match.id}` as Href)}
              style={styles.barMain}
            >
              <Text style={styles.barMainText}>{copy.matchEditTitle}</Text>
            </Pressable>
          ) : !user ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  `/sign-in?returnTo=${encodeURIComponent(`/matches/${match.id}`)}` as Href,
                )
              }
              style={styles.barMain}
            >
              <Text style={styles.barMainText}>{copy.authEntry}</Text>
            </Pressable>
          ) : canAskToJoin ? (
            <Pressable
              accessibilityRole="button"
              disabled={joinBusy}
              onPress={() =>
                void (match.freeSpots > 0 ? sendJoinRequest() : waitlistAction('join'))
              }
              style={[styles.barMain, joinBusy && { opacity: 0.6 }]}
            >
              <Text style={styles.barMainText}>{barLabel}</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {canChat ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.appChatTitle}
              onPress={() => router.push(`/chat/${match.id}` as Href)}
              style={canAskToJoin || match.isOrganizer ? styles.barChat : styles.barMain}
            >
              <Text
                style={canAskToJoin || match.isOrganizer ? styles.barChatText : styles.barMainText}
              >
                {canAskToJoin || match.isOrganizer ? '💬' : `💬  ${copy.appChatTitle}`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatCountdown(milliseconds: number) {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    cancelConfirm: { marginTop: 4 },
    footerRow: { flexDirection: 'row', gap: 10 },
    footerButton: {
      flex: 1,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    footerText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    footerDanger: { borderColor: colors.errorText, backgroundColor: 'transparent' },
    footerDangerText: { color: colors.errorText },
    detail: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    bar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    barMain: {
      flex: 1,
      height: 54,
      borderRadius: 16,
      backgroundColor: colors.primaryButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    barMainText: { color: colors.primaryButtonText, fontSize: 16, fontWeight: '800' },
    barChat: {
      width: 54,
      height: 54,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    barChatText: { fontSize: 20 },
    infoCard: {
      gap: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardTop,
      padding: 14,
    },
    disclosure: { color: colors.textSecondary, fontSize: 12.5, lineHeight: 18 },
    sectionTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800' },
    stateBox: { minHeight: 130, justifyContent: 'center', alignItems: 'center', gap: 12 },
    stateText: { color: colors.textSecondary, fontSize: 14 },
    error: { color: colors.errorText, fontSize: 14, textAlign: 'center' },
    retry: { minHeight: 42, paddingHorizontal: 14, justifyContent: 'center' },
    retryText: { color: colors.accentText, fontWeight: '800' },
    ownerActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    requestRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    requestCopy: { flex: 1, minWidth: 160, gap: 4 },
  });
}

function Button({
  label,
  onPress,
  colors,
  disabled = false,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 44,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 11,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: primary ? colors.primaryButton : colors.surfaceRaised,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          color: primary ? colors.primaryButtonText : colors.textPrimary,
          fontWeight: '800',
          fontSize: 13,
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
        minHeight: 42,
        paddingHorizontal: 12,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: selected ? colors.accentText : colors.border,
        backgroundColor: selected ? colors.surfaceRaised : colors.surface,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}
