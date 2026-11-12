import { describe, expect, it } from 'vitest';

import { translations } from './index';

describe('landing translations', () => {
  it('contains the same keys in English and Greek', () => {
    expect(Object.keys(translations.el).sort()).toEqual(Object.keys(translations.en).sort());
  });

  it('labels the match preview as demo content in both locales', () => {
    expect(translations.en.demoLabel).toContain('DEMO');
    expect(translations.el.demoLabel).toContain('ΔΕΙΓΜΑ');
  });
});
