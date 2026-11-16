import { describe, expect, it } from 'vitest';

import { createEncryptedSessionStorage } from './encrypted-session-storage';

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: async (k: string) => values.get(k) ?? null,
    setItem: async (k: string, v: string) => void values.set(k, v),
    removeItem: async (k: string) => void values.delete(k),
  };
}
let counter = 1;
const random = (n: number) => Uint8Array.from({ length: n }, () => (counter += 7) % 256);

describe('encrypted session storage', () => {
  it('stores ciphertext, never the token, and reads it back', async () => {
    const base = memory();
    const keys = memory();
    const s = createEncryptedSessionStorage(base, keys, random);
    const session = '{"refresh_token":"secret-refresh-token"}';
    await s.setItem('session', session);
    expect(base.values.get('session')).not.toContain('secret-refresh-token');
    expect(base.values.get('session')?.startsWith('enc1:')).toBe(true);
    expect(keys.values.get('one-more.session-key')).toHaveLength(64);
    await expect(s.getItem('session')).resolves.toBe(session);
  });

  it('uses a fresh nonce for every write', async () => {
    const base = memory();
    const s = createEncryptedSessionStorage(base, memory(), random);
    await s.setItem('a', 'same');
    const first = base.values.get('a');
    await s.setItem('a', 'same');
    expect(base.values.get('a')).not.toBe(first);
  });

  it('upgrades an older plain-text session in place', async () => {
    const base = memory({ session: '{"refresh_token":"old"}' });
    const s = createEncryptedSessionStorage(base, memory(), random);
    await expect(s.getItem('session')).resolves.toBe('{"refresh_token":"old"}');
    expect(base.values.get('session')?.startsWith('enc1:')).toBe(true);
  });

  it('acts signed out when the key is lost or the data is tampered with', async () => {
    const base = memory();
    const keys = memory();
    const s = createEncryptedSessionStorage(base, keys, random);
    await s.setItem('session', 'value');
    keys.values.clear();
    await expect(s.getItem('session')).resolves.toBeNull();

    const keys2 = memory();
    const s2 = createEncryptedSessionStorage(base, keys2, random);
    await s2.setItem('session', 'value');
    const stored = base.values.get('session') as string;
    base.values.set('session', stored.slice(0, -2) + (stored.endsWith('00') ? '11' : '00'));
    await expect(s2.getItem('session')).resolves.toBeNull();
  });

  it('removes the stored session', async () => {
    const base = memory();
    const s = createEncryptedSessionStorage(base, memory(), random);
    await s.setItem('session', 'x');
    await s.removeItem('session');
    await expect(s.getItem('session')).resolves.toBeNull();
  });
});
