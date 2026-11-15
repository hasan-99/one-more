import { describe, expect, it } from 'vitest';
import { AuthApiError } from '@supabase/supabase-js';

import {
  authErrorMessageKey,
  safeReturnTo,
  validateEmail,
  validatePassword,
  validatePhone,
  validateSignup,
} from './auth-validation';

describe('auth input validation', () => {
  it('validates email and minimum password length', () => {
    expect(validateEmail(' player@example.com ')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
    expect(validatePassword('abcd1234')).toBe(true);
    expect(validatePassword('12345678')).toBe(false);
    expect(validatePassword('onlyletters')).toBe(false);
    expect(validatePassword('short')).toBe(false);
  });

  it('accepts an international phone number with 7 to 15 digits', () => {
    expect(validatePhone('+357 99 123456')).toBe(true);
    expect(validatePhone('123-4567')).toBe(true);
    expect(validatePhone('123456')).toBe(false);
    expect(validatePhone('12345abc')).toBe(false);
  });

  it('reports signup errors in a stable order', () => {
    expect(validateSignup('', '', 'bad', 'short', 'different', false)).toBe('displayName');
    expect(validateSignup('Αλέξης', '', 'bad', 'short', 'different', false)).toBe(
      'displayNameEnglish',
    );
    expect(validateSignup('Alex', '', 'bad', 'short', 'different', false)).toBe('phoneRequired');
    expect(validateSignup('Alex', '123456', 'bad', 'short', 'different', false)).toBe(
      'phoneInvalid',
    );
    expect(validateSignup('Alex', '+357 99 123456', 'bad', 'short', 'different', false)).toBe(
      'email',
    );
    expect(validateSignup('Alex', '+357 99 123456', 'a@b.co', 'short', 'short', true)).toBe(
      'password',
    );
    expect(validateSignup('Alex', '+357 99 123456', 'a@b.co', 'long-pass1', 'different', true)).toBe(
      'passwordMismatch',
    );
    expect(
      validateSignup('Alex', '+357 99 123456', 'a@b.co', 'long-pass1', 'long-pass1', false),
    ).toBe('terms');
    expect(
      validateSignup('Alex', '+357 99 123456', 'a@b.co', 'long-pass1', 'long-pass1', true),
    ).toBeNull();
  });

  it('allows only app-local return paths', () => {
    expect(safeReturnTo('/create')).toBe('/create');
    expect(safeReturnTo('//evil.example')).toBe('/home');
    expect(safeReturnTo('https://evil.example')).toBe('/home');
    expect(safeReturnTo('/\\evil')).toBe('/home');
    expect(safeReturnTo(['/profile'])).toBe('/home');
  });

  it('maps Supabase auth failures to localized-safe message keys', () => {
    const alreadyExists = new AuthApiError('duplicate', 422, 'email_exists');
    const wrongPassword = new AuthApiError('wrong password', 400, 'invalid_credentials');
    expect(authErrorMessageKey(alreadyExists)).toBe('authAccountExists');
    expect(authErrorMessageKey(wrongPassword)).toBe('authInvalidCredentials');
    expect(authErrorMessageKey(new Error('User already registered'))).toBe('authAccountExists');
    expect(authErrorMessageKey(new Error('Invalid login credentials'))).toBe(
      'authInvalidCredentials',
    );
    expect(authErrorMessageKey(new Error('network unavailable'))).toBe('authGenericError');
  });
});
