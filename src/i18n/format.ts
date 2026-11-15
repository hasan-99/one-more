import type { Locale } from './index';

const localeTag: Record<Locale, string> = { en: 'en-GB', el: 'el-GR' };

export function formatLocalDateTime(value: Date | number | string, locale: Locale) {
  return new Intl.DateTimeFormat(localeTag[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Nicosia',
    hourCycle: 'h23',
  }).format(typeof value === 'string' ? new Date(value) : value);
}

export function formatLocalNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(localeTag[locale]).format(value);
}

/** Weekday, day, month and 24h time in Cyprus time, built from separate formats so no part can come back empty. */
export function matchTicketParts(value: Date | number | string, locale: Locale) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const zone = { timeZone: 'Asia/Nicosia' } as const;
  return {
    weekday: new Intl.DateTimeFormat(localeTag[locale], { weekday: 'short', ...zone }).format(date),
    day: new Intl.DateTimeFormat('en-GB', { day: 'numeric', ...zone }).format(date),
    month: new Intl.DateTimeFormat(localeTag[locale], { month: 'short', ...zone }).format(date),
    time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', ...zone }).format(
      date,
    ),
  };
}

/** Compact kickoff label, e.g. "Sat 14 Nov, 20:00" (Cyprus time). */
export function formatMatchCardTime(value: Date | number | string, locale: Locale) {
  const p = matchTicketParts(value, locale);
  return `${p.weekday} ${p.day} ${p.month}, ${p.time}`;
}
