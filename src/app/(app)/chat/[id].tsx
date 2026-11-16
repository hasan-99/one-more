import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppAction, AppCard, AppPage, EmptyState } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import {
  getMatchChatRole,
  loadMatchChatReportCounts,
  loadMatchChatMessages,
  moderateMatchMessage,
  blockUser,
  reportMatchMessage,
  sendMatchMessage,
  subscribeToMatchMessages,
  type MatchChatMessage,
  type MatchChatRole,
  type MatchChatReportCount,
} from '@/features/matches/match-chat-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

type ChatStatus = 'loading' | 'ready' | 'denied' | 'error';
type ReportReason = 'spam' | 'harassment' | 'inappropriate';

export default function MatchChatScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string | string[] }>();
  const matchId = Array.isArray(rawId) ? rawId[0] : rawId;
  const { locale, colors } = useAppPreferences();
  const { user } = useAuth();
  const { showToast } = useToast();
  const copy = translations[locale];
  const styles = makeStyles(colors);
  const [status, setStatus] = useState<ChatStatus>('loading');
  const [role, setRole] = useState<MatchChatRole | null>(null);
  const [messages, setMessages] = useState<MatchChatMessage[]>([]);
  const [reportCounts, setReportCounts] = useState<Record<string, MatchChatReportCount>>({});
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [retry, setRetry] = useState(0);
  const operationKey = `${matchId ?? ''}:${user?.id ?? ''}:${retry}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const currentStatus = loadedKey === operationKey ? status : 'loading';
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [messageActionId, setMessageActionId] = useState<string | null>(null);

  const refreshMessages = useCallback(async () => {
    if (!matchId) return;
    const page = await loadMatchChatMessages(matchId);
    setHasMore(page.hasMore);
    setMessages((current) => mergeMessages(current, page.messages));
  }, [matchId]);

  useEffect(() => {
    if (!matchId || !user) return;
    let active = true;
    let removeSubscription = () => {};
    let accessTimer: ReturnType<typeof setInterval> | undefined;
    void (async () => {
      try {
        const nextRole = await getMatchChatRole(matchId);
        if (!active) return;
        if (!nextRole) {
          setRole(null);
          setStatus('denied');
          setLoadedKey(operationKey);
          return;
        }
        setRole(nextRole);
        const firstPage = await loadMatchChatMessages(matchId);
        if (!active) return;
        setMessages(firstPage.messages);
        setHasMore(firstPage.hasMore);
        if (nextRole === 'organizer') {
          const summaries = await loadMatchChatReportCounts(matchId);
          if (!active) return;
          setReportCounts(
            Object.fromEntries(summaries.map((summary) => [summary.message_id, summary])),
          );
        } else {
          setReportCounts({});
        }
        setStatus('ready');
        setLoadedKey(operationKey);
        removeSubscription = subscribeToMatchMessages(
          matchId,
          () => {
            void refreshMessages().catch(() => {
              if (active) setStatus('error');
            });
            if (nextRole === 'organizer') {
              void loadMatchChatReportCounts(matchId)
                .then((summaries) => {
                  if (active)
                    setReportCounts(
                      Object.fromEntries(summaries.map((summary) => [summary.message_id, summary])),
                    );
                })
                .catch(() => {
                  if (active) setStatus('error');
                });
            }
          },
          () => {
            if (active) setStatus('error');
          },
        );
        accessTimer = setInterval(() => {
          void getMatchChatRole(matchId)
            .then((currentRole) => {
              if (active && !currentRole) {
                removeSubscription();
                setMessages([]);
                setReportCounts({});
                setRole(null);
                setStatus('denied');
              } else if (active && currentRole === 'organizer') {
                void loadMatchChatReportCounts(matchId).then((summaries) => {
                  if (active)
                    setReportCounts(
                      Object.fromEntries(summaries.map((summary) => [summary.message_id, summary])),
                    );
                });
              }
            })
            .catch(() => {
              if (active) setStatus('error');
            });
        }, 15000);
      } catch {
        if (active) {
          setStatus('error');
          setLoadedKey(operationKey);
        }
      }
    })();
    return () => {
      active = false;
      if (accessTimer) clearInterval(accessTimer);
      removeSubscription();
    };
  }, [matchId, user, retry, refreshMessages, operationKey]);

  const loadOlder = async () => {
    const oldest = messages[0];
    if (!matchId || !oldest || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    try {
      const page = await loadMatchChatMessages(matchId, oldest);
      setMessages((current) => mergeMessages(page.messages, current));
      setHasMore(page.hasMore);
    } catch {
      showToast(copy.chatLoadError, 'error');
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = async () => {
    if (!matchId || !input.trim() || sending) return;
    setSending(true);
    try {
      await sendMatchMessage(matchId, input);
      setInput('');
      showToast(copy.chatSentToast, 'success');
      await refreshMessages();
    } catch {
      showToast(copy.chatSendError, 'error');
    } finally {
      setSending(false);
    }
  };

  const report = async (messageId: string, reason: ReportReason) => {
    setMessageActionId(messageId);
    try {
      await reportMatchMessage(messageId, reason);
      setReportingId(null);
      showToast(copy.chatReportSent, 'success');
    } catch {
      showToast(copy.chatReportError, 'error');
    } finally {
      setMessageActionId(null);
    }
  };

  const block = async (senderId: string) => {
    setMessageActionId(senderId);
    try {
      await blockUser(senderId);
      await refreshMessages();
      showToast(copy.chatUserBlocked, 'success');
    } catch {
      showToast(copy.chatBlockError, 'error');
    } finally {
      setMessageActionId(null);
    }
  };

  const moderate = async (messageId: string) => {
    setMessageActionId(messageId);
    try {
      await moderateMatchMessage(messageId);
      await refreshMessages();
      if (matchId) {
        const summaries = await loadMatchChatReportCounts(matchId);
        setReportCounts(
          Object.fromEntries(summaries.map((summary) => [summary.message_id, summary])),
        );
      }
      showToast(copy.chatMessageRemoved, 'success');
    } catch {
      showToast(copy.chatModerateError, 'error');
    } finally {
      setMessageActionId(null);
    }
  };

  if (currentStatus === 'loading') {
    return (
      <AppPage title={copy.appChatTitle} description={copy.chatDescription}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={copy.chatLoading}
          style={styles.state}
        >
          <Text style={styles.secondary}>{copy.chatLoading}</Text>
        </View>
      </AppPage>
    );
  }
  if (currentStatus === 'denied') {
    return (
      <AppPage title={copy.appChatTitle} description={copy.chatDescription}>
        <EmptyState title={copy.chatAccessDenied} description={copy.chatAccessDeniedDescription} />
        {matchId ? (
          <AppAction labelKey="matchDetails" href={`/matches/${matchId}`} secondary />
        ) : null}
      </AppPage>
    );
  }
  if (currentStatus === 'error') {
    return (
      <AppPage title={copy.appChatTitle} description={copy.chatDescription}>
        <View accessibilityRole="alert" style={styles.state}>
          <Text style={styles.error}>{copy.chatLoadError}</Text>
          <Button
            label={copy.chatRetry}
            onPress={() => {
              setLoadedKey(null);
              setRetry((value) => value + 1);
            }}
            colors={colors}
          />
        </View>
        {matchId ? (
          <AppAction labelKey="matchDetails" href={`/matches/${matchId}`} secondary />
        ) : null}
      </AppPage>
    );
  }

  return (
    <AppPage title={copy.appChatTitle} description={copy.chatDescription}>
      <AppAction labelKey="matchDetails" href={`/matches/${matchId}`} secondary />
      <AppCard>
        <Text accessibilityRole="status" style={styles.secondary}>
          {role === 'organizer' ? copy.chatOrganizerNotice : copy.chatMemberNotice}
        </Text>
        {hasMore ? (
          <Button
            label={loadingOlder ? copy.chatLoadingOlder : copy.chatLoadOlder}
            onPress={() => void loadOlder()}
            colors={colors}
            disabled={loadingOlder}
          />
        ) : null}
        <ScrollView
          style={styles.messages}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <EmptyState title={copy.chatEmptyTitle} description={copy.chatEmptyDescription} />
          ) : (
            messages.map((message) => {
              const ownMessage = message.sender_id === user?.id;
              return (
                <View key={message.id} style={ownMessage ? styles.ownMessage : styles.otherMessage}>
                  <View style={[styles.bubble, ownMessage ? styles.ownBubble : styles.otherBubble]}>
                    <Text style={styles.sender}>
                      {ownMessage ? copy.chatYou : message.sender_name}
                    </Text>
                    {reportCounts[message.id] ? (
                      <Text accessibilityRole="status" style={styles.reportBadge}>
                        {copy.chatReportCount.replace(
                          '{count}',
                          String(reportCounts[message.id].report_count),
                        )}
                      </Text>
                    ) : null}
                    <Text selectable style={styles.messageText}>
                      {message.status === 'removed' ? copy.chatRemovedPlaceholder : message.body}
                    </Text>
                    <Text style={styles.timestamp}>{formatTime(message.created_at, locale)}</Text>
                  </View>
                  {!ownMessage && message.status === 'visible' ? (
                    <View style={styles.messageActions}>
                      {role === 'organizer' ? (
                        <Button
                          label={
                            messageActionId === message.id
                              ? copy.chatWorking
                              : copy.chatRemoveMessage
                          }
                          onPress={() => void moderate(message.id)}
                          colors={colors}
                          disabled={messageActionId !== null}
                          secondary
                        />
                      ) : (
                        <Button
                          label={
                            reportingId === message.id ? copy.chatCancelReport : copy.chatReport
                          }
                          onPress={() =>
                            setReportingId(reportingId === message.id ? null : message.id)
                          }
                          colors={colors}
                          disabled={messageActionId !== null}
                          secondary
                        />
                      )}
                      <Button
                        label={copy.chatBlockUser}
                        onPress={() => void block(message.sender_id)}
                        colors={colors}
                        disabled={messageActionId !== null}
                        secondary
                      />
                      {reportingId === message.id ? (
                        <View style={styles.reasonActions}>
                          {(
                            [
                              ['spam', copy.chatReportSpam],
                              ['harassment', copy.chatReportHarassment],
                              ['inappropriate', copy.chatReportInappropriate],
                            ] as const
                          ).map(([reason, label]) => (
                            <Button
                              key={reason}
                              label={label}
                              onPress={() => void report(message.id, reason)}
                              colors={colors}
                              disabled={messageActionId !== null}
                              secondary
                            />
                          ))}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel={copy.chatInputLabel}
            placeholder={copy.chatInputPlaceholder}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
            editable={!sending}
            textAlignVertical="top"
            style={styles.input}
          />
          <Text style={styles.counter}>{input.length}/1000</Text>
          <Button
            label={sending ? copy.chatSending : copy.chatSend}
            onPress={() => void send()}
            colors={colors}
            disabled={sending || input.trim().length === 0 || input.trim().length > 1000}
            primary
          />
        </View>
      </AppCard>
    </AppPage>
  );
}

function mergeMessages(left: MatchChatMessage[], right: MatchChatMessage[]) {
  const unique = new Map<string, MatchChatMessage>();
  for (const message of [...left, ...right]) unique.set(message.id, message);
  return [...unique.values()].sort(
    (a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

function formatTime(value: string, locale: 'en' | 'el') {
  return new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function Button({
  label,
  onPress,
  colors,
  disabled = false,
  primary = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  disabled?: boolean;
  primary?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 11,
        borderWidth: 1,
        borderColor: primary ? colors.primaryButton : colors.border,
        backgroundColor: primary
          ? colors.primaryButton
          : secondary
            ? colors.surfaceRaised
            : colors.surface,
        paddingHorizontal: 12,
        opacity: disabled ? 0.55 : pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: primary ? colors.primaryButtonText : colors.textPrimary,
          fontWeight: '700',
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    state: { gap: 12, padding: 18, alignItems: 'flex-start' },
    secondary: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    error: { color: colors.errorText, fontSize: 14, lineHeight: 21 },
    messages: { maxHeight: 480, minHeight: 180 },
    messageList: { gap: 12, paddingVertical: 8 },
    ownMessage: { alignSelf: 'flex-end', alignItems: 'flex-end', maxWidth: '88%' },
    otherMessage: { alignSelf: 'flex-start', alignItems: 'flex-start', maxWidth: '88%' },
    bubble: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 5 },
    ownBubble: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
    otherBubble: { backgroundColor: colors.background, borderColor: colors.border },
    sender: { color: colors.accentText, fontWeight: '800', fontSize: 12 },
    reportBadge: { color: colors.errorText, fontSize: 12, fontWeight: '700' },
    messageText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22, flexShrink: 1 },
    timestamp: { alignSelf: 'flex-end', color: colors.textMuted, fontSize: 11 },
    messageActions: { gap: 6, marginTop: 5, maxWidth: '100%' },
    reasonActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    composer: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
    input: {
      minHeight: 86,
      maxHeight: 150,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      color: colors.textPrimary,
      backgroundColor: colors.background,
      fontSize: 15,
    },
    counter: { color: colors.textMuted, fontSize: 12, textAlign: 'right' },
  });
}
