import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cachedRequest, clearRequestCache } from './request-cache';

describe('cachedRequest', () => {
  beforeEach(() => clearRequestCache());

  it('shares one in-flight request between simultaneous callers', async () => {
    const load = vi.fn(async () => 'rows');
    const [a, b] = await Promise.all([cachedRequest('k', 0, load), cachedRequest('k', 0, load)]);
    expect([a, b]).toEqual(['rows', 'rows']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('asks again after a request with no ttl has finished', async () => {
    const load = vi.fn(async () => 'rows');
    await cachedRequest('k', 0, load);
    await cachedRequest('k', 0, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('keeps reference data for the ttl, then refreshes it', async () => {
    vi.useFakeTimers();
    const load = vi.fn(async () => 'cities');
    await cachedRequest('ref', 1000, load);
    await cachedRequest('ref', 1000, load);
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1500);
    await cachedRequest('ref', 1000, load);
    expect(load).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('never caches a failure', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('ok');
    await expect(cachedRequest('k', 1000, load)).rejects.toThrow('down');
    await expect(cachedRequest('k', 1000, load)).resolves.toBe('ok');
  });
});
