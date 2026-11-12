import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppAction, AppPage, EmptyState } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import {
  listInboxNotifications,
  markAllInboxNotificationsRead,
  markInboxNotificationRead,
  type InboxNotification,
} from '@/features/notifications/notification-service';
import { translations, type TranslationKey } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

const notificationCopy = {
  match_join_requested: ['notificationJoinRequestedTitle', 'notificationJoinRequestedBody'],
  match_join_approved: ['notificationJoinApprovedTitle', 'notificationJoinApprovedBody'],
  match_join_rejected: ['notificationJoinRejectedTitle', 'notificationJoinRejectedBody'],
  match_waitlist_offer: ['notificationWaitlistOfferTitle', 'notificationWaitlistOfferBody'],
  match_waitlist_offer_accepted: [
    'notificationWaitlistAcceptedTitle',
    'notificationWaitlistAcceptedBody',
  ],
  match_waitlist_offer_declined: [
    'notificationWaitlistDeclinedTitle',
    'notificationWaitlistDeclinedBody',
  ],
  match_waitlist_offer_expired: [
    'notificationWaitlistExpiredTitle',
    'notificationWaitlistExpiredBody',
  ],
  match_waitlist_offer_cancelled: [
    'notificationWaitlistCancelledTitle',
    'notificationWaitlistCancelledBody',
  ],
  challenge_request_received: [
    'notificationChallengeRequestTitle',
    'notificationChallengeRequestBody',
  ],
  challenge_request_accepted: [
    'notificationChallengeAcceptedTitle',
    'notificationChallengeAcceptedBody',
  ],
  challenge_request_rejected: [
    'notificationChallengeDeclinedTitle',
    'notificationChallengeDeclinedBody',
  ],
  challenge_match_ready: ['notificationChallengeMatchTitle', 'notificationChallengeMatchBody'],
  challenge_cancelled: [
    'notificationChallengeCancelledTitle',
    'notificationChallengeCancelledBody',
  ],
  match_reminder_24h: ['notificationReminder24hTitle', 'notificationReminder24hBody'],
  match_reminder_2h: ['notificationReminder2hTitle', 'notificationReminder2hBody'],
} as const satisfies Record<string, readonly [TranslationKey, TranslationKey]>;

export default function NotificationsScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [loadError, setLoadError] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      setNotifications(await listInboxNotifications());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const markRead = async (notificationId: string) => {
    setWorkingId(notificationId);
    try {
      await markInboxNotificationRead(notificationId);
      await load();
      showToast(copy.notificationsMarkSuccess, 'success');
    } catch {
      showToast(copy.notificationsMarkError, 'error');
    } finally {
      setWorkingId(null);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllInboxNotificationsRead();
      await load();
      showToast(copy.notificationsMarkAllSuccess, 'success');
    } catch {
      showToast(copy.notificationsMarkError, 'error');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;
  return (
    <AppPage title={copy.appNotificationsTitle} description={copy.appNotificationsIntro}>
      {!user ? (
        <>
          <EmptyState title={copy.appNoNotificationsTitle} description={copy.notificationsSignIn} />
          <AppAction labelKey="authSignIn" href="/sign-in?returnTo=%2Fnotifications" />
        </>
      ) : loading ? (
        <View accessibilityRole="progressbar" accessibilityLabel={copy.chatLoading} />
      ) : loadError ? (
        <>
          <EmptyState title={copy.profileLoadError} description={copy.notificationsMarkError} />
          <ActionButton label={copy.profileRetry} onPress={() => void load()} colors={colors} />
        </>
      ) : notifications.length === 0 ? (
        <>
          <EmptyState
            title={copy.appNoNotificationsTitle}
            description={copy.appNoNotificationsCopy}
          />
          <AppAction labelKey="appSettingsAction" href="/settings" secondary />
        </>
      ) : (
        <>
          {unreadCount > 0 ? (
            <ActionButton
              label={markingAll ? copy.profileSaving : copy.notificationsMarkAllRead}
              onPress={() => void markAllRead()}
              colors={colors}
              disabled={markingAll}
            />
          ) : null}
          {notifications.map((notification) => {
            const keys = notificationCopy[notification.event_type as keyof typeof notificationCopy];
            if (!keys) return null;
            const title = copy[keys[0]];
            const body = copy[keys[1]];
            return (
              <Pressable
                key={notification.id}
                accessibilityRole="link"
                accessibilityLabel={`${title}. ${body}`}
                onPress={() => router.push(notification.href as Href)}
                style={[
                  styles.notification,
                  {
                    backgroundColor: notification.read_at ? colors.surface : colors.surfaceRaised,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.notificationHeader}>
                  <View style={styles.titleLine}>
                    {!notification.read_at ? (
                      <View style={[styles.unreadDot, { backgroundColor: colors.primaryButton }]} />
                    ) : null}
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                  </View>
                  <Text style={[styles.time, { color: colors.textMuted }]}>
                    {new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                      timeZone: 'Asia/Nicosia',
                    }).format(new Date(notification.created_at))}
                  </Text>
                </View>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{body}</Text>
                {!notification.read_at ? (
                  <ActionButton
                    label={
                      workingId === notification.id
                        ? copy.profileSaving
                        : copy.notificationsMarkRead
                    }
                    onPress={(event) => {
                      event.stopPropagation();
                      void markRead(notification.id);
                    }}
                    colors={colors}
                    disabled={workingId !== null}
                    secondary
                  />
                ) : null}
              </Pressable>
            );
          })}
        </>
      )}
    </AppPage>
  );
}

function ActionButton({
  label,
  onPress,
  colors,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: (event: { stopPropagation: () => void }) => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        { backgroundColor: secondary ? colors.surface : colors.primaryButton },
      ]}
    >
      <Text style={{ color: secondary ? colors.textPrimary : colors.primaryButtonText }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  notification: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 10 },
  notificationHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  title: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  time: { fontSize: 12 },
  body: { fontSize: 14, lineHeight: 21 },
  action: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
  },
});
