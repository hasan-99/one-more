import { describe, expect, it } from 'vitest';

import { translations } from './index';
import { formatLocalDateTime, formatLocalNumber } from './format';

describe('landing translations', () => {
  it('contains the same keys in English and Greek', () => {
    expect(Object.keys(translations.el).sort()).toEqual(Object.keys(translations.en).sort());
  });

  it('labels the match preview as demo content in both locales', () => {
    expect(translations.en.demoLabel).toContain('DEMO');
    expect(translations.el.demoLabel).toContain('ΔΕΙΓΜΑ');
  });

  it('formats local times in Cyprus and numbers with the selected locale', () => {
    expect(formatLocalDateTime('2026-07-01T16:00:00Z', 'en')).toContain('19:00');
    expect(formatLocalDateTime('2026-07-01T16:00:00Z', 'el')).toContain('19:00');
    expect(formatLocalNumber(1234, 'el')).toContain('1');
  });
});
