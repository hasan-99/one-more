import type { SupportedStorage } from '@supabase/supabase-js';

type KeyValueStorage = Pick<SupportedStorage, 'getItem' | 'setItem' | 'removeItem'>;

export function createMigratingSessionStorage(
  primary: KeyValueStorage,
  legacy: KeyValueStorage,
): SupportedStorage {
  return {
    async getItem(key) {
      const currentValue = await primary.getItem(key);
      if (currentValue !== null) return currentValue;

      const legacyValue = await legacy.getItem(key);
      if (legacyValue === null) return null;

      await primary.setItem(key, legacyValue);
      await legacy.removeItem(key);
      return legacyValue;
    },
    setItem: (key, value) => primary.setItem(key, value),
    async removeItem(key) {
      await Promise.all([primary.removeItem(key), legacy.removeItem(key)]);
    },
  };
}
