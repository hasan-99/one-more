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
