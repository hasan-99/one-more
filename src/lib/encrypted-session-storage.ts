import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, bytesToUtf8, hexToBytes, utf8ToBytes } from '@noble/ciphers/utils.js';
import type { SupportedStorage } from '@supabase/supabase-js';

type KeyValueStorage = Pick<SupportedStorage, 'getItem' | 'setItem' | 'removeItem'>;

const PREFIX = 'enc1:';
const NONCE_BYTES = 12;
const KEY_BYTES = 32;

// The sign-in session is too big for SecureStore (about 2 KB per value), so it lives in normal
// storage but encrypted with AES-256-GCM. The random key itself is kept in the Keychain/Keystore
// (SecureStore). A stolen backup or file copy of the app storage therefore holds no usable token.
// A value without the prefix is an older plain-text session: it is still read, then re-encrypted.
export function createEncryptedSessionStorage(
  base: KeyValueStorage,
  keyStore: KeyValueStorage,
  randomBytes: (length: number) => Uint8Array,
  keyName = 'one-more.session-key',
): SupportedStorage {
  async function getKey(create: boolean): Promise<Uint8Array | null> {
    const stored = await keyStore.getItem(keyName);
    if (stored && stored.length === KEY_BYTES * 2) return hexToBytes(stored);
    if (!create) return null;
    const key = randomBytes(KEY_BYTES);
    await keyStore.setItem(keyName, bytesToHex(key));
    return key;
  }

  async function encrypt(value: string): Promise<string> {
    const key = await getKey(true);
    if (!key) throw new Error('Could not create the session encryption key.');
    const nonce = randomBytes(NONCE_BYTES);
    const sealed = gcm(key, nonce).encrypt(utf8ToBytes(value));
    return PREFIX + bytesToHex(nonce) + bytesToHex(sealed);
  }

  async function decrypt(stored: string): Promise<string | null> {
    try {
      const key = await getKey(false);
      if (!key) return null;
      const raw = hexToBytes(stored.slice(PREFIX.length));
      const plain = gcm(key, raw.slice(0, NONCE_BYTES)).decrypt(raw.slice(NONCE_BYTES));
      return bytesToUtf8(plain);
    } catch {
      // Wrong key (reinstall, restored backup) or damaged data: behave as signed out.
      return null;
    }
  }

  return {
    async getItem(name) {
      const stored = await base.getItem(name);
      if (stored === null) return null;
      if (stored.startsWith(PREFIX)) return decrypt(stored);
      await base.setItem(name, await encrypt(stored));
      return stored;
    },
    async setItem(name, value) {
      await base.setItem(name, await encrypt(value));
    },
    removeItem: (name) => base.removeItem(name),
  };
}
