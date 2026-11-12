import '../global.css';

import { Stack } from 'expo-router';

import { AuthProvider } from '@/auth/AuthProvider';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { ToastViewport } from '@/components/toast/ToastViewport';
import { AppErrorBoundary } from '@/components/layout/AppErrorBoundary';
import { AppPreferencesProvider } from '@/preferences/AppPreferencesProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppPreferencesProvider>
          <AppErrorBoundary>
            <Stack screenOptions={{ headerShown: false }} />
          </AppErrorBoundary>
          <ToastViewport />
        </AppPreferencesProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
