import { describe, expect, it } from 'vitest';

import {
  countdownParts,
  firstName,
  greetingKey,
  openGames,
  pickNextGame,
  pitchPositions,
  projectOnPitch,
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

  it('stands the whole squad on the pitch, half on each side', () => {
    for (const capacity of [10, 14, 16, 22]) {
      const spots = pitchPositions(capacity);
      expect(spots).toHaveLength(capacity);
      expect(spots.filter((spot) => spot.team === 'home')).toHaveLength(capacity / 2);
      expect(spots.every((spot) => Math.abs(spot.x) <= 0.4 && spot.t > 0 && spot.t < 1)).toBe(true);
      expect(spots.filter((spot) => spot.team === 'home').every((spot) => spot.t < 0.5)).toBe(true);
      expect(spots.filter((spot) => spot.team === 'away').every((spot) => spot.t > 0.5)).toBe(true);
      // No two players share a position.
      expect(new Set(spots.map((spot) => `${spot.x.toFixed(3)}:${spot.t.toFixed(3)}`)).size).toBe(
        capacity,
      );
    }
    expect(pitchPositions(15)).toHaveLength(15);
    expect(pitchPositions(40)).toHaveLength(22);
    expect(pitchPositions(0)).toEqual([]);
  });

  it('projects pitch points with perspective: further is higher and smaller', () => {
    const near = projectOnPitch(0.3, 0.1, 300);
    const far = projectOnPitch(0.3, 0.9, 300);
    expect(projectOnPitch(0, 0, 300)).toEqual({ left: 150, bottom: 0, scale: 1 });
    expect(far.bottom).toBeGreaterThan(near.bottom);
    expect(far.scale).toBeLessThan(near.scale);
    expect(far.left - 150).toBeLessThan(near.left - 150);
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
