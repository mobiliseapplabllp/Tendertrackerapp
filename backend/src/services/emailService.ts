import nodemailer from 'nodemailer';
import logger from '../utils/logger';
import { getCompanyName, getCompanyEmail } from '../utils/settings';

class EmailService {
  private isInitialized = false;
  private transporter: any = null;

  /**
   * Initialize SMTP email service
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587');
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASSWORD;

      if (!host || !user || !pass) {
        logger.warn('SMTP credentials not configured - email service disabled');
        return;
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });

      // Verify connection
      await this.transporter.verify();
      this.isInitialized = true;
      logger.info(`SMTP email service initialized (${host}:${port})`);
    } catch (error: any) {
      logger.error({
        message: 'Failed to initialize SMTP email service',
        error: error.message,
      });
      this.isInitialized = false;
    }
  }

  /**
   * Send email via SMTP
   */
  private async sendMail(msg: { to: string; from: { email: string; name: string }; subject: string; html: string; text?: string }) {
    await this.transporter.sendMail({
      from: `"${msg.from.name}" <${msg.from.email}>`,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text || '',
    });
  }

  /**
   * Send OTP email via SMTP
   */
  async sendOTP(email: string, otp: string, name?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      logger.warn('SMTP email service not available - OTP not sent');
      return;
    }

