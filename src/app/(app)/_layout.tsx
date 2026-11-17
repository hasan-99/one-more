import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Slot, usePathname, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { WaitScreen } from '@/components/loading/WaitScreen';
import { AppShell } from '@/components/layout/AppShell';
import { AuthButton, AuthPage } from '@/components/auth/AuthPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { getProfileCompletion } from '@/features/profile/profile-service';
import { withTimeout } from '@/lib/with-timeout';

export default function AppLayout() {
  const pathname = usePathname();
  const { session, isLoading, sessionError, refreshSession } = useAuth();
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [profileStatus, setProfileStatus] = useState<{
    key: string;
    complete: boolean | null;
    error: boolean;
  } | null>(null);
  // A user who already finished their profile on this device does not wait for the server check on
  // every launch: the last known answer is used right away and re-verified in the background.
  const [knownComplete, setKnownComplete] = useState<{ userId: string; complete: boolean } | null>(
    null,
  );
  const userId = session?.user.id ?? null;
  const protectedRoute =
    pathname === '/home' ||
    pathname === '/create' ||
    pathname === '/profile' ||
    pathname === '/settings' ||
    pathname === '/account-deletion' ||
    pathname === '/notifications' ||
    pathname.startsWith('/chat/') ||
    pathname.startsWith('/teams/') ||
    pathname.startsWith('/challenges/') ||
    pathname === '/onboarding' ||
    pathname === '/profile-edit';

  // One completion check per user (and again after leaving onboarding), not one per
  // protected route: re-checking on every tap showed a loading gate each time.
  const profileRequestKey =
    session && protectedRoute
      ? `${session.user.id}:${pathname === '/onboarding' ? 'onboarding' : 'app'}:${retryAttempt}`
      : null;
  const currentProfileStatus =
    profileRequestKey && profileStatus?.key === profileRequestKey ? profileStatus : null;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void AsyncStorage.getItem(completeKey(userId))
      .then((value) => {
        if (active && value === '1') setKnownComplete({ userId, complete: true });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!profileRequestKey || !session) return;
    let active = true;
    void withTimeout(getProfileCompletion(session.user.id), profileCheckTimeoutMs)
      .then((complete) => {
        void (
          complete
            ? AsyncStorage.setItem(completeKey(session.user.id), '1')
            : AsyncStorage.removeItem(completeKey(session.user.id))
        ).catch(() => undefined);
        if (active) setProfileStatus({ key: profileRequestKey, complete, error: false });
      })
      .catch(() => {
        if (active) setProfileStatus({ key: profileRequestKey, complete: null, error: true });
      });
    return () => {
      active = false;
    };
  }, [profileRequestKey, session]);

  useEffect(() => {
    if (protectedRoute && !isLoading && !session && !sessionError) {
      router.replace(`/sign-in?returnTo=${encodeURIComponent(pathname)}` as Href);
    }
  }, [isLoading, pathname, protectedRoute, session, sessionError]);
  useEffect(() => {
    if (!protectedRoute || !session || !currentProfileStatus || currentProfileStatus.error) return;
    if (!currentProfileStatus.complete && pathname !== '/onboarding') {
      router.replace('/onboarding' as Href);
    } else if (currentProfileStatus.complete && pathname === '/onboarding') {
      router.replace('/profile' as Href);
    }
  }, [currentProfileStatus, pathname, protectedRoute, session]);

  const retryProfile = () => {
    if (!session) return;
    setRetryAttempt((attempt) => attempt + 1);
  };

  // Keep <Slot /> mounted while a gate is shown: unmounting it mid-navigation
  // makes Expo Router drop the pending route, so taps on protected tabs did nothing.
  let gate: ReactNode = null;
  if (protectedRoute && (isLoading || !session || sessionError)) {
    gate = (
      <AuthPage
        title={
          sessionError
            ? copy.authSessionError
            : isLoading
              ? copy.authSessionLoading
              : copy.authProtectedTitle
        }
        description={copy.authProtectedDescription}
      >
        {sessionError ? (
          <>
            <Text accessibilityRole="alert" style={{ color: colors.errorText }}>
              {copy.authSessionError}
            </Text>
            <AuthButton label={copy.authRetry} onPress={() => void refreshSession()} />
          </>
        ) : (
          <View accessibilityRole="progressbar" accessibilityLabel={copy.authSessionLoading} />
        )}
      </AuthPage>
    );
  } else if (
    protectedRoute &&
    session &&
    (!currentProfileStatus || currentProfileStatus.error) &&
    !(knownComplete?.userId === userId && knownComplete.complete)
  ) {
    gate = currentProfileStatus?.error ? (
      <AuthPage title={copy.profileLoadError} description={copy.profileOnboardingDescription}>
        <AuthButton label={copy.profileRetry} onPress={retryProfile} />
      </AuthPage>
    ) : (
      // Waiting for the server: nothing for a moment, then the bouncing football.
      <WaitScreen label={copy.profileLoading} subtitle={copy.loaderSub} />
    );
  }
  // The gate renders inside the shell so the navigation bar stays usable while
  // the session or profile is checked.
  return (
    <AppShell>
      {gate ? <View style={styles.fill}>{gate}</View> : null}
      <View style={gate ? styles.hidden : styles.fill}>
        <Slot />
      </View>
    </AppShell>
  );
}

const profileCheckTimeoutMs = 12_000;

function completeKey(userId: string) {
  return `one-more.profile-complete.${userId}`;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none' },
});
