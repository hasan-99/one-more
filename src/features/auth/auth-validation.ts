export type SignupValidationError =
  | 'displayName'
  | 'displayNameEnglish'
  | 'phoneRequired'
  | 'phoneInvalid'
  | 'email'
  | 'password'
  | 'passwordMismatch'
  | 'terms';
export const emailOtpLength = 8;
export type AuthToastMessageKey =
  | 'authInvalidCredentials'
  | 'authEmailUnconfirmed'
  | 'authAccountExists'
  | 'authInvalidCode'
  | 'authResendWait'
  | 'authTooManyRequests'
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
    case 'over_request_rate_limit':
      return 'authTooManyRequests';
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

export function validatePhone(phone: string): boolean {
  const value = phone.trim();
  const digits = value.replace(/\D/g, '');
  return /^[+0-9 ()-]+$/.test(value) && digits.length >= 7 && digits.length <= 15;
}

export function validatePassword(password: string): boolean {
  return (
    password.length >= 8 && password.length <= 72 && /\p{L}/u.test(password) && /\d/.test(password)
  );
}

export function validateSignup(
  displayName: string,
  phone: string,
  email: string,
  password: string,
  passwordConfirmation: string,
  termsAccepted: boolean,
): SignupValidationError | null {
  const name = displayName.trim();
  const nameLength = name.length;
  if (nameLength < 2 || nameLength > 40) return 'displayName';
  if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) return 'displayNameEnglish';
  if (!phone.trim()) return 'phoneRequired';
  if (!validatePhone(phone)) return 'phoneInvalid';
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
