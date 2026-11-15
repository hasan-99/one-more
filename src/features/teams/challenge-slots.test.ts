import { describe, expect, it } from 'vitest';

import { cyprusDateAfter, nudgeSlot, slotClock, slotToForm } from './challenge-slots';

describe('challenge slots', () => {
  it('formats half hours', () => {
    expect(slotClock(19)).toBe('19:00');
    expect(slotClock(20.5)).toBe('20:30');
  });

  it('keeps a slot at least 90 minutes long and inside the day', () => {
    const slot = { dayOffset: 1, from: 19, to: 20.5 };
    expect(nudgeSlot(slot, 'to', -0.5).to).toBe(20.5);
    expect(nudgeSlot(slot, 'from', 0.5)).toMatchObject({ from: 19.5, to: 21 });
    expect(nudgeSlot({ dayOffset: 1, from: 8, to: 12 }, 'from', -0.5).from).toBe(8);
    expect(nudgeSlot({ dayOffset: 1, from: 20, to: 23.5 }, 'to', 0.5).to).toBe(23.5);
  });

  it('uses the Cyprus date, which can be ahead of UTC', () => {
    const lateUtc = new Date('2030-06-10T22:30:00Z'); // 01:30 on the 11th in Cyprus
    expect(cyprusDateAfter(0, lateUtc)).toBe('2030-06-11');
    expect(cyprusDateAfter(1, lateUtc)).toBe('2030-06-12');
    expect(slotToForm({ dayOffset: 2, from: 19, to: 22 }, lateUtc)).toEqual({
      startDate: '2030-06-13',
      startTime: '19:00',
      endDate: '2030-06-13',
      endTime: '22:00',
    });
  });
});
