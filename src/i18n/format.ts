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

/** Compact kickoff label used on game cards, e.g. "Sat 14 Nov, 20:00" (Cyprus time). */
export function formatMatchCardTime(value: Date | number | string, locale: Locale) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat(localeTag[locale], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Nicosia',
    hourCycle: 'h23',
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('weekday')} ${part('day')} ${part('month')}, ${part('hour')}:${part('minute')}`;
}
