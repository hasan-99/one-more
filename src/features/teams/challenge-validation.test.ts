import { describe, expect, it } from 'vitest';

import { toChallengeWindows } from './challenge-validation';

describe('toChallengeWindows', () => {
  it('converts Cyprus local time to UTC across winter and summer offsets', () => {
    const winter = toChallengeWindows([
      { startDate: '2030-01-15', startTime: '19:00', endDate: '2030-01-15', endTime: '21:00' },
    ]);
    const summer = toChallengeWindows([
      { startDate: '2030-07-15', startTime: '19:00', endDate: '2030-07-15', endTime: '21:00' },
    ]);
    expect(winter?.[0]?.startsAt).toBe('2030-01-15T17:00:00.000Z');
    expect(summer?.[0]?.startsAt).toBe('2030-07-15T16:00:00.000Z');
  });

  it('requires 1 to 5 future windows that can contain a full match', () => {
    expect(toChallengeWindows([])).toBeNull();
    expect(
      toChallengeWindows([
        { startDate: '2030-07-15', startTime: '19:00', endDate: '2030-07-15', endTime: '20:00' },
      ]),
    ).toBeNull();
  });

  it('rejects nonexistent Cyprus wall times during the spring clock change', () => {
    expect(
      toChallengeWindows([
        { startDate: '2026-03-29', startTime: '03:30', endDate: '2026-03-29', endTime: '05:30' },
      ]),
    ).toBeNull();
  });
});
