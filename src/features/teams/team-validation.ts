export type TeamValidationMessage =
  'teamValidationName' | 'teamValidationCity' | 'teamValidationDescription';

export function validateTeamInput(values: {
  name: string;
  cityId: string;
  description: string;
}): TeamValidationMessage | null {
  const name = values.name.trim();
  const description = values.description.trim();
  if (name.length < 2 || name.length > 80) return 'teamValidationName';
  if (!values.cityId) return 'teamValidationCity';
  if (description.length > 500) return 'teamValidationDescription';
  return null;
}
