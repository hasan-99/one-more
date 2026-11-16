import { describe, expect, it, vi } from 'vitest';

import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  it('passes the result through when the promise settles in time', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000)).resolves.toBe('ok');
  });

  it('rejects when the promise never settles', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<string>(() => undefined), 1000);
    const assertion = expect(pending).rejects.toThrow('timeout');
    vi.advanceTimersByTime(1001);
    await assertion;
    vi.useRealTimers();
  });
});
