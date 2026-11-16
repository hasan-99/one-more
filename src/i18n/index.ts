import { en } from './en';

export type TranslationKey = keyof typeof en;
export type Locale = 'en' | 'el';
export type Translations = Record<TranslationKey, string>;

// The Greek file is the largest piece of app code. It is loaded only when Greek is needed, so
// English users never download it. Until then `translations.el` safely falls back to English.
// Type check only (no runtime import): Greek must define exactly the same keys as English.
type GreekMatchesEnglish = typeof import('./el').el extends Translations ? true : never;
const greekMatchesEnglish: GreekMatchesEnglish = true;
void greekMatchesEnglish;

export const translations: Record<Locale, Translations> = { en, el: en };

let greekLoaded = false;

/** Makes sure the copy for `locale` is available. Call (and await) before switching to it. */
export async function loadLocale(locale: Locale): Promise<void> {
  if (locale !== 'el' || greekLoaded) return;
  const module = await import('./el');
  translations.el = module.el;
  greekLoaded = true;
}
