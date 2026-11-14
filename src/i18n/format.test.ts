import { describe, expect, it } from 'vitest';

import { formatMatchCardTime } from './format';

describe('formatMatchCardTime', () => {
  it('formats kickoff in Cyprus time like the game card reference', () => {
    expect(formatMatchCardTime('2026-11-14T18:00:00Z', 'en')).toBe('Sat 14 Nov, 20:00');
  });

  it('uses Greek day and month names', () => {
    expect(formatMatchCardTime('2026-11-14T18:00:00Z', 'el')).toBe('Σάβ 14 Νοε, 20:00');
  });
});
