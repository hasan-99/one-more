import { en } from './en';
import { el } from './el';

export type TranslationKey = keyof typeof en;
export type Locale = 'en' | 'el';

export const translations = {
  en,
  el: el satisfies Record<TranslationKey, string>,
} as const;
