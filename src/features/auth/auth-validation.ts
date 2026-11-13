export type SignupValidationError = 'email' | 'password' | 'passwordMismatch' | 'terms';
export const emailOtpLength = 8;
export type AuthToastMessageKey =
  | 'authInvalidCredentials'
  | 'authEmailUnconfirmed'
  | 'authAccountExists'
  | 'authInvalidCode'
  | 'authResendWait'
  | 'authEmailRequired'
  | 'authPasswordShort'
  | 'authGenericError';

export function authErrorMessageKey(error: unknown): AuthToastMessageKey {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message.toLowerCase()
        : '';
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : null;
  switch (code) {
    case 'invalid_credentials':
      return 'authInvalidCredentials';
    case 'email_not_confirmed':
      return 'authEmailUnconfirmed';
    case 'email_exists':
    case 'user_already_exists':
      return 'authAccountExists';
    case 'otp_expired':
    case 'invalid_otp':
      return 'authInvalidCode';
    case 'over_email_send_rate_limit':
      return 'authResendWait';
    case 'email_address_invalid':
      return 'authEmailRequired';
    case 'weak_password':
      return 'authPasswordShort';
    default:
      if (message.includes('already registered') || message.includes('already exists')) {
        return 'authAccountExists';
      }
      if (message.includes('invalid login credentials')) return 'authInvalidCredentials';
      if (message.includes('email not confirmed')) return 'authEmailUnconfirmed';
      return 'authGenericError';
  }
}

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
