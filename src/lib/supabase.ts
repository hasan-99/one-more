import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from '@/lib/database.types';
const chunkLength = 1700;

const secureSessionStorage: SupportedStorage = {
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

  async setItem(key, value) {
    const oldMetadata = await SecureStore.getItemAsync(`${key}.meta`);
    const encoded = encodeURIComponent(value);
    const generation = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    const count = Math.max(1, Math.ceil(encoded.length / chunkLength));

    try {
      await Promise.all(
        Array.from({ length: count }, (_, index) =>
          SecureStore.setItemAsync(
            `${key}.${generation}.${index}`,
            encoded.slice(index * chunkLength, (index + 1) * chunkLength),
          ),
        ),
      );
      await SecureStore.setItemAsync(`${key}.meta`, `${generation}:${count}`);
    } catch (error) {
      await Promise.all(
        Array.from({ length: count }, (_, index) =>
          SecureStore.deleteItemAsync(`${key}.${generation}.${index}`),
        ),
      );
      throw error;
    }

    if (oldMetadata) await removeGeneration(key, oldMetadata);
  },

  async removeItem(key) {
    const metadata = await SecureStore.getItemAsync(`${key}.meta`);
    await SecureStore.deleteItemAsync(`${key}.meta`);
    if (metadata) await removeGeneration(key, metadata);
  },
};

async function removeGeneration(key: string, metadata: string) {
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
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey);

export const supabase: SupabaseClient<Database> | null =
  isSupabaseConfigured && supabaseUrl && publishableKey
    ? createClient<Database>(supabaseUrl, publishableKey, {
        auth: {
          ...(Platform.OS === 'web' ? {} : { storage: secureSessionStorage }),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === 'web',
        },
      })
    : null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
}
