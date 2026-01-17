import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { loginLimiter, otpLimiter } from '../middleware/rateLimit';
import { validate, schemas } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import Joi from 'joi';

const router = Router();

// Login - Step 1: Validate credentials and send OTP
router.post(
  '/login',
  loginLimiter,
  validate({
    body: Joi.object({
      email: schemas.email,
      password: Joi.string().required(),
    }),
  }),
  AuthController.login
);

// Verify OTP - Step 2: Verify OTP and create session
router.post(
  '/verify-otp',
  otpLimiter,
  validate({
    body: Joi.object({
      email: schemas.email,
      otp: Joi.string().length(6).pattern(/^\d+$/).required(),
      userId: schemas.id,
    }),
  }),
  AuthController.verifyOTP
);

// Resend OTP
router.post(
  '/resend-otp',
  otpLimiter,
  validate({
    body: Joi.object({
      email: schemas.email,
      userId: schemas.id,
    }),
  }),
  AuthController.resendOTP
);

// Logout
router.post(
  '/logout',
  authenticate,
  AuthController.logout
);

// Get current user
router.get(
  '/me',
  authenticate,
  AuthController.getCurrentUser
);

// Forgot Password - Step 1: Send OTP
router.post(
  '/forgot-password',
  loginLimiter,
  validate({
    body: Joi.object({
      email: schemas.email,
    }),
  }),
  AuthController.forgotPassword
);

// Verify Forgot Password OTP - Step 2: Verify OTP
router.post(
  '/verify-forgot-password-otp',
  otpLimiter,
  validate({
    body: Joi.object({
      email: schemas.email,
      otp: Joi.string().length(6).pattern(/^\d+$/).required(),
      userId: schemas.id,
    }),
  }),
  AuthController.verifyForgotPasswordOTP
);

// Reset Password - Step 3: Reset password
router.post(
  '/reset-password',
  loginLimiter,
  validate({
    body: Joi.object({
      email: schemas.email,
      otp: Joi.string().length(6).pattern(/^\d+$/).required(),
      userId: schemas.id,
      newPassword: Joi.string().min(8).required(),
    }),
  }),
  AuthController.resetPassword
);

export default router;

