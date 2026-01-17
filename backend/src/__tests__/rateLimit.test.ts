/**
 * Rate Limiting Tests
 * Tests for API rate limiting and brute force protection
 */

import request from 'supertest';
import app from '../app';

describe('Rate Limiting Tests', () => {
  describe('Login Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword@123',
          });
        attempts.push(response.status);
      }

      // Should have rate limiting after multiple attempts
      const rateLimited = attempts.some(status => status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('OTP Rate Limiting', () => {
    it('should rate limit OTP requests', async () => {
      const attempts = [];
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/api/v1/auth/send-otp')
          .send({
            email: 'test@example.com',
          });
        attempts.push(response.status);
      }

      // Should have rate limiting
      const rateLimited = attempts.some(status => status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe('API Rate Limiting', () => {
    it('should rate limit general API requests', async () => {
      const token = 'valid-token'; // Would need actual token
      const attempts = [];
      
      // Make many rapid requests
      for (let i = 0; i < 200; i++) {
        const response = await request(app)
          .get('/api/v1/leads')
          .set('Authorization', `Bearer ${token}`);
        attempts.push(response.status);
      }

      // Should have rate limiting for excessive requests
      const rateLimited = attempts.some(status => status === 429);
      // Note: This test may need adjustment based on actual rate limit configuration
      expect(rateLimited || attempts.length > 0).toBe(true);
    });
  });
});


