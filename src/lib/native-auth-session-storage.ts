import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { SupportedStorage } from '@supabase/supabase-js';

import { createMigratingSessionStorage } from '@/lib/auth-session-storage';

const legacySecureStore: SupportedStorage = {
  async getItem(key) {
    const metadata = await SecureStore.getItemAsync(`${key}.meta`);
    if (!metadata) return null;

    const separator = metadata.lastIndexOf(':');
    const generation = metadata.slice(0, separator);
    const count = Number(metadata.slice(separator + 1));
    if (!generation || !Number.isInteger(count) || count < 1) {
      throw new Error('Stored authentication data has invalid metadata.');
    }

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(`${key}.${generation}.${index}`),
      ),
    );
    if (chunks.some((chunk) => chunk === null)) {
      throw new Error('Stored authentication data is incomplete.');
    }
    return decodeURIComponent(chunks.join(''));
  },
  async setItem() {
    throw new Error('Legacy SecureStore is read-only.');
  },
  async removeItem(key) {
    const metadata = await SecureStore.getItemAsync(`${key}.meta`);
    await SecureStore.deleteItemAsync(`${key}.meta`);
    if (!metadata) return;

    const separator = metadata.lastIndexOf(':');
    const generation = metadata.slice(0, separator);
    const count = Number(metadata.slice(separator + 1));
    if (!generation || !Number.isInteger(count) || count < 1) {
      throw new Error('Stored authentication data has invalid metadata.');
    }
    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.deleteItemAsync(`${key}.${generation}.${index}`),
      ),
    );
  },
};

export const authSessionStorage = createMigratingSessionStorage(
  AsyncStorage,
  legacySecureStore,
);
