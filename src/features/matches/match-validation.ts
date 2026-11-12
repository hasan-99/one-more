export const matchPageSize = 10;

export type OpenPositionCode = 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | 'any';

export type OpenPosition = {
  id: string;
  position: OpenPositionCode;
  xPct?: number;
  yPct?: number;
};

const validPositions = new Set<OpenPositionCode>([
  'goalkeeper',
  'defender',
  'midfielder',
  'forward',
  'any',
]);

export function parseOpenPositions(value: unknown): OpenPosition[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): OpenPosition[] => {
    if (typeof item !== 'object' || item === null) return [];
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      typeof row.position !== 'string' ||
      !validPositions.has(row.position as OpenPositionCode)
    ) {
      return [];
    }
    return [
      {
        id: row.id,
        position: row.position as OpenPositionCode,
        ...(typeof row.x_pct === 'number' ? { xPct: row.x_pct } : {}),
        ...(typeof row.y_pct === 'number' ? { yPct: row.y_pct } : {}),
      },
    ];
  });
}

export function cyprusDateTimeToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const [year, month, day, hour, minute] = [yearText, monthText, dayText, hourText, minuteText].map(
    Number,
  );
  if (hour > 23 || minute > 59) return null;
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(wallClock);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  )
    return null;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Nicosia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  let estimate = wallClock;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(estimate)).map(({ type, value: part }) => [type, part]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    const adjustment = wallClock - represented;
    if (adjustment === 0) break;
    estimate += adjustment;
  }
  const result = new Date(estimate);
  const parts = Object.fromEntries(
    formatter.formatToParts(result).map(({ type, value: part }) => [type, part]),
  );
  if (
    Number(parts.year) !== year ||
    Number(parts.month) !== month ||
    Number(parts.day) !== day ||
    Number(parts.hour) !== hour ||
    Number(parts.minute) !== minute
  )
    return null;
  return result.toISOString();
}

export function defaultPositionForY(yPct: number): OpenPositionCode {
  if (yPct <= 28) return 'forward';
  if (yPct <= 53) return 'midfielder';
  if (yPct <= 78) return 'defender';
  return 'goalkeeper';
}

export function parseOptionalPrice(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(normalized)) return Number.NaN;
  const price = Number(normalized);
  return Number.isFinite(price) && price >= 0 ? price : Number.NaN;
}

function localCyprusMidnight(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const wallClock = Date.UTC(year, month - 1, day);
  const check = new Date(wallClock);
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Nicosia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  let estimate = wallClock;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(estimate)).map(({ type, value }) => [type, value]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const adjustment = wallClock - represented;
    if (adjustment === 0) break;
    estimate += adjustment;
  }
  return new Date(estimate);
}

export function cyprusDateRange(
  from: string,
  through: string,
): { from: string; through: string } | null {
  const start = localCyprusMidnight(from);
  const endInclusive = localCyprusMidnight(through);
  if (!start || !endInclusive || endInclusive < start) return null;
  const nextDay = new Date(`${through}T00:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  const nextDayString = nextDay.toISOString().slice(0, 10);
  const endExclusive = localCyprusMidnight(nextDayString);
  if (!endExclusive) return null;
  return { from: start.toISOString(), through: endExclusive.toISOString() };
}
