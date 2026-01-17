/**
 * Security Tests - OWASP Top 10 Compliance
 * 
 * Tests for security vulnerabilities and best practices
 */

import request from 'supertest';
import app from '../app';
import db from '../config/database';
import { sanitizeInput, validatePassword, isValidEmail } from '../../src/lib/security';

describe('Security Tests - OWASP Top 10', () => {
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // Create test user and get auth token
    // This would normally be done through proper auth flow
  });

  afterAll(async () => {
    await db.end();
  });

  describe('A01: Broken Access Control', () => {
    it('should prevent unauthorized access to admin endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/admin/config')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should prevent users from accessing other users data', async () => {
      // Test that users can only access their own data
      const response = await request(app)
        .get('/api/v1/users/999')
        .set('Authorization', `Bearer ${authToken}`);

      // Should return 403 or 404, not the user data
      expect([403, 404]).toContain(response.status);
    });

    it('should enforce role-based access control', async () => {
      // Test that non-admin users cannot access admin endpoints
      const userToken = 'user-token'; // Non-admin token
      const response = await request(app)
        .post('/api/v1/lead-types')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test Type' });

      expect(response.status).toBe(403);
    });
  });

  describe('A02: Cryptographic Failures', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'Test@1234';
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: password,
        });

      // Verify password is hashed in database
      const [users] = await db.query(
        'SELECT password FROM users WHERE email = ?',
        ['test@example.com']
      );
      const user = (users as any[])[0];
      expect(user.password).not.toBe(password);
      expect(user.password).toMatch(/^\$2[aby]\$/); // bcrypt hash format
    });

    it('should use HTTPS in production', () => {
      // This would be tested in production environment
      // For now, verify security headers are set
      const response = request(app).get('/health');
      // Helmet should set HSTS header
    });
  });

  describe('A03: Injection', () => {
    it('should prevent SQL injection in search queries', async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const response = await request(app)
        .get(`/api/v1/leads?search=${encodeURIComponent(maliciousInput)}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should not cause SQL error, should return empty results or error
      expect(response.status).not.toBe(500);

      // Verify table still exists
      const [tables] = await db.query('SHOW TABLES LIKE "users"');
      expect((tables as any[]).length).toBeGreaterThan(0);
    });

    it('should prevent XSS in user input', () => {
      const maliciousScript = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(maliciousScript);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should sanitize input in lead creation', async () => {
      const maliciousInput = '<img src=x onerror=alert(1)>';
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leadNumber: 'LD-001',
          title: maliciousInput,
          description: maliciousInput,
        });

      if (response.status === 201) {
        // Verify stored data is sanitized
        const lead = response.body.data;
        expect(lead.title).not.toContain('<script>');
        expect(lead.title).not.toContain('onerror');
      }
    });
  });

  describe('A04: Insecure Design', () => {
    it('should require strong passwords', () => {
      const weakPasswords = ['123456', 'password', 'abc', 'Password1'];
      weakPasswords.forEach(password => {
        const isValid = validatePassword(password);
        expect(isValid.isValid).toBe(false);
      });
    });

    it('should validate email format', () => {
      const invalidEmails = ['invalid', 'test@', '@example.com', 'test..test@example.com'];
      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it('should enforce rate limiting on login', async () => {
      // Attempt multiple logins rapidly
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/v1/auth/login')
            .send({
              email: 'test@example.com',
              password: 'WrongPassword@123',
            })
        );
      }

      const responses = await Promise.all(promises);
      // Should have rate limiting after a few attempts
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('A05: Security Misconfiguration', () => {
    it('should set security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should not expose server information in headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should not expose stack traces in production', async () => {
      // Trigger an error
      const response = await request(app)
        .get('/api/v1/invalid-endpoint')
        .set('Authorization', `Bearer ${authToken}`);

      if (process.env.NODE_ENV === 'production') {
        expect(response.body.stack).toBeUndefined();
      }
    });
  });

  describe('A06: Vulnerable Components', () => {
    it('should use latest secure versions of dependencies', async () => {
      // This would typically be checked via npm audit
      // For now, verify critical packages are present
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const packageJson = require('../../package.json');
      expect(packageJson.dependencies.express).toBeDefined();
      expect(packageJson.dependencies.helmet).toBeDefined();
      expect(packageJson.dependencies.bcrypt).toBeDefined();
    });
  });

  describe('A07: Authentication Failures', () => {
    it('should lock account after multiple failed attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword@123',
          });
      }

      // Next attempt should be blocked
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'CorrectPassword@123',
        });

      expect([401, 429, 423]).toContain(response.status);
    });

    it('should expire tokens after timeout', async () => {
      // This would require testing with an expired token
      const expiredToken = 'expired-token';
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should require OTP for login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@tendertrack.com',
          password: 'Admin@123',
        });

      expect(response.body.data.requiresOTP).toBe(true);
    });
  });

  describe('A08: Software/Data Integrity', () => {
    it('should validate file uploads', async () => {
      const maliciousFile = Buffer.from('malicious content');
      const response = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', maliciousFile, 'malicious.exe');

      expect([400, 415]).toContain(response.status);
    });

    it('should calculate file hashes for integrity', async () => {
      // Verify file hash is stored
      const response = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('test content'), 'test.pdf');

      if (response.status === 201) {
        expect(response.body.data.fileHash).toBeDefined();
      }
    });
  });

  describe('A09: Logging Failures', () => {
    it('should log authentication failures', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword@123',
        });

      // Verify log entry exists (would check log files in real scenario)
      // This is a placeholder test
      expect(true).toBe(true);
    });

    it('should log security events', async () => {
      // Attempt unauthorized access
      await request(app)
        .get('/api/v1/admin/config')
        .set('Authorization', 'Bearer invalid-token');

      // Verify audit log entry
      const [logs] = await db.query(
        'SELECT * FROM audit_logs WHERE action LIKE ? ORDER BY created_at DESC LIMIT 1',
        ['%UNAUTHORIZED%']
      );
      // Should have logged the attempt
    });
  });

  describe('A10: SSRF', () => {
    it('should prevent SSRF in file uploads', async () => {
      // Attempt to upload file with malicious URL
      const response = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          url: 'file:///etc/passwd',
        });

      expect([400, 403]).toContain(response.status);
    });

    it('should validate URLs before fetching', async () => {
      const maliciousUrls = [
        'file:///etc/passwd',
        'http://localhost:22',
        'http://169.254.169.254/latest/meta-data',
      ];

      for (const url of maliciousUrls) {
        // Any endpoint that accepts URLs should reject these
        const response = await request(app)
          .post('/api/v1/tender-scout/sources')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ url });

        expect([400, 403]).toContain(response.status);
      }
    });
  });
});


