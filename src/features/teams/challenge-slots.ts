/** Helpers for the challenge flow: days to pick from and time slots in Cyprus time. */
import type { ChallengeWindowForm } from './challenge-validation';

export type ChallengeSlot = { dayOffset: number; from: number; to: number };

export const slotEarliest = 8;
export const slotLatest = 23.5;
export const slotMinimumHours = 1.5;

/** Today's calendar date in Cyprus as year, month, day. Built from one format so no part is empty. */
export function cyprusToday(now = new Date()) {
  const text = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Nicosia',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);
  const [day, month, year] = text.split('/').map(Number);
  return { year, month, day };
}

/** The date `offset` days after today in Cyprus, as YYYY-MM-DD. */
export function cyprusDateAfter(offset: number, now = new Date()) {
  const { year, month, day } = cyprusToday(now);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function slotClock(hours: number) {
  const whole = Math.floor(hours);
  return `${String(whole).padStart(2, '0')}:${hours - whole >= 0.5 ? '30' : '00'}`;
}

/** Moves one end of a slot by half an hour, keeping it inside the day and at least 90 minutes long. */
export function nudgeSlot(slot: ChallengeSlot, end: 'from' | 'to', delta: number): ChallengeSlot {
  if (end === 'from') {
    const from = Math.min(slotLatest - slotMinimumHours, Math.max(slotEarliest, slot.from + delta));
    return { ...slot, from, to: Math.max(slot.to, from + slotMinimumHours) };
  }
  return {
    ...slot,
    to: Math.min(slotLatest, Math.max(slot.from + slotMinimumHours, slot.to + delta)),
  };
}

export function slotToForm(slot: ChallengeSlot, now = new Date()): ChallengeWindowForm {
  const date = cyprusDateAfter(slot.dayOffset, now);
  return {
    startDate: date,
    startTime: slotClock(slot.from),
    endDate: date,
    endTime: slotClock(slot.to),
  };
}

export function sameSlot(a: ChallengeSlot, b: ChallengeSlot) {
  return a.dayOffset === b.dayOffset && a.from === b.from && a.to === b.to;
}