    try {
      // Get company name and email from settings
      const companyName = await getCompanyName();
      const companyEmail = await getCompanyEmail();
      
      // Use verified email address - SMTP from address
      const fromEmail = process.env.SMTP_FROM || companyEmail;
      const fromName = process.env.SMTP_FROM_NAME || companyName;

      const msg = {
        to: email,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: `Your Login Verification Code - ${companyName}`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 5px 10px 10px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 12px 15px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="background-color: rgba(255, 255, 255, 0.2); width: 50px; height: 50px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 17L12 22L22 17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Mobilise CRM</h1>
                    <p style="margin: 3px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 400;">Secure Login Verification</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 18px 20px;">
              <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 24px; font-weight: 600; line-height: 1.3;">Hello ${name || 'User'}! 👋</h2>
              <p style="margin: 0 0 15px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">We received a request to sign in to your Mobilise CRM account. Use the verification code below to complete your login:</p>
              
              <!-- OTP Code Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 15px 0;">
                    <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border: 2px dashed #9ca3af; border-radius: 16px; padding: 18px 10px; text-align: center;">
                      <p style="margin: 0 0 6px 0; color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                      <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #1f2937; font-family: 'Courier New', monospace; text-align: center; line-height: 1.2;">
                        ${otp}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 10px; margin: 15px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td width="24" style="vertical-align: top; padding-right: 6px;">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 6V10" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 14H10.01" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </td>
                    <td style="vertical-align: top;">
                      <p style="margin: 0 0 4px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Important Security Information</p>
                      <ul style="margin: 0; padding-left: 10px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                        <li>This code will expire in <strong>10 minutes</strong></li>
                        <li>Never share this code with anyone</li>
                        <li>If you didn't request this code, please ignore this email</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 8px; margin: 15px 0; text-align: center;">
                <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.6;">
                  <strong>🔒 Security Tip:</strong> Mobilise CRM will never ask for your password via email. Always verify the sender before entering your credentials.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 15px 20px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                      This is an automated security email from <strong style="color: #1f2937;">Mobilise CRM</strong>
                    </p>
                    <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 12px;">
                      If you have any questions, please contact our support team
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      © ${new Date().getFullYear()} Mobilise CRM. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Bottom Spacing -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 12px 10px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This email was sent to <strong style="color: #6b7280;">${email}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
        text: `Hello ${name || 'User'}!

Your Mobilise CRM login verification code is: ${otp}

This code will expire in 10 minutes.

Important Security Information:
- Never share this code with anyone
- If you didn't request this code, please ignore this email
- Mobilise CRM will never ask for your password via email

This is an automated security email from Mobilise CRM.

© ${new Date().getFullYear()} Mobilise CRM. All rights reserved.`,
      };

      await this.sendMail(msg);

      logger.info({
        message: 'OTP email sent via SMTP',
        email,
      });
    } catch (error: any) {
      logger.error({
        message: 'Failed to send OTP email via SMTP',
        email,
        error: error.message,
        response: error.response?.body,
      });
      throw error;
    }
  }

  /**
   * Send password reset OTP email
   */
  async sendPasswordResetOTP(email: string, otp: string, name?: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      logger.warn('SMTP email service not available - password reset OTP not sent');
      return;
    }

    try {
      // Get company name and email from settings
      const companyName = await getCompanyName();
      const companyEmail = await getCompanyEmail();
      
      // Use verified email address - SMTP from address
      const fromEmail = process.env.SMTP_FROM || companyEmail;
      const fromName = process.env.SMTP_FROM_NAME || companyName;

      const msg = {
        to: email,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: `Password Reset Verification Code - ${companyName}`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 5px 10px 10px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 12px 15px; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <div style="background-color: rgba(255, 255, 255, 0.2); width: 50px; height: 50px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                      <svg width="25" height="25" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 12V16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 8H12.01" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">${companyName}</h1>
                    <p style="margin: 3px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 400;">Password Reset Request</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 18px 20px;">
              <h2 style="margin: 0 0 10px 0; color: #1f2937; font-size: 24px; font-weight: 600; line-height: 1.3;">Hello ${name || 'User'}! 👋</h2>
              <p style="margin: 0 0 15px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">We received a request to reset your password for your ${companyName} account. Use the verification code below to proceed:</p>
              
              <!-- OTP Code Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 0 0 15px 0;">
                    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px dashed #f87171; border-radius: 16px; padding: 18px 10px; text-align: center;">
                      <p style="margin: 0 0 6px 0; color: #991b1b; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                      <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #dc2626; font-family: 'Courier New', monospace; text-align: center; line-height: 1.2;">
                        ${otp}
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 10px; margin: 15px 0;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td width="24" style="vertical-align: top; padding-right: 6px;">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 6V10" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M10 14H10.01" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </td>
                    <td style="vertical-align: top;">
                      <p style="margin: 0 0 4px 0; color: #92400e; font-size: 14px; font-weight: 600;">Important Security Information</p>
                      <ul style="margin: 0; padding-left: 10px; color: #92400e; font-size: 14px; line-height: 1.8;">
                        <li>This code will expire in <strong>10 minutes</strong></li>
                        <li>Never share this code with anyone</li>
                        <li>If you didn't request this password reset, please ignore this email</li>
                        <li>Your account remains secure if you didn't request this change</li>
                      </ul>
                    </td>
                  </tr>
                </table>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #fee2e2; border-radius: 8px; padding: 8px; margin: 15px 0; text-align: center;">
                <p style="margin: 0; color: #991b1b; font-size: 13px; line-height: 1.6;">
                  <strong>🔒 Security Tip:</strong> ${companyName} will never ask for your password via email. Always verify the sender before entering your credentials.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 15px 20px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                      This is an automated security email from <strong style="color: #1f2937;">${companyName}</strong>
                    </p>
                    <p style="margin: 6px 0 0 0; color: #9ca3af; font-size: 12px;">
                      If you have any questions, please contact our support team
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 10px; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                      © ${new Date().getFullYear()} ${companyName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Bottom Spacing -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding: 12px 10px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                This email was sent to <strong style="color: #6b7280;">${email}</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
        text: `Hello ${name || 'User'}!

Your ${companyName} password reset verification code is: ${otp}

This code will expire in 10 minutes.

Important Security Information:
- Never share this code with anyone
- If you didn't request this password reset, please ignore this email
- Your account remains secure if you didn't request this change
- ${companyName} will never ask for your password via email

This is an automated security email from ${companyName}.

© ${new Date().getFullYear()} ${companyName}. All rights reserved.`,
      };

      await this.sendMail(msg);

      logger.info({
        message: 'Password reset OTP email sent via SMTP',
        email,
      });
    } catch (error: any) {
      logger.error({
        message: 'Failed to send password reset OTP email via SMTP',
        email,
        error: error.message,
        response: error.response?.body,
      });
      throw error;
    }
  }

  /**
   * Send notification email
   */
  async sendNotification(
    email: string,
    subject: string,
    body: string,
    htmlBody?: string
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      logger.warn('SMTP email service not available - notification not sent');
      return;
    }

    try {
      // Get company name and email from settings
      const companyName = await getCompanyName();
      const companyEmail = await getCompanyEmail();
      
      // Use verified email address - SMTP from address
      const fromEmail = process.env.SMTP_FROM || companyEmail;
      const fromName = process.env.SMTP_FROM_NAME || companyName;

      const msg = {
        to: email,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject,
        text: body,
        html: htmlBody || body,
      };

      await this.sendMail(msg);

      logger.info({
        message: 'Notification email sent via SMTP',
        email,
        subject,
      });
    } catch (error: any) {
      logger.error({
        message: 'Failed to send notification email via SMTP',
        email,
        error: error.message,
        response: error.response?.body,
      });
      throw error;
    }
  }

  /**
   * Test email configuration
   */
  async testConfiguration(testEmail: string): Promise<boolean> {
    try {
      await this.sendNotification(
        testEmail,
        'Test Email from Mobilise CRM',
        'This is a test email to verify your SMTP email configuration is working correctly.',
        `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Mobilise CRM</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">Email Configuration Test</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 50px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 24px; font-weight: 600;">✅ Email Configuration Successful!</h2>
              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.6;">
                This is a test email to verify your SMTP email configuration is working correctly.
              </p>
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 30px 0;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  <strong>✓</strong> SMTP is properly configured<br>
                  <strong>✓</strong> Email service is operational<br>
                  <strong>✓</strong> You can now receive OTP emails
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 13px;">
                © ${new Date().getFullYear()} Mobilise CRM. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send proposal email with CC and reply-to support
   */
  async sendProposalEmail(options: {
    to: string;
    cc?: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    replyTo?: string;
    attachments?: Array<{ filename: string; content?: Buffer; path?: string; contentType?: string }>;
  }): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isInitialized) {
      throw new Error('SMTP email service not available');
    }

    try {
      const companyName = await getCompanyName();
      const companyEmail = await getCompanyEmail();
      const fromEmail = process.env.SMTP_FROM || companyEmail;
      const fromName = process.env.SMTP_FROM_NAME || companyName;

      const mailOptions: any = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.htmlBody,
        text: options.textBody,
      };

      if (options.cc) mailOptions.cc = options.cc;
      if (options.replyTo) mailOptions.replyTo = options.replyTo;
      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments;
      }

      await this.transporter.sendMail(mailOptions);

      logger.info({
        message: 'Proposal email sent via SMTP',
        to: options.to,
        cc: options.cc,
        subject: options.subject,
        attachmentCount: options.attachments?.length || 0,
      });
    } catch (error: any) {
      logger.error({
        message: 'Failed to send proposal email via SMTP',
        to: options.to,
        error: error.message,
      });
      throw error;
    }
  }
}

export const emailService = new EmailService();
