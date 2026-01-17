import twilio from 'twilio';
import db from '../config/database';
import logger from '../utils/logger';

class SMSService {
  private client: twilio.Twilio | null = null;
  private phoneNumber: string | null = null;

  /**
   * Initialize SMS service
   */
  async initialize() {
    try {
      // Get SMS configuration from database
      const [configs] = await db.query(
        `SELECT config_key, config_value FROM system_config 
         WHERE config_key IN ('sms_enabled', 'twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number')`
      );

      const configArray = configs as any[];
      const config: Record<string, string> = {};
      configArray.forEach((item: any) => {
        config[item.config_key] = item.config_value;
      });

      if (config.sms_enabled !== 'true') {
        logger.info('SMS service is disabled');
        return;
      }

      const accountSid = config.twilio_account_sid || process.env.TWILIO_ACCOUNT_SID;
      const authToken = config.twilio_auth_token || process.env.TWILIO_AUTH_TOKEN;
      this.phoneNumber = config.twilio_phone_number || process.env.TWILIO_PHONE_NUMBER || null;

      if (!accountSid || !authToken) {
        logger.warn('Twilio credentials not configured');
        return;
      }

      this.client = twilio(accountSid, authToken);
      logger.info('SMS service initialized successfully');
    } catch (error: any) {
      logger.error({
        message: 'Failed to initialize SMS service',
        error: error.message,
      });
      this.client = null;
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    if (!this.client || !this.phoneNumber) {
      await this.initialize();
    }

    if (!this.client || !this.phoneNumber) {
      logger.warn('SMS service not available - OTP not sent');
      return;
    }

    try {
      await this.client.messages.create({
        body: `Your LeadTrack Pro verification code is: ${otp}. This code expires in 10 minutes.`,
        from: this.phoneNumber!,
        to: phoneNumber,
      });

      logger.info({
        message: 'OTP SMS sent',
        phoneNumber,
      });
    } catch (error: any) {
      logger.error({
        message: 'Failed to send OTP SMS',
        phoneNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send notification SMS
   */
  async sendNotification(phoneNumber: string, message: string): Promise<void> {
    if (!this.client || !this.phoneNumber) {
      await this.initialize();
    }

    if (!this.client || !this.phoneNumber) {
      logger.warn('SMS service not available - notification not sent');
      return;
    }

    try {
      await this.client.messages.create({
        body: message,
        from: this.phoneNumber!,
        to: phoneNumber,
      });

      logger.info({
        message: 'Notification SMS sent',
        phoneNumber,
      });
    } catch (error: any) {
      logger.error({
        message: 'Failed to send notification SMS',
        phoneNumber,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Test SMS configuration
   */
  async testConfiguration(testPhone: string): Promise<boolean> {
    try {
      await this.sendNotification(
        testPhone,
        'Test SMS from LeadTrack Pro - Configuration is working correctly.'
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const smsService = new SMSService();

