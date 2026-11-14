import { router, Slot, usePathname, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AuthButton, AuthPage } from '@/components/auth/AuthPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { getProfileCompletion } from '@/features/profile/profile-service';

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
  const protectedRoute =
    pathname === '/create' ||
    pathname === '/profile' ||
    pathname === '/settings' ||
    pathname === '/notifications' ||
    pathname.startsWith('/chat/') ||
    pathname.startsWith('/teams/') ||
    pathname.startsWith('/challenges/') ||
    pathname === '/onboarding';

  // One completion check per user (and again after leaving onboarding), not one per
  // protected route: re-checking on every tap showed a loading gate each time.
  const profileRequestKey =
    session && protectedRoute
      ? `${session.user.id}:${pathname === '/onboarding' ? 'onboarding' : 'app'}:${retryAttempt}`
      : null;
  const currentProfileStatus =
    profileRequestKey && profileStatus?.key === profileRequestKey ? profileStatus : null;

  useEffect(() => {
    if (!profileRequestKey || !session) return;
    let active = true;
    void withTimeout(getProfileCompletion(session.user.id), profileCheckTimeoutMs)
      .then((complete) => {
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
  } else if (protectedRoute && session && (!currentProfileStatus || currentProfileStatus.error)) {
    gate = (
      <AuthPage
        title={currentProfileStatus?.error ? copy.profileLoadError : copy.profileLoading}
        description={copy.profileOnboardingDescription}
      >
        {currentProfileStatus?.error ? (
          <AuthButton label={copy.profileRetry} onPress={retryProfile} />
        ) : (
          <View accessibilityRole="progressbar" accessibilityLabel={copy.profileLoading} />
        )}
      </AuthPage>
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

/** Rejects if the promise has not settled in time, so a stalled request shows a retry. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none' },
});
