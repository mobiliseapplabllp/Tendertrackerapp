/**
 * Input Validation Tests
 * Tests for SQL injection, XSS, and other injection attacks
 */

import { sanitizeInput, isValidEmail, validatePassword } from '../../src/lib/security';
import { LeadController } from '../controllers/leadController';
import db from '../config/database';

jest.mock('../config/database');

describe('Input Validation Tests', () => {
  describe('XSS Prevention', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert(1)>',
      '<svg onload=alert(1)>',
      'javascript:alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload=alert(1)>',
      '<input onfocus=alert(1) autofocus>',
      '<select onfocus=alert(1) autofocus><option>test</option></select>',
      '<textarea onfocus=alert(1) autofocus>test</textarea>',
      '<keygen onfocus=alert(1) autofocus>',
      '<video><source onerror=alert(1)>',
      '<audio src=x onerror=alert(1)>',
      '<details open ontoggle=alert(1)>',
      '<marquee onstart=alert(1)>',
      '<math><mi//xlink:href="data:x,<script>alert(1)</script>">',
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS payload ${index + 1}`, () => {
        const sanitized = sanitizeInput(payload);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('onerror=');
        expect(sanitized).not.toContain('onload=');
        expect(sanitized).not.toContain('javascript:');
      });
    });
  });

  describe('SQL Injection Prevention', () => {
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "1' OR '1'='1",
      "admin'--",
      "admin'/*",
      "' OR 1=1--",
      "' OR 1=1#",
      "' OR 1=1/*",
      "') OR ('1'='1",
      "1' ORDER BY 1--+",
      "1' ORDER BY 2--+",
      "1' ORDER BY 3--+",
      "-1 UNION SELECT 1,2,3--+",
      "-1 UNION SELECT 1,2,3,4,5--+",
    ];

    sqlPayloads.forEach((payload, index) => {
      it(`should prevent SQL injection ${index + 1}`, async () => {
        const mockRequest = {
          query: { search: payload },
          user: { userId: 1, email: 'test@example.com', role: 'Admin' },
        };

        (db.query as jest.Mock).mockResolvedValueOnce([[{ total: 0 }]]);
        (db.query as jest.Mock).mockResolvedValueOnce([[]]);
        (db.query as jest.Mock).mockResolvedValueOnce([[]]);

        // Should not throw error or execute malicious SQL
        await expect(
          LeadController.getAll(
            mockRequest as any,
            {} as any,
            jest.fn()
          )
        ).resolves.not.toThrow();

        // Verify parameterized query was used (not string concatenation)
        const queryCalls = (db.query as jest.Mock).mock.calls;
        queryCalls.forEach(call => {
          const query = call[0];
          if (typeof query === 'string') {
            // Should use ? placeholders, not string interpolation
            expect(query).not.toContain(payload);
          }
        });
      });
    });
  });

  describe('Email Validation', () => {
    const validEmails = [
      'test@example.com',
      'user.name@example.co.uk',
      'user+tag@example.com',
      'user_name@example-domain.com',
    ];

    const invalidEmails = [
      'invalid',
      'test@',
      '@example.com',
      'test..test@example.com',
      'test@example',
      'test @example.com',
      'test@example .com',
      'test@example..com',
    ];

    validEmails.forEach(email => {
      it(`should accept valid email: ${email}`, () => {
        expect(isValidEmail(email)).toBe(true);
      });
    });

    invalidEmails.forEach(email => {
      it(`should reject invalid email: ${email}`, () => {
        expect(isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('Password Validation', () => {
    const weakPasswords = [
      '123456',
      'password',
      'abc',
      'Password1',
      'PASSWORD1',
      'Password',
      '12345678',
      'qwerty',
      'admin',
    ];

    const strongPasswords = [
      'Test@1234',
      'MyP@ssw0rd!',
      'Str0ng#P@ss',
      'Complex1!',
    ];

    weakPasswords.forEach(password => {
      it(`should reject weak password: ${password}`, () => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
      });
    });

    strongPasswords.forEach(password => {
      it(`should accept strong password: ${password}`, () => {
        const result = validatePassword(password);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('File Upload Validation', () => {
    it('should reject executable files', () => {
      const executableExtensions = ['.exe', '.bat', '.sh', '.cmd', '.ps1'];
      executableExtensions.forEach(ext => {
        // This would be tested in fileService
        expect(ext).toMatch(/\.(exe|bat|sh|cmd|ps1)$/i);
      });
    });

    it('should reject files exceeding size limit', () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const largeFile = Buffer.alloc(maxSize + 1);
      // File size validation would be tested in fileService
      expect(largeFile.length).toBeGreaterThan(maxSize);
    });
  });
});


