import { describe, expect, it } from 'vitest';

import { validateTeamInput } from './team-validation';

describe('validateTeamInput', () => {
  it('requires a trimmed team name of 2 to 80 characters', () => {
    expect(validateTeamInput({ name: ' A ', cityId: 'city-1', description: '' })).toBe(
      'teamValidationName',
    );
    expect(validateTeamInput({ name: 'A'.repeat(81), cityId: 'city-1', description: '' })).toBe(
      'teamValidationName',
    );
  });

  it('requires a city and limits the optional description', () => {
    expect(validateTeamInput({ name: 'Rovers', cityId: '', description: '' })).toBe(
      'teamValidationCity',
    );
    expect(
      validateTeamInput({ name: 'Rovers', cityId: 'city-1', description: 'x'.repeat(501) }),
    ).toBe('teamValidationDescription');
  });

  it('accepts valid team details', () => {
    expect(
      validateTeamInput({
        name: '  Nicosia Rovers ',
        cityId: 'city-1',
        description: ' Local squad ',
      }),
    ).toBeNull();
  });
});
