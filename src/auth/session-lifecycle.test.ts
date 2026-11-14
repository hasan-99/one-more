import { describe, expect, it, vi } from 'vitest';

import { updateAuthRefreshForAppState } from './session-lifecycle';

describe('updateAuthRefreshForAppState', () => {
  it('starts token refresh when the app returns to the foreground', () => {
    const auth = { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() };

    updateAuthRefreshForAppState(auth, 'active');

    expect(auth.startAutoRefresh).toHaveBeenCalledOnce();
    expect(auth.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it('stops token refresh while the app is in the background', () => {
    const auth = { startAutoRefresh: vi.fn(), stopAutoRefresh: vi.fn() };

    updateAuthRefreshForAppState(auth, 'background');

    expect(auth.stopAutoRefresh).toHaveBeenCalledOnce();
    expect(auth.startAutoRefresh).not.toHaveBeenCalled();
  });
});
