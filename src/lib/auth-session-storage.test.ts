import { describe, expect, it, vi } from 'vitest';

import { createMigratingSessionStorage } from './auth-session-storage';

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: vi.fn(async (key: string) => values.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      values.delete(key);
    }),
  };
}

describe('native Supabase session storage', () => {
  it('migrates the previous SecureStore session into persistent AsyncStorage', async () => {
    const primary = storage();
    const legacy = storage({ session: '{"access_token":"saved-session"}' });
    const sessionStorage = createMigratingSessionStorage(primary, legacy);

    await expect(sessionStorage.getItem('session')).resolves.toBe(
      '{"access_token":"saved-session"}',
    );
    expect(primary.values.get('session')).toBe('{"access_token":"saved-session"}');
    expect(legacy.values.has('session')).toBe(false);
  });

  it('restores a saved session when a fresh Supabase client reads storage again', async () => {
    const primary = storage();
    const legacy = storage();
    const firstClientStorage = createMigratingSessionStorage(primary, legacy);
    const session = '{"refresh_token":"persistent-refresh-token"}';

    await firstClientStorage.setItem('session', session);

    const nextClientStorage = createMigratingSessionStorage(primary, legacy);
    await expect(nextClientStorage.getItem('session')).resolves.toBe(session);
    expect(legacy.getItem).not.toHaveBeenCalled();
  });

  it('removes the saved session from both stores on sign-out', async () => {
    const primary = storage({ session: 'current' });
    const legacy = storage({ session: 'old' });
    const sessionStorage = createMigratingSessionStorage(primary, legacy);

    await sessionStorage.removeItem('session');

    expect(primary.values.has('session')).toBe(false);
    expect(legacy.values.has('session')).toBe(false);
  });
});
