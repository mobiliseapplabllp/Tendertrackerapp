import { describe, it, expect } from 'vitest';
import { isValidEmail, validatePassword, sanitizeInput } from '../lib/security';

describe('Security Utilities', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('Password123!').isValid).toBe(true);
      expect(validatePassword('MyP@ssw0rd').isValid).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('short').isValid).toBe(false);
      expect(validatePassword('nouppercase123!').isValid).toBe(false);
      expect(validatePassword('NOLOWERCASE123!').isValid).toBe(false);
      expect(validatePassword('NoNumbers!').isValid).toBe(false);
      expect(validatePassword('NoSpecial123').isValid).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeInput('<div>Hello</div>')).toBe('divHello/div');
    });

    it('should handle normal text', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
      expect(sanitizeInput('Test 123')).toBe('Test 123');
    });

    it('should handle empty strings', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });
});

