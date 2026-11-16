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

export type PitchPosition = { x: number; t: number; team: 'home' | 'away' };

const rowWidths: Record<number, [number, number]> = {
  2: [0.26, 0.13],
  3: [0.34, 0.24],
  4: [0.38, 0.3],
};

/** One team's shape: a keeper, then rows of up to four. x is -0.5..0.5 across, t is 0..0.5 up the pitch. */
function teamShape(players: number): { x: number; t: number }[] {
  if (players <= 0) return [];
  const shape = [{ x: 0, t: 0.06 }];
  const outfield = players - 1;
  if (outfield === 0) return shape;
  const rows = Math.ceil(outfield / 4);
  for (let row = 0; row < rows; row += 1) {
    const inRow = Math.floor(outfield / rows) + (row < outfield % rows ? 1 : 0);
    const t = rows === 1 ? 0.26 : 0.16 + (0.18 * row) / (rows - 1);
    const width = inRow === 1 ? 0 : (rowWidths[inRow] ?? rowWidths[4])[row % 2];
    for (let index = 0; index < inRow; index += 1) {
      shape.push({ x: inRow === 1 ? 0 : -width + (2 * width * index) / (inRow - 1), t });
    }
  }
  return shape;
}

export const maxPitchPlayers = 22;

/**
 * Where to stand `capacity` players on the pitch, alternating home and away so both halves fill up
 * together. These show how full the squad is; they are not the players' real positions.
 */
export function pitchPositions(capacity: number): PitchPosition[] {
  const total = Math.min(maxPitchPlayers, Math.max(0, Math.floor(capacity)));
  const home = teamShape(Math.ceil(total / 2));
  const away = teamShape(Math.floor(total / 2));
  const out: PitchPosition[] = [];
  for (let index = 0; index < home.length; index += 1) {
    out.push({ ...home[index], team: 'home' });
    if (index < away.length) {
      out.push({ x: -away[index].x, t: 1 - away[index].t, team: 'away' });
    }
  }
  return out;
}

// The pitch is one flat rectangle tilted back; markers are placed with the same perspective maths.
export const pitchPlane = { length: 380, tiltDeg: 50, distance: 900 } as const;

/** Screen position of a point on the tilted pitch: px from the left and from the bottom edge. */
export function projectOnPitch(x: number, t: number, width: number) {
  const along = t * pitchPlane.length;
  const tilt = (pitchPlane.tiltDeg * Math.PI) / 180;
  const scale = pitchPlane.distance / (pitchPlane.distance + along * Math.sin(tilt));
  return { left: width / 2 + x * width * scale, bottom: along * Math.cos(tilt) * scale, scale };
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
