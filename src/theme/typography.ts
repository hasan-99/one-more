import type { Locale } from '@/i18n';

/**
 * Font families registered in AppShell. Barlow has no Greek glyphs, so Greek
 * body copy keeps Inter while English follows the Barlow reference design.
 */
export const fontFamilies = {
  display: 'BarlowCondensed_800ExtraBold',
  displayBold: 'BarlowCondensed_700Bold',
  bodyRegular: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemiBold: 'Barlow_600SemiBold',
  greekRegular: 'Inter_400Regular',
  greekSemiBold: 'Inter_600SemiBold',
} as const;

export type BodyWeight = 'regular' | 'medium' | 'semibold';

export function bodyFont(locale: Locale, weight: BodyWeight = 'regular'): string {
  if (locale === 'el') {
    return weight === 'regular' ? fontFamilies.greekRegular : fontFamilies.greekSemiBold;
  }
  if (weight === 'medium') return fontFamilies.bodyMedium;
  if (weight === 'semibold') return fontFamilies.bodySemiBold;
  return fontFamilies.bodyRegular;
}

export function displayFont(locale: Locale): string {
  return locale === 'el' ? fontFamilies.displayBold : fontFamilies.display;
}
