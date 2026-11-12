export type SignupValidationError = 'email' | 'password' | 'passwordMismatch' | 'terms';

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function validateSignup(
  email: string,
  password: string,
  passwordConfirmation: string,
  termsAccepted: boolean,
): SignupValidationError | null {
  if (!validateEmail(email)) return 'email';
  if (!validatePassword(password)) return 'password';
  if (password !== passwordConfirmation) return 'passwordMismatch';
  if (!termsAccepted) return 'terms';
  return null;
}

export function safeReturnTo(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return '/home';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/home';
  return value;
}
