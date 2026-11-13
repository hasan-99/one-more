import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AuthButton, AuthFeedback } from '@/components/auth/AuthPage';
import { AppCard, AppPage } from '@/components/layout/AppPage';
import { AppearanceSwitcher } from '@/components/preferences-switchers';
import { useToast } from '@/components/toast/ToastProvider';
import {
  cancelAccountDeletionRequest,
  getAccountDeletionRequest,
  getNotificationPreferences,
  requestAccountDeletion,
  saveNotificationPreferences,
  type AccountDeletionRequestRow,
} from '@/features/profile/profile-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function SettingsScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const { user } = useAuth();
  const { showToast } = useToast();
  const [discoveryEmail, setDiscoveryEmail] = useState(false);
  const [chatEmail, setChatEmail] = useState(false);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [notificationState, setNotificationState] = useState<{
    userId: string;
    loading: boolean;
    error: boolean;
    loaded: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequestRow | null>(null);
  const [deletionConfirming, setDeletionConfirming] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const currentState = user?.id === notificationState?.userId ? notificationState : null;
  const loading = Boolean(user) && (!currentState || currentState.loading);
  const loadError = currentState?.error ?? false;
  const loaded = currentState?.loaded ?? false;

  const load = useCallback(async () => {
    if (!user) return;
    setNotificationState({ userId: user.id, loading: true, error: false, loaded: false });
    try {
      const [preferences, request] = await Promise.all([
        getNotificationPreferences(user.id),
        getAccountDeletionRequest(user.id),
      ]);
      setInAppEnabled(preferences.in_app_enabled);
      setDiscoveryEmail(preferences.discovery_email_enabled);
      setChatEmail(preferences.chat_email_enabled);
      setDeletionRequest(request);
      setNotificationState({ userId: user.id, loading: false, error: false, loaded: true });
    } catch {
      setNotificationState({ userId: user.id, loading: false, error: true, loaded: false });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void Promise.all([getNotificationPreferences(user.id), getAccountDeletionRequest(user.id)])
      .then(([preferences, request]) => {
        if (!active) return;
        setInAppEnabled(preferences.in_app_enabled);
        setDiscoveryEmail(preferences.discovery_email_enabled);
        setChatEmail(preferences.chat_email_enabled);
        setDeletionRequest(request);
        setNotificationState({ userId: user.id, loading: false, error: false, loaded: true });
      })
      .catch(() => {
        if (!active) return;
        setNotificationState({ userId: user.id, loading: false, error: true, loaded: false });
      });
    return () => {
      active = false;
    };
  }, [user]);

  const save = async () => {
    if (!user || !loaded) return;
    setSaving(true);
    try {
      await saveNotificationPreferences(user.id, {
        in_app_enabled: inAppEnabled,
        discovery_email_enabled: discoveryEmail,
        chat_email_enabled: chatEmail,
      });
      showToast(copy.profileNotificationSaveSuccess, 'success');
    } catch {
      showToast(copy.profileNotificationSaveError, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitDeletionRequest = async () => {
    if (!user) return;
    setDeletionBusy(true);
    try {
      await requestAccountDeletion();
      setDeletionRequest(await getAccountDeletionRequest(user.id));
      setDeletionConfirming(false);
      showToast(copy.settingsDeletionRequestSuccess, 'success');
    } catch {
      showToast(copy.settingsDeletionRequestError, 'error');
    } finally {
      setDeletionBusy(false);
    }
  };

  const cancelDeletionRequest = async () => {
    if (!deletionRequest) return;
    setDeletionBusy(true);
    try {
      const cancelled = await cancelAccountDeletionRequest(deletionRequest.id);
      if (!cancelled) throw new Error('deletion_request_not_cancellable');
      setDeletionRequest(null);
      showToast(copy.settingsDeletionCancelSuccess, 'success');
    } catch {
      showToast(copy.settingsDeletionCancelError, 'error');
    } finally {
      setDeletionBusy(false);
    }
  };

  return (
    <AppPage title={copy.appSettingsTitle} description={copy.appSettingsIntro}>
      {user ? (
        <AppCard>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.textPrimary }]}
          >
            {copy.themeLabel}
          </Text>
          <Text style={{ color: colors.textSecondary }}>{copy.themeSettingsIntro}</Text>
          <AppearanceSwitcher />
        </AppCard>
      ) : null}
      {user ? (
        <AppCard>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.textPrimary }]}
          >
            {copy.profileSettingsNotifications}
          </Text>
          {loading ? (
            <View accessibilityRole="progressbar" accessibilityLabel={copy.profileLoading}>
              <Text style={{ color: colors.textSecondary }}>{copy.profileLoading}</Text>
            </View>
          ) : loadError ? (
            <>
              <AuthFeedback>{copy.profileNotificationSaveError}</AuthFeedback>
              <AuthButton label={copy.profileRetry} onPress={() => void load()} />
            </>
          ) : (
            <>
              <PreferenceToggle
                label={copy.profileInAppNotifications}
                value={inAppEnabled}
                onChange={setInAppEnabled}
              />
              <PreferenceToggle
                label={copy.profileDiscoveryEmail}
                value={discoveryEmail}
                onChange={setDiscoveryEmail}
              />
              <PreferenceToggle
                label={copy.profileChatEmail}
                value={chatEmail}
                onChange={setChatEmail}
              />
              <AuthButton
                label={saving ? copy.profileSaving : copy.profileSave}
                disabled={saving}
                onPress={() => void save()}
              />
            </>
          )}
        </AppCard>
      ) : null}
      {user && loaded && !loadError ? (
        <AppCard>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.textPrimary }]}
          >
            {copy.settingsDeletionTitle}
          </Text>
          <Text style={{ color: colors.textSecondary }}>{copy.settingsDeletionDescription}</Text>
          {deletionRequest ? (
            <>
              <Text style={{ color: colors.textPrimary }}>{copy.settingsDeletionRequested}</Text>
              <AuthButton
                label={deletionBusy ? copy.profileSaving : copy.settingsDeletionCancel}
                disabled={deletionBusy}
                onPress={() => void cancelDeletionRequest()}
              />
            </>
          ) : deletionConfirming ? (
            <>
              <AuthFeedback>{copy.settingsDeletionConfirm}</AuthFeedback>
              <AuthButton
                label={deletionBusy ? copy.profileSaving : copy.settingsDeletionRequest}
                disabled={deletionBusy}
                onPress={() => void submitDeletionRequest()}
              />
              <AuthButton
                label={copy.commonCancel}
                disabled={deletionBusy}
                onPress={() => setDeletionConfirming(false)}
              />
            </>
          ) : (
            <AuthButton
              label={copy.settingsDeletionStart}
              onPress={() => setDeletionConfirming(true)}
            />
          )}
        </AppCard>
      ) : null}
    </AppPage>
  );
}

function PreferenceToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { colors } = useAppPreferences();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.toggleRow}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: colors.border,
            backgroundColor: value ? colors.primaryButton : 'transparent',
          },
        ]}
      >
        {value ? (
          <Text style={{ color: colors.primaryButtonText, fontWeight: '800' }}>✓</Text>
        ) : null}
      </View>
      <Text style={{ color: colors.textPrimary, flex: 1 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  toggleRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
