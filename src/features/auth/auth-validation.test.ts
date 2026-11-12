import { describe, expect, it } from 'vitest';

import { safeReturnTo, validateEmail, validatePassword, validateSignup } from './auth-validation';

describe('auth input validation', () => {
  it('validates email and minimum password length', () => {
    expect(validateEmail(' player@example.com ')).toBe(true);
    expect(validateEmail('invalid')).toBe(false);
    expect(validatePassword('12345678')).toBe(true);
    expect(validatePassword('short')).toBe(false);
  });

  it('reports signup errors in a stable order', () => {
    expect(validateSignup('bad', 'short', 'different', false)).toBe('email');
    expect(validateSignup('a@b.co', 'short', 'short', true)).toBe('password');
    expect(validateSignup('a@b.co', 'long-pass', 'different', true)).toBe('passwordMismatch');
    expect(validateSignup('a@b.co', 'long-pass', 'long-pass', false)).toBe('terms');
    expect(validateSignup('a@b.co', 'long-pass', 'long-pass', true)).toBeNull();
  });

  it('allows only app-local return paths', () => {
    expect(safeReturnTo('/create')).toBe('/create');
    expect(safeReturnTo('//evil.example')).toBe('/home');
    expect(safeReturnTo('https://evil.example')).toBe('/home');
    expect(safeReturnTo('/\\evil')).toBe('/home');
    expect(safeReturnTo(['/profile'])).toBe('/home');
  });
});
