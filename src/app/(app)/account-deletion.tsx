import { clearLocalUserData } from '@/features/auth/auth-service';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AuthFeedback } from '@/components/auth/AuthPage';
import { AppCard, AppPage } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import {
  cancelAccountDeletionRequest,
  deleteMyAccount,
  getAccountDeletionRequest,
  type AccountDeletionRequestRow,
} from '@/features/profile/profile-service';
import { getSupabaseClient } from '@/lib/supabase';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function AccountDeletionScreen() {
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const { user } = useAuth();
  const { showToast } = useToast();
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<AccountDeletionRequestRow | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getAccountDeletionRequest(user.id)
      .then((request) => {
        if (active) setPending(request);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  const confirmDeletion = async () => {
    if (!user || !understood) return;
    setBusy(true);
    try {
      await deleteMyAccount();
      // The account no longer exists. Leave the private area first, so ending the session cannot
      // send the player to the sign-in page, then end the local session and forget cached data.
      showToast(copy.settingsDeletionRequestSuccess, 'success');
      router.replace('/');
      await getSupabaseClient()
        .auth.signOut({ scope: 'local' })
        .catch(() => undefined);
      await clearLocalUserData();
    } catch {
      showToast(copy.settingsDeletionRequestError, 'error');
      setBusy(false);
    }
  };

  const cancelRequest = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const cancelled = await cancelAccountDeletionRequest(pending.id);
      if (!cancelled) throw new Error('deletion_request_not_cancellable');
      setPending(null);
      showToast(copy.settingsDeletionCancelSuccess, 'success');
    } catch {
      showToast(copy.settingsDeletionCancelError, 'error');
    } finally {
      setBusy(false);
    }
  };

  const sections: { title: string; lines: string[] }[] = [
    {
      title: copy.deleteAcctWhatTitle,
      lines: [
        copy.deleteAcctWhat1,
        copy.deleteAcctWhat2,
        copy.deleteAcctWhat3,
        copy.deleteAcctWhat4,
        copy.deleteAcctWhat5,
      ],
    },
    {
      title: copy.deleteAcctTeamsTitle,
      lines: [copy.deleteAcctTeams1, copy.deleteAcctTeams2, copy.deleteAcctTeams3],
    },
    {
      title: copy.deleteAcctAfterTitle,
      lines: [copy.deleteAcctAfter1, copy.deleteAcctAfter2, copy.deleteAcctAfter3],
    },
  ];

  return (
    <AppPage
      title={copy.deleteAcctTitle}
      description={copy.deleteAcctIntro}
      backHref={'/profile' as Href}
    >
      {sections.map((section) => (
        <AppCard key={section.title}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors.textPrimary }]}
          >
            {section.title}
          </Text>
          {section.lines.map((line) => (
            <View key={line} style={styles.bulletRow}>
              <Text style={{ color: colors.accentText }}>•</Text>
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{line}</Text>
            </View>
          ))}
        </AppCard>
      ))}
      <AppCard>
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors.textPrimary }]}
        >
          {copy.deleteAcctPolicyTitle}
        </Text>
        <Text style={{ color: colors.textSecondary }}>{copy.deleteAcctPolicyBody}</Text>
        <View style={styles.linkRow}>
          <Pressable accessibilityRole="link" onPress={() => router.push('/privacy' as Href)}>
            <Text style={[styles.link, { color: colors.accentText }]}>{copy.legalPrivacyLink}</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.push('/support' as Href)}>
            <Text style={[styles.link, { color: colors.accentText }]}>{copy.legalSupportLink}</Text>
          </Pressable>
        </View>
      </AppCard>
      <AppCard>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: colors.errorText }]}>
          {copy.deleteAcctConfirmTitle}
        </Text>
        <AuthFeedback>{copy.settingsDeletionConfirm}</AuthFeedback>
        {pending ? (
          <>
            <Text style={{ color: colors.textPrimary }}>{copy.settingsDeletionRequested}</Text>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void cancelRequest()}
              style={[styles.outlineButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
                {busy ? copy.profileSaving : copy.settingsDeletionCancel}
              </Text>
            </Pressable>
          </>
        ) : null}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: understood }}
          accessibilityLabel={copy.deleteAcctUnderstand}
          onPress={() => setUnderstood(!understood)}
          style={styles.checkRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: colors.errorText,
                backgroundColor: understood ? colors.errorText : 'transparent',
              },
            ]}
          >
            {understood ? (
              <Text style={{ color: colors.background, fontWeight: '800' }}>✓</Text>
            ) : null}
          </View>
          <Text style={{ color: colors.textPrimary, flex: 1 }}>{copy.deleteAcctUnderstand}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !understood || busy }}
          disabled={!understood || busy}
          onPress={() => void confirmDeletion()}
          style={[
            styles.dangerButton,
            { backgroundColor: colors.errorText },
            (!understood || busy) && { opacity: 0.4 },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {busy ? copy.profileSaving : copy.deleteAcctConfirmButton}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.back()}
          style={[styles.outlineButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.buttonText, { color: colors.textPrimary }]}>
            {copy.commonCancel}
          </Text>
        </Pressable>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletText: { flex: 1, lineHeight: 21 },
  linkRow: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  link: { fontWeight: '700', minHeight: 44, textAlignVertical: 'center', paddingVertical: 10 },
  checkRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  outlineButton: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
