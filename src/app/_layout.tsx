import '../global.css';

import { Stack } from 'expo-router';

import { AuthProvider } from '@/auth/AuthProvider';
import { AppPreferencesProvider } from '@/preferences/AppPreferencesProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppPreferencesProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppPreferencesProvider>
    </AuthProvider>
  );
}
