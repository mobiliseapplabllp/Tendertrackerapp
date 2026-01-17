import request from 'supertest';
import app from '../app';
import db from '../config/database';

describe('Authentication API', () => {
  beforeAll(async () => {
    // Setup test database connection
  });

  afterAll(async () => {
    // Cleanup
    await db.end();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'invalid-email',
          password: 'Test@1234',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@tendertrack.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@tendertrack.com',
          password: 'WrongPassword@123',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should successfully login and return OTP requirement', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@tendertrack.com',
          password: 'Admin@123',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.requiresOTP).toBe(true);
      expect(response.body.data.userId).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    it('should return 400 for invalid OTP format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'admin@tendertrack.com',
          otp: '12345', // Too short
          userId: 1,
        });

      expect(response.status).toBe(400);
    });

    it('should return 401 for invalid OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          email: 'admin@tendertrack.com',
          otp: '999999',
          userId: 1,
        });

      expect(response.status).toBe(401);
    });
  });
});

