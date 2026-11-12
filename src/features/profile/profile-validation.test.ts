import { describe, expect, it } from 'vitest';

import { validateProfileInput, type ProfileInput } from './profile-validation';

const areaCityById = new Map([
  ['strovolos-id', 'nicosia-id'],
  ['limassol-area-id', 'limassol-id'],
]);

const validProfile: ProfileInput = {
  displayName: 'Hasan',
  cityId: 'nicosia-id',
  areaId: 'strovolos-id',
  preferredPosition: 'midfielder',
  skillLevel: 'intermediate',
  preferredFormats: [5, 7],
  availabilitySlots: ['weekday_evening'],
  maxRadiusKm: 20,
  language: 'en',
};

describe('validateProfileInput', () => {
  it('accepts a profile with a real matching area and city', () => {
    expect(validateProfileInput(validProfile, areaCityById)).toBeNull();
  });

  it('trims names and enforces the documented length', () => {
    expect(validateProfileInput({ ...validProfile, displayName: ' A ' }, areaCityById)).toBe(
      'profileValidationName',
    );
    expect(
      validateProfileInput({ ...validProfile, displayName: ` ${'A'.repeat(40)} ` }, areaCityById),
    ).toBeNull();
  });

  it('rejects an area from a different city', () => {
    expect(
      validateProfileInput({ ...validProfile, areaId: 'limassol-area-id' }, areaCityById),
    ).toBe('profileValidationLocation');
  });

  it('rejects invalid formats and radius values', () => {
    expect(
      validateProfileInput({ ...validProfile, preferredFormats: [9 as 5] }, areaCityById),
    ).toBe('profileValidationLocation');
    expect(validateProfileInput({ ...validProfile, maxRadiusKm: 0 }, areaCityById)).toBe(
      'profileValidationLocation',
    );
  });
});
