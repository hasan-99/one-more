import '../global.css';

import { Stack } from 'expo-router';
import { AppPreferencesProvider } from '@/preferences/AppPreferencesProvider';

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppPreferencesProvider>
  );
}
