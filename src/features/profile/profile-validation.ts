export const positions = ['goalkeeper', 'defender', 'midfielder', 'forward', 'any'] as const;
export const skillLevels = ['beginner', 'intermediate', 'advanced'] as const;
export const strongFeet = ['left', 'right', 'both'] as const;
export const formats = [5, 7, 8, 11] as const;
export const availabilitySlots = [
  'weekday_morning',
  'weekday_afternoon',
  'weekday_evening',
  'weekend_morning',
  'weekend_afternoon',
  'weekend_evening',
] as const;
/** Weekday availability used by the profile "When you can play" picker. */
export const availabilityDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type Position = (typeof positions)[number];
export type SkillLevel = (typeof skillLevels)[number];
export type StrongFoot = (typeof strongFeet)[number];
export type Format = (typeof formats)[number];
export type AvailabilitySlot = (typeof availabilitySlots)[number];
export type AvailabilityDay = (typeof availabilityDays)[number];
export type AvailabilityValue = AvailabilitySlot | AvailabilityDay;

export function isAvailabilityValue(value: string): value is AvailabilityValue {
  return (
    availabilitySlots.some((item) => item === value) || availabilityDays.some((item) => item === value)
  );
}

export type ProfileInput = {
  displayName: string;
  cityId: string;
  areaId: string;
  preferredPosition: Position | null;
  skillLevel: SkillLevel | null;
  strongFoot: StrongFoot;
  shirtNumber: number;
  preferredFormats: Format[];
  availabilitySlots: AvailabilityValue[];
  maxRadiusKm: number | null;
  language: 'en' | 'el';
};

export type ProfileValidationError =
  'profileValidationName' | 'profileValidationNameEnglish' | 'profileValidationLocation';

export function validateProfileInput(
  input: ProfileInput,
  areaCityById: ReadonlyMap<string, string>,
): ProfileValidationError | null {
  const nameLength = input.displayName.trim().length;
  if (nameLength < 2 || nameLength > 40) return 'profileValidationName';
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(input.displayName.trim())) {
    return 'profileValidationNameEnglish';
  }
  if (!input.cityId || !input.areaId || areaCityById.get(input.areaId) !== input.cityId) {
    return 'profileValidationLocation';
  }
  if (input.preferredFormats.some((format) => !formats.includes(format))) {
    return 'profileValidationLocation';
  }
  if (!strongFeet.includes(input.strongFoot)) return 'profileValidationLocation';
  if (!Number.isInteger(input.shirtNumber) || input.shirtNumber < 1 || input.shirtNumber > 99) {
    return 'profileValidationLocation';
  }
  if (
    input.maxRadiusKm !== null &&
    (!Number.isInteger(input.maxRadiusKm) || input.maxRadiusKm < 1 || input.maxRadiusKm > 200)
  ) {
    return 'profileValidationLocation';
  }
  return null;
}
