import type { MatchDiscoveryItem } from '@/features/matches/match-service';

export type HomeMatch = MatchDiscoveryItem & { createdAt: string | null };

/** The soonest future game the player organises or has an accepted place in. */
export function pickNextGame(
  matches: readonly HomeMatch[],
  joinedIds: ReadonlySet<string>,
  nowMs: number,
): HomeMatch | null {
  let best: HomeMatch | null = null;
  for (const match of matches) {
    if (!match.isOrganizer && !joinedIds.has(match.id)) continue;
    const starts = Date.parse(match.startsAt);
    if (!Number.isFinite(starts) || starts <= nowMs) continue;
    if (!best || starts < Date.parse(best.startsAt)) best = match;
  }
  return best;
}

export function countdownParts(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const fallbackJourneyMs = 7 * 86_400_000;

/** How far along the road from "game created" to kick-off we are, 0 to 1. */
export function journeyProgress(createdAt: string | null, startsAt: string, nowMs: number): number {
  const end = Date.parse(startsAt);
  if (!Number.isFinite(end)) return 0;
  const created = createdAt ? Date.parse(createdAt) : Number.NaN;
  const start = Number.isFinite(created) && created < end ? created : end - fallbackJourneyMs;
  return Math.min(1, Math.max(0, (nowMs - start) / (end - start)));
}

/** Future games that still have a place, soonest first, without the player's own next game. */
export function openGames(
  matches: readonly HomeMatch[],
  excludeId: string | null,
  limit: number,
  nowMs: number,
): HomeMatch[] {
  return matches
    .filter(
      (match) =>
        match.id !== excludeId && match.freeSpots > 0 && Date.parse(match.startsAt) > nowMs,
    )
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, limit);
}

export type TickerFact =
  | { kind: 'open'; count: number }
  | { kind: 'last'; title: string }
  | { kind: 'unread'; count: number }
  | { kind: 'none' };

/** Short true facts for the rotating line beside the greeting. Never invented. */
export function tickerFacts(open: readonly HomeMatch[], unread: number): TickerFact[] {
  const facts: TickerFact[] = [];
  if (open.length > 0) facts.push({ kind: 'open', count: open.length });
  const last = open.find((match) => match.freeSpots === 1);
  if (last) facts.push({ kind: 'last', title: last.title });
  if (unread > 0) facts.push({ kind: 'unread', count: unread });
  return facts.length > 0 ? facts : [{ kind: 'none' }];
}

export type GreetingKey =
  'homeGreetDefault' | 'homeGreetMorning' | 'homeGreetAfternoon' | 'homeGreetEvening';

/** Greeting for the hour in Cyprus. Before the clock is known, a neutral one. */
export function greetingKey(nowMs: number | null): GreetingKey {
  if (nowMs === null) return 'homeGreetDefault';
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Asia/Nicosia',
    }).format(nowMs),
  );
  if (hour >= 5 && hour < 12) return 'homeGreetMorning';
  if (hour >= 12 && hour < 18) return 'homeGreetAfternoon';
  return 'homeGreetEvening';
}

export function firstName(displayName: unknown): string {
  if (typeof displayName !== 'string') return '';
  return displayName.trim().split(/\s+/)[0] ?? '';
}
