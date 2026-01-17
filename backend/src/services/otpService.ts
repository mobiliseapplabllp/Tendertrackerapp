import db from '../config/database';
import logger from '../utils/logger';

export class OTPService {
  /**
   * Generate a random 6-digit OTP
   */
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store OTP in database
   */
  static async storeOTP(
    userId: number,
    otp: string,
    ipAddress?: string,
    purpose: 'login' | 'password_reset' = 'login'
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    try {
      // Check if purpose column exists, if not use old format
      const [columns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'otp_verifications' 
         AND COLUMN_NAME = 'purpose'`
      );
      
      const hasPurposeColumn = (columns as any[]).length > 0;
      
      if (hasPurposeColumn) {
        await db.query(
          `INSERT INTO otp_verifications (user_id, otp_code, expires_at, ip_address, purpose)
           VALUES (?, ?, ?, ?, ?)`,
          [userId, otp, expiresAt, ipAddress || null, purpose]
        );
      } else {
        await db.query(
          `INSERT INTO otp_verifications (user_id, otp_code, expires_at, ip_address)
           VALUES (?, ?, ?, ?)`,
          [userId, otp, expiresAt, ipAddress || null]
        );
      }
    } catch (error: any) {
      logger.error({
        message: 'Failed to store OTP',
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Check if OTP is valid without marking it as used
   */
  static async checkOTP(
    userId: number,
    otp: string,
    purpose: 'login' | 'password_reset' = 'login'
  ): Promise<boolean> {
    try {
      // Check if purpose column exists
      const [columns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'otp_verifications' 
         AND COLUMN_NAME = 'purpose'`
      );
      
      const hasPurposeColumn = (columns as any[]).length > 0;
      
      let query: string;
      let params: any[];
      
      if (hasPurposeColumn) {
        query = `SELECT * FROM otp_verifications
                 WHERE user_id = ? AND otp_code = ? AND expires_at > NOW() AND is_used = FALSE AND purpose = ?
                 ORDER BY created_at DESC
                 LIMIT 1`;
        params = [userId, otp, purpose];
      } else {
        query = `SELECT * FROM otp_verifications
                 WHERE user_id = ? AND otp_code = ? AND expires_at > NOW() AND is_used = FALSE
                 ORDER BY created_at DESC
                 LIMIT 1`;
        params = [userId, otp];
      }
      
      const [rows] = await db.query(query, params);

      const otpRecords = rows as any[];
      
      return otpRecords.length > 0;
    } catch (error: any) {
      logger.error({
        message: 'Failed to check OTP',
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Verify OTP code and mark it as used
   */
  static async verifyOTP(
    userId: number,
    otp: string,
    purpose: 'login' | 'password_reset' = 'login'
  ): Promise<boolean> {
    try {
      // Check if purpose column exists
      const [columns] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'otp_verifications' 
         AND COLUMN_NAME = 'purpose'`
      );
      
      const hasPurposeColumn = (columns as any[]).length > 0;
      
      let query: string;
      let params: any[];
      
      if (hasPurposeColumn) {
        query = `SELECT * FROM otp_verifications
                 WHERE user_id = ? AND otp_code = ? AND expires_at > NOW() AND is_used = FALSE AND purpose = ?
                 ORDER BY created_at DESC
                 LIMIT 1`;
        params = [userId, otp, purpose];
      } else {
        query = `SELECT * FROM otp_verifications
                 WHERE user_id = ? AND otp_code = ? AND expires_at > NOW() AND is_used = FALSE
                 ORDER BY created_at DESC
                 LIMIT 1`;
        params = [userId, otp];
      }
      
      const [rows] = await db.query(query, params);

      const otpRecords = rows as any[];
      
      if (otpRecords.length === 0) {
        return false;
      }

      // Mark OTP as used
      await db.query(
        'UPDATE otp_verifications SET is_used = TRUE WHERE id = ?',
        [otpRecords[0].id]
      );

      return true;
    } catch (error: any) {
      logger.error({
        message: 'Failed to verify OTP',
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Clean up expired OTPs (can be called periodically)
   */
  static async cleanupExpiredOTPs(): Promise<void> {
    try {
      await db.query(
        'DELETE FROM otp_verifications WHERE expires_at < NOW() OR is_used = TRUE'
      );
    } catch (error: any) {
      logger.error({
        message: 'Failed to cleanup expired OTPs',
        error: error.message,
      });
    }
  }

  /**
   * Get recent OTP attempts for a user (for rate limiting)
   */
  static async getRecentOTPAttempts(
    userId: number,
    minutes: number = 10
  ): Promise<number> {
    try {
      const [rows] = await db.query(
        `SELECT COUNT(*) as count FROM otp_verifications
         WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
        [userId, minutes]
      );

      const result = rows as any[];
      return result[0]?.count || 0;
    } catch (error: any) {
      logger.error({
        message: 'Failed to get recent OTP attempts',
        userId,
        error: error.message,
      });
      return 0;
    }
  }
}

