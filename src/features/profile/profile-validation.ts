export const positions = ['goalkeeper', 'defender', 'midfielder', 'forward', 'any'] as const;
export const skillLevels = ['beginner', 'intermediate', 'advanced'] as const;
export const formats = [5, 7, 8, 11] as const;
export const availabilitySlots = [
  'weekday_morning',
  'weekday_afternoon',
  'weekday_evening',
  'weekend_morning',
  'weekend_afternoon',
  'weekend_evening',
] as const;

export type Position = (typeof positions)[number];
export type SkillLevel = (typeof skillLevels)[number];
export type Format = (typeof formats)[number];
export type AvailabilitySlot = (typeof availabilitySlots)[number];

export type ProfileInput = {
  displayName: string;
  cityId: string;
  areaId: string;
  preferredPosition: Position | null;
  skillLevel: SkillLevel | null;
  preferredFormats: Format[];
  availabilitySlots: AvailabilitySlot[];
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
  if (
    input.maxRadiusKm !== null &&
    (!Number.isInteger(input.maxRadiusKm) || input.maxRadiusKm < 1 || input.maxRadiusKm > 200)
  ) {
    return 'profileValidationLocation';
  }
  return null;
}
