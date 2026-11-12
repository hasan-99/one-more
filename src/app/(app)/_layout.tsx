import { router, Slot, usePathname, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AuthButton, AuthPage } from '@/components/auth/AuthPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function AppLayout() {
  const pathname = usePathname();
  const { session, isLoading, sessionError, refreshSession } = useAuth();
  const { locale, colors } = useAppPreferences();
  const copy = translations[locale];
  const protectedRoute =
    pathname === '/create' ||
    pathname === '/profile' ||
    pathname === '/notifications' ||
    pathname.startsWith('/chat/');
  useEffect(() => {
    if (protectedRoute && !isLoading && !session && !sessionError) {
      router.replace(`/sign-in?returnTo=${encodeURIComponent(pathname)}` as Href);
    }
  }, [isLoading, pathname, protectedRoute, session, sessionError]);
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
  return (
    <AppShell>
      <Slot />
    </AppShell>
  );
}
