import type { ChallengeWindowValue } from './challenge-service';

export type ChallengeWindowForm = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export function cyprusLocalTimeToUtc(date: string, time: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match || !clock) return null;
  const [, yearText, monthText, dayText] = match;
  const [, hourText, minuteText] = clock;
  const values = [yearText, monthText, dayText, hourText, minuteText].map(Number);
  const [year, month, day, hour, minute] = values;
  const nominal = Date.UTC(year, month - 1, day, hour, minute);
  const roundTrip = new Date(nominal);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  )
    return null;

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
  let candidate = nominal;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(candidate).map((part) => [part.type, part.value]),
    );
    const wallTimeAtCandidate = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const difference = nominal - wallTimeAtCandidate;
    if (difference === 0) return new Date(candidate).toISOString();
    candidate += difference;
  }
  return null;
}

export function toChallengeWindows(forms: ChallengeWindowForm[]): ChallengeWindowValue[] | null {
  if (forms.length < 1 || forms.length > 5) return null;
  const windows: ChallengeWindowValue[] = [];
  for (const form of forms) {
    const start = cyprusLocalTimeToUtc(form.startDate, form.startTime);
    const end = cyprusLocalTimeToUtc(form.endDate, form.endTime);
    if (
      !start ||
      !end ||
      Date.parse(end) - Date.parse(start) < 90 * 60_000 ||
      Date.parse(start) <= Date.now()
    )
      return null;
    windows.push({ startsAt: start, endsAt: end });
  }
  return windows;
}
