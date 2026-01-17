import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../config/database';
import { OTPService } from '../services/otpService';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { getSessionTimeout, is2FAEnabled, validatePassword } from '../utils/settings';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export class AuthController {
  /**
   * Login - Step 1: Validate credentials and send OTP
   */
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new CustomError('Email and password are required', 400);
      }

      // Find user by email
      const [users] = await db.query(
        'SELECT * FROM users WHERE email = ? AND status = ?',
        [email.toLowerCase(), 'Active']
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        throw new CustomError('Invalid email or password', 401);
      }

      const user = userArray[0];

      // Verify password
      if (!user.password_hash) {
        logger.warn({
          message: 'User has no password hash',
          userId: user.id,
          email: email.toLowerCase(),
          ip: req.ip,
        });
        throw new CustomError('Invalid email or password', 401);
      }

      // Trim password to remove any whitespace before comparison
      const trimmedPassword = password.trim();
      
      logger.info({
        message: 'Attempting password comparison',
        email: email.toLowerCase(),
        userId: user.id,
        hasPasswordHash: !!user.password_hash,
        passwordHashLength: user.password_hash?.length,
        passwordLength: trimmedPassword.length,
      });
      
      const isValidPassword = await bcrypt.compare(trimmedPassword, user.password_hash);
      
      if (!isValidPassword) {
        logger.warn({
          message: 'Failed login attempt - invalid password',
          email: email.toLowerCase(),
          userId: user.id,
          ip: req.ip,
          hasPasswordHash: !!user.password_hash,
          passwordHashLength: user.password_hash?.length,
          passwordLength: trimmedPassword.length,
        });
        throw new CustomError('Invalid email or password', 401);
      }
      
      logger.info({
        message: 'Password verified successfully',
        email: email.toLowerCase(),
        userId: user.id,
      });

      // Check if 2FA is enabled
      const twoFactorEnabled = await is2FAEnabled();
      if (!twoFactorEnabled) {
        // If 2FA is disabled, skip OTP and create session directly
        const sessionTimeoutMinutes = await getSessionTimeout();
        
        const token = jwt.sign(
          {
            userId: user.id,
            email: user.email,
            role: user.role,
          },
          process.env.JWT_SECRET!,
          { expiresIn: sessionTimeoutMinutes * 60 } // Convert minutes to seconds
        );

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + sessionTimeoutMinutes);

        await db.query(
          `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
           VALUES (?, ?, ?, ?, ?)`,
          [user.id, token, req.ip, req.get('user-agent') || '', expiresAt]
        );

        logger.info({
          message: 'User logged in (2FA disabled)',
          userId: user.id,
          email: user.email,
        });

        res.json({
          success: true,
          data: {
            requiresOTP: false,
            token,
            user: {
              id: user.id,
              email: user.email,
              fullName: user.full_name,
              role: user.role,
            },
          },
        });
        return;
      }

      // Generate and store OTP
      const otp = OTPService.generateOTP();
      await OTPService.storeOTP(user.id, otp, req.ip, 'login');

      // Send OTP via email (and SMS if configured)
      try {
        await emailService.sendOTP(user.email, otp, user.full_name);
      } catch (emailError: any) {
        logger.error({
          message: 'Failed to send OTP email',
          userId: user.id,
          error: emailError.message,
        });
        // Continue even if email fails - OTP is stored
      }

      // Send OTP via SMS if phone number exists
      if (user.phone) {
        try {
          await smsService.sendOTP(user.phone, otp);
        } catch (smsError: any) {
          logger.error({
            message: 'Failed to send OTP SMS',
            userId: user.id,
            error: smsError.message,
          });
          // Continue even if SMS fails
        }
      }

      logger.info({
        message: 'OTP sent for login',
        userId: user.id,
        email: user.email,
      });

      res.json({
        success: true,
        data: {
          requiresOTP: true,
          message: 'OTP sent to your email and phone',
          userId: user.id, // Include for OTP verification
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify OTP - Step 2: Verify OTP and create session
   */
  static async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, userId } = req.body;

      if (!email || !otp || !userId) {
        throw new CustomError('Email, OTP, and userId are required', 400);
      }

      // Verify OTP
      const isValid = await OTPService.verifyOTP(userId, otp, 'login');
      if (!isValid) {
        logger.warn({
          message: 'Invalid OTP attempt',
          userId,
          email: email.toLowerCase(),
          ip: req.ip,
        });
        throw new CustomError('Invalid or expired OTP', 401);
      }

      // Get user details
      const [users] = await db.query(
        'SELECT id, email, full_name, role, status FROM users WHERE id = ?',
        [userId]
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        throw new CustomError('User not found', 404);
      }

      const user = userArray[0];

      if (user.status !== 'Active') {
        throw new CustomError('User account is not active', 403);
      }

      // Get session timeout from settings
      const sessionTimeoutMinutes = await getSessionTimeout();
      const expiresInMinutes = sessionTimeoutMinutes;
      
      // Generate JWT token  
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET!,
        { expiresIn: expiresInMinutes * 60 } // Convert minutes to seconds
      );

      // Create session with timeout from settings
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + sessionTimeoutMinutes);

      await db.query(
        `INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [user.id, token, req.ip, req.get('user-agent') || '', expiresAt]
      );

      // Update last login
      await db.query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );

      logger.info({
        message: 'User logged in successfully',
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
          },
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Resend OTP
   */
  static async resendOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, userId } = req.body;

      if (!email || !userId) {
        throw new CustomError('Email and userId are required', 400);
      }

      // Get user
      const [users] = await db.query(
        'SELECT * FROM users WHERE id = ? AND email = ? AND status = ?',
        [userId, email.toLowerCase(), 'Active']
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        throw new CustomError('User not found', 404);
      }

      const user = userArray[0];

      // Check recent OTP attempts (rate limiting)
      const recentAttempts = await OTPService.getRecentOTPAttempts(user.id, 10);
      if (recentAttempts >= 5) {
        throw new CustomError('Too many OTP requests. Please wait before requesting again.', 429);
      }

      // Generate and store new OTP
      const otp = OTPService.generateOTP();
      await OTPService.storeOTP(user.id, otp, req.ip, 'login');

      // Send OTP
      try {
        await emailService.sendOTP(user.email, otp, user.full_name);
      } catch (emailError: any) {
        logger.error({
          message: 'Failed to send OTP email',
          userId: user.id,
          error: emailError.message,
        });
      }

      if (user.phone) {
        try {
          await smsService.sendOTP(user.phone, otp);
        } catch (smsError: any) {
          logger.error({
            message: 'Failed to send OTP SMS',
            userId: user.id,
            error: smsError.message,
          });
        }
      }

      res.json({
        success: true,
        data: {
          message: 'OTP resent successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Logout - Clear session
   */
  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (token) {
        await db.query(
          'DELETE FROM user_sessions WHERE session_token = ?',
          [token]
        );
      }

      logger.info({
        message: 'User logged out',
        userId: req.user?.userId,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new CustomError('Not authenticated', 401);
      }

      const [users] = await db.query(
        `SELECT id, email, full_name, role, department, phone, status, last_login, created_at
         FROM users WHERE id = ?`,
        [req.user.userId]
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        throw new CustomError('User not found', 404);
      }

      const user = userArray[0];

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          department: user.department,
          phone: user.phone,
          status: user.status,
          lastLogin: user.last_login,
          createdAt: user.created_at,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Forgot Password - Step 1: Send OTP to email
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new CustomError('Email is required', 400);
      }

      // Find user by email
      const [users] = await db.query(
        'SELECT * FROM users WHERE email = ? AND status = ?',
        [email.toLowerCase(), 'Active']
      );

      const userArray = users as any[];
      
      // Don't reveal if user exists or not (security best practice)
      // But still send success response to prevent email enumeration
      if (userArray.length === 0) {
        // Log but don't reveal to user
        logger.warn({
          message: 'Forgot password request for non-existent email',
          email: email.toLowerCase(),
          ip: req.ip,
        });
        
        // Return success to prevent email enumeration
        res.json({
          success: true,
          data: {
            message: 'If an account exists with this email, an OTP has been sent.',
            userId: null, // Don't reveal user ID
          },
        });
        return;
      }

      const user = userArray[0];

      // Check recent OTP attempts (rate limiting)
      const recentAttempts = await OTPService.getRecentOTPAttempts(user.id, 10);
      if (recentAttempts >= 5) {
        throw new CustomError('Too many password reset requests. Please wait before requesting again.', 429);
      }

      // Generate and store OTP for password reset
      const otp = OTPService.generateOTP();
      await OTPService.storeOTP(user.id, otp, req.ip, 'password_reset');

      // Send password reset OTP email
      try {
        await emailService.sendPasswordResetOTP(user.email, otp, user.full_name);
      } catch (emailError: any) {
        logger.error({
          message: 'Failed to send password reset OTP email',
          userId: user.id,
          error: emailError.message,
        });
        // Still return success to prevent email enumeration
      }

      // Send OTP via SMS if phone number exists
      if (user.phone) {
        try {
          await smsService.sendOTP(user.phone, otp);
        } catch (smsError: any) {
          logger.error({
            message: 'Failed to send password reset OTP SMS',
            userId: user.id,
            error: smsError.message,
          });
        }
      }

      logger.info({
        message: 'Password reset OTP sent',
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          message: 'If an account exists with this email, an OTP has been sent.',
          userId: user.id, // Include for OTP verification
        },
      });
      return;
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Verify Forgot Password OTP - Step 2: Verify OTP for password reset
   */
  static async verifyForgotPasswordOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, userId } = req.body;

      if (!email || !otp || !userId) {
        throw new CustomError('Email, OTP, and userId are required', 400);
      }

      // Check OTP for password reset (don't mark as used yet - will be marked when password is reset)
      const isValid = await OTPService.checkOTP(userId, otp, 'password_reset');
      if (!isValid) {
        logger.warn({
          message: 'Invalid password reset OTP attempt',
          userId,
          email: email.toLowerCase(),
          ip: req.ip,
        });
        throw new CustomError('Invalid or expired OTP', 401);
      }

      // Get user details
      const [users] = await db.query(
        'SELECT id, email, full_name, role, status FROM users WHERE id = ? AND email = ?',
        [userId, email.toLowerCase()]
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        throw new CustomError('User not found', 404);
      }

      const user = userArray[0];

      if (user.status !== 'Active') {
        throw new CustomError('User account is not active', 403);
      }

      logger.info({
        message: 'Password reset OTP verified',
        userId: user.id,
        email: user.email,
        ip: req.ip,
      });

      res.json({
        success: true,
        data: {
          message: 'OTP verified successfully. You can now reset your password.',
          userId: user.id,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Reset Password - Step 3: Reset password after OTP verification
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp, userId, newPassword } = req.body;

      if (!email || !otp || !userId || !newPassword) {
        throw new CustomError('Email, OTP, userId, and new password are required', 400);
      }

      // Verify OTP for password reset (must be verified before reset)
      const isValid = await OTPService.verifyOTP(userId, otp, 'password_reset');
      if (!isValid) {
        logger.warn({
          message: 'Invalid password reset OTP during password reset',
          userId,
          email: email.toLowerCase(),
          ip: req.ip,
        });
        throw new CustomError('Invalid or expired OTP. Please request a new password reset.', 401);
      }

      // Get user
      const [users] = await db.query(
        'SELECT * FROM users WHERE id = ? AND email = ? AND status = ?',
        [userId, email.toLowerCase(), 'Active']
      );

      const userArray = users as any[];
      if (userArray.length === 0) {
        throw new CustomError('User not found', 404);
      }

      const user = userArray[0];

      // Trim password to remove any whitespace
      const trimmedPassword = newPassword.trim();

      // Validate new password against requirements
      const passwordValidation = await validatePassword(trimmedPassword);
      if (!passwordValidation.valid) {
        throw new CustomError(`Password validation failed: ${passwordValidation.errors.join(', ')}`, 400);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(
        trimmedPassword,
        parseInt(process.env.BCRYPT_ROUNDS || '10')
      );

      // Update password
      const [updateResult] = await db.query(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [passwordHash, user.id]
      );

      // Verify the update was successful
      const updateInfo = updateResult as any;
      if (updateInfo.affectedRows === 0) {
        logger.error({
          message: 'Password update failed - no rows affected',
          userId: user.id,
          email: user.email,
        });
        throw new CustomError('Failed to update password. Please try again.', 500);
      }

      // Verify the password was actually updated by checking it
      const [verifyUsers] = await db.query(
        'SELECT password_hash FROM users WHERE id = ?',
        [user.id]
      );
      const verifyUser = (verifyUsers as any[])[0];
      const passwordMatches = await bcrypt.compare(trimmedPassword, verifyUser.password_hash);
      
      if (!passwordMatches) {
        logger.error({
          message: 'Password update verification failed - hash mismatch',
          userId: user.id,
          email: user.email,
          hasNewHash: !!verifyUser.password_hash,
          hashLength: verifyUser.password_hash?.length,
        });
        throw new CustomError('Password update verification failed. Please try again.', 500);
      }

      logger.info({
        message: 'Password hash verified after update',
        userId: user.id,
        email: user.email,
        passwordMatches: true,
      });

      // Invalidate all existing sessions for security
      await db.query(
        'DELETE FROM user_sessions WHERE user_id = ?',
        [user.id]
      );

      logger.info({
        message: 'Password reset successfully',
        userId: user.id,
        email: user.email,
        ip: req.ip,
        passwordUpdated: true,
      });

      res.json({
        success: true,
        data: {
          message: 'Password reset successfully. Please login with your new password.',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

