import { describe, expect, it } from 'vitest';

import {
  cyprusDateRange,
  cyprusDateTimeToIso,
  defaultPositionForY,
  parseOpenPositions,
  parseOptionalPrice,
} from './match-validation';

describe('match discovery values', () => {
  it('parses valid pitch positions and ignores malformed JSON', () => {
    expect(
      parseOpenPositions([
        { id: 'slot-1', position: 'defender' },
        { id: 'slot-2', position: 'unmapped' },
        null,
        { id: 3, position: 'goalkeeper' },
      ]),
    ).toEqual([{ id: 'slot-1', position: 'defender' }]);
  });

  it('accepts optional Euro prices and rejects malformed values', () => {
    expect(parseOptionalPrice('')).toBeNull();
    expect(parseOptionalPrice('12,50')).toBe(12.5);
    expect(Number.isNaN(parseOptionalPrice('-1'))).toBe(true);
    expect(Number.isNaN(parseOptionalPrice('12.999'))).toBe(true);
  });

  it('converts date boundaries using Cyprus daylight saving time', () => {
    expect(cyprusDateRange('2026-03-29', '2026-03-29')).toEqual({
      from: '2026-03-28T22:00:00.000Z',
      through: '2026-03-29T21:00:00.000Z',
    });
    expect(cyprusDateRange('2026-02-30', '2026-03-01')).toBeNull();
    expect(cyprusDateRange('2026-04-02', '2026-04-01')).toBeNull();
  });

  it('converts Cyprus local match times and rejects the spring DST gap', () => {
    expect(cyprusDateTimeToIso('2026-03-29T04:30')).toBe('2026-03-29T01:30:00.000Z');
    expect(cyprusDateTimeToIso('2026-03-29T03:30')).toBeNull();
    expect(cyprusDateTimeToIso('2026-02-30T19:00')).toBeNull();
  });

  it('maps pitch zones to player positions', () => {
    expect([
      defaultPositionForY(10),
      defaultPositionForY(40),
      defaultPositionForY(70),
      defaultPositionForY(90),
    ]).toEqual(['forward', 'midfielder', 'defender', 'goalkeeper']);
  });

  it('parses persisted pitch coordinates', () => {
    expect(parseOpenPositions([{ id: 'one', position: 'forward', x_pct: 21, y_pct: 18 }])).toEqual([
      { id: 'one', position: 'forward', xPct: 21, yPct: 18 },
    ]);
  });
});
