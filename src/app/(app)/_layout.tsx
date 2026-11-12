import { router, Slot, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

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

  const profileRequestKey =
    session && protectedRoute ? `${session.user.id}:${pathname}:${retryAttempt}` : null;
  const currentProfileStatus =
    profileRequestKey && profileStatus?.key === profileRequestKey ? profileStatus : null;

  useEffect(() => {
    if (!profileRequestKey || !session) return;
    let active = true;
    void getProfileCompletion(session.user.id)
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

  if (protectedRoute && (isLoading || !session || sessionError)) {
    return (
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
  }
  if (protectedRoute && session && (!currentProfileStatus || currentProfileStatus.error)) {
    return (
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
  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
