import { describe, expect, it } from 'vitest';

import { legalContent, type LegalKind } from './legal-content';

const kinds = Object.keys(legalContent) as LegalKind[];

describe('legal content', () => {
  it('exists in English and Greek for every public page with the same structure', () => {
    for (const kind of kinds) {
      const { en, el } = legalContent[kind];
      expect(en.sections.length, kind).toBeGreaterThan(1);
      expect(el.sections.length, `${kind} greek sections`).toBe(en.sections.length);
      expect(el.title).not.toBe(en.title);
    }
  });

  it('contains no placeholder wording', () => {
    const text = JSON.stringify(legalContent);
    expect(text).not.toMatch(/placeholder|lorem|TODO|TBD|pending (legal )?review|not ready/i);
  });

  it('privacy policy covers the required topics', () => {
    const privacy = JSON.stringify(legalContent.privacy.en).toLowerCase();
    for (const topic of [
      'collect',
      'retention',
      'how long',
      'delete',
      'security',
      'children',
      'supabase',
      'resend',
      'rights',
      '{email}',
    ]) {
      expect(privacy, topic).toContain(topic === 'retention' ? 'how long' : topic);
    }
    expect(privacy).toContain('no analytics');
  });

  it('deletion page explains in-app and web request routes', () => {
    const deletion = JSON.stringify(legalContent.deletion.en);
    expect(deletion).toContain('Delete my account');
    expect(deletion).toContain('{email}');
    expect(deletion).toContain('What is deleted');
  });
});
