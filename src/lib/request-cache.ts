// Small in-memory helpers that stop the app asking the backend for the same thing twice.
//  - Calls that are already in flight share one request (dedupe).
//  - Rarely-changing reference data can also be kept for a short time (ttlMs > 0).
// Failed requests are never cached, and user data must keep ttlMs = 0 so nothing stale is shown.
type Entry<T> = { promise: Promise<T>; expiresAt: number };

const entries = new Map<string, Entry<unknown>>();

export function cachedRequest<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = entries.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.promise;

  // While in flight the entry is valid; once settled it lives for ttlMs (or is dropped when 0).
  const entry: Entry<T> = { promise: undefined as unknown as Promise<T>, expiresAt: Infinity };
  entry.promise = load().then(
    (value) => {
      if (ttlMs > 0) entry.expiresAt = Date.now() + ttlMs;
      else entries.delete(key);
      return value;
    },
    (error: unknown) => {
      entries.delete(key);
      throw error;
    },
  );
  entries.set(key, entry);
  return entry.promise;
}

export function clearRequestCache(prefix = ''): void {
  for (const key of [...entries.keys()]) if (key.startsWith(prefix)) entries.delete(key);
}
