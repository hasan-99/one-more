import '../global.css';

import { Stack } from 'expo-router';

import { AuthProvider } from '@/auth/AuthProvider';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { ToastViewport } from '@/components/toast/ToastViewport';
import { AppPreferencesProvider } from '@/preferences/AppPreferencesProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppPreferencesProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <ToastViewport />
        </AppPreferencesProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
