import { describe, expect, it } from 'vitest';

import {
  countdownParts,
  firstName,
  greetingKey,
  journeyProgress,
  openGames,
  pickNextGame,
  tickerFacts,
  type HomeMatch,
} from './home-logic';

const now = Date.parse('2026-11-16T10:00:00Z');
function match(patch: Partial<HomeMatch>): HomeMatch {
  return {
    id: 'm1',
    title: 'Game',
    sideSize: 5,
    cityId: 'c',
    cityNameEn: 'Nicosia',
    cityNameEl: 'Λευκωσία',
    areaId: 'a',
    areaNameEn: 'Strovolos',
    areaNameEl: 'Στρόβολος',
    venueName: 'Novo',
    venueAddress: 'Street',
    startsAt: '2026-11-18T20:00:00Z',
    durationMinutes: 60,
    skillLevel: null,
    priceEur: 5,
    capacity: 10,
    activePlayers: 4,
    freeSpots: 6,
    openPositions: [],
    notes: null,
    bookingStatus: 'confirmed',
    isOrganizer: false,
    createdAt: '2026-11-14T20:00:00Z',
    ...patch,
  };
}

describe('home logic', () => {
  it('picks the soonest future game the player organises or joined', () => {
    const games = [
      match({ id: 'other' }),
      match({ id: 'late', isOrganizer: true, startsAt: '2026-11-20T20:00:00Z' }),
      match({ id: 'soon', startsAt: '2026-11-17T20:00:00Z' }),
      match({ id: 'past', isOrganizer: true, startsAt: '2026-11-15T20:00:00Z' }),
    ];
    expect(pickNextGame(games, new Set(['soon']), now)?.id).toBe('soon');
    expect(pickNextGame(games, new Set(), now)?.id).toBe('late');
    expect(pickNextGame([match({ id: 'other' })], new Set(), now)).toBeNull();
  });

  it('splits the time left and never goes negative', () => {
    expect(countdownParts(((2 * 24 + 7) * 3600 + 26 * 60 + 41) * 1000)).toEqual({
      days: 2,
      hours: 7,
      minutes: 26,
      seconds: 41,
    });
    expect(countdownParts(-5000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it('measures the road from creation to kick-off', () => {
    expect(journeyProgress('2026-11-14T10:00:00Z', '2026-11-18T10:00:00Z', now)).toBe(0.5);
    expect(journeyProgress(null, '2026-11-18T10:00:00Z', now)).toBeCloseTo(5 / 7, 5);
    expect(journeyProgress('2026-11-14T10:00:00Z', '2026-11-15T10:00:00Z', now)).toBe(1);
    expect(journeyProgress('bad', 'bad', now)).toBe(0);
  });

  it('lists open future games without the next game', () => {
    const games = [
      match({ id: 'b', startsAt: '2026-11-19T20:00:00Z' }),
      match({ id: 'a', startsAt: '2026-11-17T20:00:00Z' }),
      match({ id: 'full', freeSpots: 0 }),
      match({ id: 'mine' }),
      match({ id: 'past', startsAt: '2026-11-15T20:00:00Z' }),
    ];
    expect(openGames(games, 'mine', 5, now).map((game) => game.id)).toEqual(['a', 'b']);
    expect(openGames(games, null, 1, now)).toHaveLength(1);
  });

  it('builds ticker facts only from real data', () => {
    expect(tickerFacts([], 0)).toEqual([{ kind: 'none' }]);
    expect(tickerFacts([match({}), match({ title: 'Sevens', freeSpots: 1 })], 3)).toEqual([
      { kind: 'open', count: 2 },
      { kind: 'last', title: 'Sevens' },
      { kind: 'unread', count: 3 },
    ]);
  });

  it('greets by the hour in Cyprus and reads the first name', () => {
    expect(greetingKey(null)).toBe('homeGreetDefault');
    expect(greetingKey(Date.parse('2026-11-16T06:00:00Z'))).toBe('homeGreetMorning');
    expect(greetingKey(Date.parse('2026-11-16T12:00:00Z'))).toBe('homeGreetAfternoon');
    expect(greetingKey(Date.parse('2026-11-16T19:00:00Z'))).toBe('homeGreetEvening');
    expect(firstName('  Hasan Jahouse ')).toBe('Hasan');
    expect(firstName(undefined)).toBe('');
  });
});
