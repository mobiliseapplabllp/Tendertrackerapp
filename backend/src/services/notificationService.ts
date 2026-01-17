import db from '../config/database';
import { emailService } from './emailService';
import { getCompanyName } from '../utils/settings';
import logger from '../utils/logger';

interface NotificationSchedule {
  days30?: boolean;
  days15?: boolean;
  days10?: boolean;
  days7?: boolean;
  days3?: boolean;
  days2?: boolean;
  days1?: boolean;
  overdue?: boolean;
}

interface TenderWithDeadline {
  id: number;
  tenderNumber: string;
  title: string;
  submissionDeadline: string;
  status: string;
  companyName?: string;
  categoryName?: string;
  estimatedValue?: number;
  currency?: string;
  priority?: string;
}

export class NotificationService {
  /**
   * Get email alert recipients and schedule from system_config
   */
  static async getEmailAlertSettings(): Promise<{
    recipients: string[];
    schedule: NotificationSchedule;
  }> {
    try {
      // Get recipients
      const [recipientsConfig] = await db.query(
        "SELECT config_value FROM system_config WHERE config_key = 'email_alert_recipients'"
      );
      
      // Get schedule
      const [scheduleConfig] = await db.query(
        "SELECT config_value FROM system_config WHERE config_key = 'email_alert_schedule'"
      );

      const recipients = recipientsConfig && (recipientsConfig as any[]).length > 0
        ? JSON.parse((recipientsConfig as any[])[0].config_value || '[]')
        : [];

      const schedule = scheduleConfig && (scheduleConfig as any[]).length > 0
        ? JSON.parse((scheduleConfig as any[])[0].config_value || '{}')
        : {
            days30: true,
            days15: true,
            days10: true,
            days7: true,
            days3: true,
            days2: true,
            days1: true,
            overdue: true,
          };

      return { recipients, schedule };
    } catch (error: any) {
      logger.error({
        message: 'Error getting email alert settings',
        error: error.message,
      });
      return { recipients: [], schedule: {} };
    }
  }

  /**
   * Send notifications for a specific alert type
   */
  static async sendNotificationForAlertType(alertType: string): Promise<{ sent: number; failed: number; tenders: TenderWithDeadline[] }> {
    try {
      const { recipients } = await this.getEmailAlertSettings();

      if (recipients.length === 0) {
        throw new Error('No email recipients configured');
      }

      // Map alert type to days until deadline
      const alertTypeMap: Record<string, number> = {
        days30: 30,
        days15: 15,
        days10: 10,
        days7: 7,
        days3: 3,
        days2: 2,
        days1: 1,
        overdue: -1, // For overdue, we'll handle differently
      };

      const daysUntilDeadline = alertTypeMap[alertType];
      if (daysUntilDeadline === undefined) {
        throw new Error(`Invalid alert type: ${alertType}`);
      }

      // Check if deleted_at column exists
      let deletedFilter = '';
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        if ((columnCheck as any[]).length > 0) {
          deletedFilter = 'AND t.deleted_at IS NULL';
        }
      } catch (e) {
        // Column doesn't exist, skip filter
      }

      let query = `
        SELECT 
          t.id,
          t.tender_number,
          t.title,
          t.submission_deadline,
          t.status,
          t.priority,
          t.estimated_value,
          t.currency,
          c.company_name,
          tc.name as category_name
        FROM tenders t
        LEFT JOIN companies c ON t.company_id = c.id
        LEFT JOIN tender_categories tc ON t.category_id = tc.id
        WHERE t.submission_deadline IS NOT NULL
          AND t.status NOT IN ('Won', 'Lost', 'Cancelled')
          ${deletedFilter}
      `;

      const params: any[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (alertType === 'overdue') {
        // For overdue, get tenders with deadline in the past
        query += ' AND DATE(t.submission_deadline) < DATE(?)';
        params.push(today.toISOString());
      } else {
        // For specific days, get tenders with deadlines within the range for that alert type
        // Each alert type matches tenders that are at or below that threshold but above the next lower threshold
        // This prevents overlap and ensures each tender only appears in the most appropriate alert
        
        // Define the next lower threshold for each alert type (exclusive lower bound)
        const thresholdMap: Record<string, number> = {
          days30: 15,  // 30 days matches 30-16 days (inclusive)
          days15: 10,  // 15 days matches 15-11 days (inclusive)
          days10: 7,   // 10 days matches 10-8 days (inclusive)
          days7: 3,    // 7 days matches 7-4 days (inclusive)
          days3: 2,    // 3 days matches 3 days only
          days2: 1,    // 2 days matches 2 days only
          days1: 0,    // 1 day matches 1 day only
        };
        
        const nextThreshold = thresholdMap[alertType] ?? 0;
        
        // Calculate date range: from today + nextThreshold+1 to today + daysUntilDeadline+1
        // This creates a range like: (nextThreshold+1) to (daysUntilDeadline+1) days from today
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() + nextThreshold + 1);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + daysUntilDeadline + 1);
        endDate.setHours(0, 0, 0, 0);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        // Query: deadline >= startDate AND deadline < endDate
        // This means: deadline is between (nextThreshold+1) and (daysUntilDeadline+1) days from today
        // Which translates to: days remaining is between nextThreshold and daysUntilDeadline (inclusive)
        query += ' AND DATE(t.submission_deadline) >= ? AND DATE(t.submission_deadline) < ?';
        params.push(startDateStr, endDateStr);
      }

      query += ' ORDER BY t.submission_deadline ASC';

      logger.info({
        message: 'Running notification query',
        alertType,
        daysUntilDeadline,
        query: query.replace(/\s+/g, ' ').trim(),
        params,
      });

      const [tenders] = await db.query(query, params);
      const tendersRaw = tenders as any[];

      // Transform snake_case to camelCase
      const tendersList: TenderWithDeadline[] = tendersRaw.map((t: any) => ({
        id: t.id,
        tenderNumber: t.tender_number,
        title: t.title,
        submissionDeadline: t.submission_deadline,
        status: t.status,
        priority: t.priority,
        estimatedValue: t.estimated_value ? parseFloat(t.estimated_value) : undefined,
        currency: t.currency,
        companyName: t.company_name,
        categoryName: t.category_name,
      }));

      logger.info({
        message: 'Tenders found for alert type',
        alertType,
        daysUntilDeadline,
        count: tendersList.length,
        tenders: tendersList.map(t => ({
          id: t.id,
          tenderNumber: t.tenderNumber,
          title: t.title,
          deadline: t.submissionDeadline,
        })),
      });

      if (tendersList.length === 0) {
        logger.info({
          message: 'No tenders found for alert type',
          alertType,
          daysUntilDeadline,
        });
        return { sent: 0, failed: 0, tenders: [] };
      }

      // Notification type descriptions
      const notificationTypes: Record<string, string> = {
        days30: 'Early warning for upcoming tenders',
        days15: 'Mid-term reminder',
        days10: 'Preparation time reminder',
        days7: 'One week warning',
        days3: 'Final preparation alert',
        days2: 'Urgent reminder',
        days1: 'Final day alert',
        overdue: 'Daily alerts for overdue tenders',
      };

      const notificationType = notificationTypes[alertType] || alertType;
      let sent = 0;
      let failed = 0;

      // Send notifications for each tender
      for (const tender of tendersList) {
        if (!tender.submissionDeadline) continue;

        const deadline = new Date(tender.submissionDeadline);
        deadline.setHours(0, 0, 0, 0);
        const daysUntil = Math.floor(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        try {
          await this.sendTenderDeadlineEmail(
            recipients,
            tender,
            daysUntil,
            notificationType
          );
          sent++;
        } catch (error: any) {
          logger.error({
            message: 'Failed to send notification for tender',
            tenderId: tender.id,
            alertType,
            error: error.message,
          });
          failed++;
        }
      }

      return { sent, failed, tenders: tendersList };
    } catch (error: any) {
      logger.error({
        message: 'Error sending notifications for alert type',
        alertType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send deadline reminder emails
   */
  static async sendDeadlineReminders(): Promise<void> {
    try {
      const { recipients, schedule } = await this.getEmailAlertSettings();

      if (recipients.length === 0) {
        logger.info('No email recipients configured, skipping deadline reminders');
        return;
      }

      // Check if deleted_at column exists
      let deletedFilter = '';
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        if ((columnCheck as any[]).length > 0) {
          deletedFilter = 'AND t.deleted_at IS NULL';
        }
      } catch (e) {
        // Column doesn't exist, skip filter
      }

      // Get active tenders with upcoming deadlines
      const [tenders] = await db.query(
        `SELECT 
          t.id,
          t.tender_number,
          t.title,
          t.submission_deadline,
          t.status,
          c.company_name
         FROM tenders t
         LEFT JOIN companies c ON t.company_id = c.id
         WHERE t.submission_deadline IS NOT NULL
           AND t.status NOT IN ('Won', 'Lost', 'Cancelled')
           ${deletedFilter}
         ORDER BY t.submission_deadline ASC`
      );

      const tendersRaw = tenders as any[];
      
      // Transform snake_case to camelCase
      const tendersList: TenderWithDeadline[] = tendersRaw.map((t: any) => ({
        id: t.id,
        tenderNumber: t.tender_number,
        title: t.title,
        submissionDeadline: t.submission_deadline,
        status: t.status,
        companyName: t.company_name,
      }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const tender of tendersList) {
        if (!tender.submissionDeadline) continue;

        const deadline = new Date(tender.submissionDeadline);
        deadline.setHours(0, 0, 0, 0);
        const daysUntilDeadline = Math.floor(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        let shouldSend = false;
        let notificationType = '';

        // Check which notification to send based on days until deadline
        if (daysUntilDeadline === 30 && schedule.days30) {
          shouldSend = true;
          notificationType = 'Early warning for upcoming tenders';
        } else if (daysUntilDeadline === 15 && schedule.days15) {
          shouldSend = true;
          notificationType = 'Mid-term reminder';
        } else if (daysUntilDeadline === 10 && schedule.days10) {
          shouldSend = true;
          notificationType = 'Preparation time reminder';
        } else if (daysUntilDeadline === 7 && schedule.days7) {
          shouldSend = true;
          notificationType = 'One week warning';
        } else if (daysUntilDeadline === 3 && schedule.days3) {
          shouldSend = true;
          notificationType = 'Final preparation alert';
        } else if (daysUntilDeadline === 2 && schedule.days2) {
          shouldSend = true;
          notificationType = 'Urgent reminder';
        } else if (daysUntilDeadline === 1 && schedule.days1) {
          shouldSend = true;
          notificationType = 'Final day alert';
        } else if (daysUntilDeadline < 0 && schedule.overdue) {
          shouldSend = true;
          notificationType = 'Daily alerts for overdue tenders';
        }

        if (shouldSend) {
          await this.sendTenderDeadlineEmail(
            recipients,
            tender,
            daysUntilDeadline,
            notificationType
          );
        }
      }
    } catch (error: any) {
      logger.error({
        message: 'Error sending deadline reminders',
        error: error.message,
      });
    }
  }

  /**
   * Send email to recipients about tender deadline
   */
  static async sendTenderDeadlineEmail(
    recipients: string[],
    tender: TenderWithDeadline,
    daysUntilDeadline: number,
    notificationType: string
  ): Promise<void> {
    const deadlineDate = new Date(tender.submissionDeadline).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const subject = daysUntilDeadline < 0
      ? `⚠️ Overdue Tender: ${tender.tenderNumber} - ${tender.title}`
      : `📅 Tender Deadline Reminder: ${tender.tenderNumber} - ${tender.title}`;

    const daysText = daysUntilDeadline < 0
      ? `${Math.abs(daysUntilDeadline)} day(s) overdue`
      : daysUntilDeadline === 0
      ? 'Today'
      : `${daysUntilDeadline} day(s) remaining`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .tender-info { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4f46e5; }
          .deadline { font-size: 18px; font-weight: bold; color: ${daysUntilDeadline < 0 ? '#ef4444' : daysUntilDeadline <= 3 ? '#f59e0b' : '#059669'}; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${notificationType}</h2>
          </div>
          <div class="content">
            <p>Dear Team,</p>
            <p>This is a ${notificationType.toLowerCase()} for the following tender:</p>
            
            <div class="tender-info">
              <p><strong>Tender Number:</strong> ${tender.tenderNumber}</p>
              <p><strong>Title:</strong> ${tender.title}</p>
              ${tender.companyName ? `<p><strong>Client:</strong> ${tender.companyName}</p>` : ''}
              <p><strong>Status:</strong> ${tender.status}</p>
              <p class="deadline"><strong>Deadline:</strong> ${deadlineDate} (${daysText})</p>
            </div>

            <p>Please ensure all required documents and submissions are prepared and submitted before the deadline.</p>
            
            ${daysUntilDeadline < 0 ? '<p style="color: #ef4444;"><strong>⚠️ This tender is overdue. Please take immediate action.</strong></p>' : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from LeadTrack Pro</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
${notificationType}

Dear Team,

This is a ${notificationType.toLowerCase()} for the following tender:

Tender Number: ${tender.tenderNumber}
Title: ${tender.title}
${tender.companyName ? `Client: ${tender.companyName}\n` : ''}Status: ${tender.status}
Deadline: ${deadlineDate} (${daysText})

Please ensure all required documents and submissions are prepared and submitted before the deadline.

${daysUntilDeadline < 0 ? '⚠️ This tender is overdue. Please take immediate action.\n' : ''}

---
This is an automated notification from LeadTrack Pro
Please do not reply to this email
    `;

    // Send to all recipients
    for (const recipient of recipients) {
      try {
        await emailService.sendNotification(recipient, subject, textBody, htmlBody);
        logger.info({
          message: 'Tender deadline reminder sent',
          recipient,
          tenderId: tender.id,
          daysUntilDeadline,
          notificationType,
        });
      } catch (error: any) {
        logger.error({
          message: 'Failed to send tender deadline reminder',
          recipient,
          tenderId: tender.id,
          error: error.message,
        });
      }
    }
  }

  /**
   * Send test email for a specific notification type
   */
  static async sendTestEmail(
    recipients: string[],
    notificationType: string,
    daysUntilDeadline: number,
    testTender?: TenderWithDeadline
  ): Promise<void> {
    const tender = testTender || {
      id: 999,
      tenderNumber: 'TEST-2025-001',
      title: 'Test Tender for Notification Testing',
      submissionDeadline: new Date(Date.now() + daysUntilDeadline * 24 * 60 * 60 * 1000).toISOString(),
      status: 'Under Review',
      companyName: 'Test Company Ltd.',
    };

    await this.sendTenderDeadlineEmail(recipients, tender, daysUntilDeadline, notificationType);
  }

  /**
   * Get tenders by category with upcoming deadlines
   */
  static async getTendersByCategoryWithDeadlines(
    categoryId?: number,
    daysUntilDeadline?: number
  ): Promise<TenderWithDeadline[]> {
    try {
      // Check if deleted_at column exists
      let deletedFilter = '';
      try {
        const [columnCheck] = await db.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'tenders' 
           AND COLUMN_NAME = 'deleted_at'`
        );
        if ((columnCheck as any[]).length > 0) {
          deletedFilter = 'AND t.deleted_at IS NULL';
        }
      } catch (e) {
        // Column doesn't exist, skip filter
      }

      let query = `
        SELECT 
          t.id,
          t.tender_number,
          t.title,
          t.submission_deadline,
          t.status,
          t.priority,
          t.estimated_value,
          t.currency,
          c.company_name,
          tc.name as category_name
        FROM tenders t
        LEFT JOIN companies c ON t.company_id = c.id
        LEFT JOIN tender_categories tc ON t.category_id = tc.id
        WHERE t.submission_deadline IS NOT NULL
          AND t.status NOT IN ('Won', 'Lost', 'Cancelled')
          ${deletedFilter}
      `;

      const params: any[] = [];

      if (categoryId) {
        query += ' AND t.category_id = ?';
        params.push(categoryId);
      }

      if (daysUntilDeadline !== undefined) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysUntilDeadline);
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        query += ' AND DATE(t.submission_deadline) = DATE(?)';
        params.push(targetDate.toISOString());
      }

      query += ' ORDER BY t.submission_deadline ASC';

      const [tenders] = await db.query(query, params);
      const tendersRaw = tenders as any[];
      
      // Transform snake_case to camelCase
      return tendersRaw.map((t: any) => ({
        id: t.id,
        tenderNumber: t.tender_number,
        title: t.title,
        submissionDeadline: t.submission_deadline,
        status: t.status,
        priority: t.priority,
        estimatedValue: t.estimated_value ? parseFloat(t.estimated_value) : undefined,
        currency: t.currency,
        companyName: t.company_name,
        categoryName: t.category_name,
      }));
    } catch (error: any) {
      logger.error({
        message: 'Error getting tenders by category',
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Send category-based email alert with table of tenders
   */
  static async sendCategoryBasedAlert(
    recipients: string[],
    categoryName: string,
    categoryId: number,
    notificationType: string,
    daysUntilDeadline: number
  ): Promise<void> {
    const tenders = await this.getTendersByCategoryWithDeadlines(categoryId, daysUntilDeadline);

    if (tenders.length === 0) {
      logger.info({
        message: 'No tenders found for category alert',
        categoryId,
        categoryName,
        daysUntilDeadline,
      });
      return;
    }

    const subject = `📋 ${notificationType} - ${categoryName} Category`;

    // Format currency
    const formatCurrency = (value: number | undefined, currency: string = 'INR') => {
      if (!value) return 'N/A';
      if (currency === 'INR') {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value.toFixed(0)}`;
      }
      return `${currency} ${value.toLocaleString()}`;
    };

    // Build table rows
    const tableRows = tenders.map((tender) => {
      const deadlineDate = new Date(tender.submissionDeadline).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(tender.submissionDeadline);
      deadline.setHours(0, 0, 0, 0);
      const daysLeft = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      const daysText = daysLeft < 0
        ? `${Math.abs(daysLeft)} days overdue`
        : daysLeft === 0
        ? 'Today'
        : `${daysLeft} days left`;

      const priorityColor = tender.priority === 'Critical' ? '#ef4444' :
                            tender.priority === 'High' ? '#f59e0b' :
                            tender.priority === 'Medium' ? '#3b82f6' : '#6b7280';

      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
            <strong>${tender.tenderNumber}</strong><br>
            <span style="color: #6b7280; font-size: 12px;">${tender.title}</span>
          </td>
          <td style="padding: 12px; border-right: 1px solid #e5e7eb;">${tender.companyName || 'N/A'}</td>
          <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
            <span style="background-color: ${priorityColor}20; color: ${priorityColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
              ${tender.priority || 'Medium'}
            </span>
          </td>
          <td style="padding: 12px; border-right: 1px solid #e5e7eb;">${formatCurrency(tender.estimatedValue, tender.currency)}</td>
          <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
            <strong style="color: ${daysLeft < 0 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#059669'};">${deadlineDate}</strong><br>
            <span style="color: #6b7280; font-size: 12px;">${daysText}</span>
          </td>
          <td style="padding: 12px;">
            <span style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${tender.status}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .category-badge { display: inline-block; background-color: white; color: #4f46e5; padding: 8px 16px; border-radius: 20px; font-weight: 600; margin: 10px 0; }
          .tender-table { width: 100%; border-collapse: collapse; background-color: white; border-radius: 5px; overflow: hidden; margin: 20px 0; }
          .tender-table th { background-color: #4f46e5; color: white; padding: 12px; text-align: left; font-weight: 600; }
          .tender-table td { padding: 12px; }
          .summary { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4f46e5; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${notificationType}</h2>
            <div class="category-badge">${categoryName}</div>
          </div>
          <div class="content">
            <p>Dear Team,</p>
            <p>This is a ${notificationType.toLowerCase()} for tenders in the <strong>${categoryName}</strong> category.</p>
            
            <div class="summary">
              <p><strong>Total Tenders:</strong> ${tenders.length}</p>
              <p><strong>Category:</strong> ${categoryName}</p>
              <p><strong>Alert Type:</strong> ${notificationType}</p>
            </div>

            <h3 style="margin-top: 25px; margin-bottom: 15px;">Tenders Requiring Attention:</h3>
            <table class="tender-table">
              <thead>
                <tr>
                  <th>Tender Details</th>
                  <th>Client</th>
                  <th>Priority</th>
                  <th>Value</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>

            <p style="margin-top: 20px;">Please review these tenders and ensure all required documents and submissions are prepared and submitted before their respective deadlines.</p>
            
            ${tenders.some(t => {
              const deadline = new Date(t.submissionDeadline);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              deadline.setHours(0, 0, 0, 0);
              return deadline.getTime() < today.getTime();
            }) ? '<p style="color: #ef4444; margin-top: 15px;"><strong>⚠️ Some tenders in this category are overdue. Please take immediate action.</strong></p>' : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from LeadTrack Pro</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
${notificationType} - ${categoryName} Category

Dear Team,

This is a ${notificationType.toLowerCase()} for tenders in the ${categoryName} category.

Total Tenders: ${tenders.length}
Category: ${categoryName}
Alert Type: ${notificationType}

Tenders Requiring Attention:
${tenders.map((t, idx) => {
  const deadlineDate = new Date(t.submissionDeadline).toLocaleDateString('en-IN');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(t.submissionDeadline);
  deadline.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysText = daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Today' : `${daysLeft} days left`;
  
  return `
${idx + 1}. ${t.tenderNumber} - ${t.title}
   Client: ${t.companyName || 'N/A'}
   Priority: ${t.priority || 'Medium'}
   Value: ${formatCurrency(t.estimatedValue, t.currency)}
   Deadline: ${deadlineDate} (${daysText})
   Status: ${t.status}
`;
}).join('\n')}

Please review these tenders and ensure all required documents and submissions are prepared and submitted before their respective deadlines.

---
This is an automated notification from LeadTrack Pro
Please do not reply to this email
    `;

    // Send to all recipients
    for (const recipient of recipients) {
      try {
        await emailService.sendNotification(recipient, subject, textBody, htmlBody);
        logger.info({
          message: 'Category-based alert sent',
          recipient,
          categoryId,
          categoryName,
          notificationType,
          tendersCount: tenders.length,
        });
      } catch (error: any) {
        logger.error({
          message: 'Failed to send category-based alert',
          recipient,
          categoryId,
          categoryName,
          error: error.message,
        });
      }
    }
  }

  /**
   * Send custom alert
   */
  static async sendCustomAlert(
    recipients: string[],
    subject: string,
    message: string,
    categoryId?: number,
    daysUntilDeadline?: number
  ): Promise<void> {
    let tenders: TenderWithDeadline[] = [];
    
    if (categoryId !== undefined) {
      tenders = await this.getTendersByCategoryWithDeadlines(categoryId, daysUntilDeadline);
    } else if (daysUntilDeadline !== undefined) {
      tenders = await this.getTendersByCategoryWithDeadlines(undefined, daysUntilDeadline);
    }

    // Format currency
    const formatCurrency = (value: number | undefined, currency: string = 'INR') => {
      if (!value) return 'N/A';
      if (currency === 'INR') {
        if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
        if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
        if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
        return `₹${value.toFixed(0)}`;
      }
      return `${currency} ${value.toLocaleString()}`;
    };

    // Build table rows if tenders exist
    let tableRows = '';
    if (tenders.length > 0) {
      tableRows = tenders.map((tender) => {
        const deadlineDate = new Date(tender.submissionDeadline).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(tender.submissionDeadline);
        deadline.setHours(0, 0, 0, 0);
        const daysLeft = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        const daysText = daysLeft < 0
          ? `${Math.abs(daysLeft)} days overdue`
          : daysLeft === 0
          ? 'Today'
          : `${daysLeft} days left`;

        const priorityColor = tender.priority === 'Critical' ? '#ef4444' :
                              tender.priority === 'High' ? '#f59e0b' :
                              tender.priority === 'Medium' ? '#3b82f6' : '#6b7280';

        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
              <strong>${tender.tenderNumber}</strong><br>
              <span style="color: #6b7280; font-size: 12px;">${tender.title}</span>
            </td>
            <td style="padding: 12px; border-right: 1px solid #e5e7eb;">${tender.companyName || 'N/A'}</td>
            <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
              <span style="background-color: ${priorityColor}20; color: ${priorityColor}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                ${tender.priority || 'Medium'}
              </span>
            </td>
            <td style="padding: 12px; border-right: 1px solid #e5e7eb;">${formatCurrency(tender.estimatedValue, tender.currency)}</td>
            <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
              <strong style="color: ${daysLeft < 0 ? '#ef4444' : daysLeft <= 3 ? '#f59e0b' : '#059669'};">${deadlineDate}</strong><br>
              <span style="color: #6b7280; font-size: 12px;">${daysText}</span>
            </td>
            <td style="padding: 12px;">
              <span style="background-color: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${tender.status}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4f46e5; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .message { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4f46e5; }
          .tender-table { width: 100%; border-collapse: collapse; background-color: white; border-radius: 5px; overflow: hidden; margin: 20px 0; }
          .tender-table th { background-color: #4f46e5; color: white; padding: 12px; text-align: left; font-weight: 600; }
          .tender-table td { padding: 12px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${subject}</h2>
          </div>
          <div class="content">
            <p>Dear Team,</p>
            <div class="message">
              ${message.split('\n').map(line => `<p>${line}</p>`).join('')}
            </div>
            ${tenders.length > 0 ? `
              <h3 style="margin-top: 25px; margin-bottom: 15px;">Relevant Tenders (${tenders.length}):</h3>
              <table class="tender-table">
                <thead>
                  <tr>
                    <th>Tender Details</th>
                    <th>Client</th>
                    <th>Priority</th>
                    <th>Value</th>
                    <th>Deadline</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            ` : ''}
          </div>
          <div class="footer">
            <p>This is an automated notification from LeadTrack Pro</p>
            <p>Please do not reply to this email</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
${subject}

Dear Team,

${message}

${tenders.length > 0 ? `
Relevant Tenders (${tenders.length}):
${tenders.map((t, idx) => {
  const deadlineDate = new Date(t.submissionDeadline).toLocaleDateString('en-IN');
  return `
${idx + 1}. ${t.tenderNumber} - ${t.title}
   Client: ${t.companyName || 'N/A'}
   Priority: ${t.priority || 'Medium'}
   Value: ${formatCurrency(t.estimatedValue, t.currency)}
   Deadline: ${deadlineDate}
   Status: ${t.status}
`;
}).join('\n')}
` : ''}

---
This is an automated notification from LeadTrack Pro
Please do not reply to this email
    `;

    // Send to all recipients
    for (const recipient of recipients) {
      try {
        await emailService.sendNotification(recipient, subject, textBody, htmlBody);
        logger.info({
          message: 'Custom alert sent',
          recipient,
          subject,
          tendersCount: tenders.length,
        });
      } catch (error: any) {
        logger.error({
          message: 'Failed to send custom alert',
          recipient,
          subject,
          error: error.message,
        });
      }
    }
  }

  /**
   * Get notification preferences from system_config
   */
  static async getNotificationPreferences(): Promise<{
    emailNotifications: boolean;
    emailOnTenderCreated: boolean;
    emailOnTenderUpdated: boolean;
    emailOnTenderDeadline: boolean;
    emailOnTenderWon: boolean;
    emailOnTenderLost: boolean;
    desktopNotifications: boolean;
    desktopOnTenderCreated: boolean;
    desktopOnTenderUpdated: boolean;
    desktopOnTenderDeadline: boolean;
    desktopOnTenderWon: boolean;
    desktopOnTenderLost: boolean;
  }> {
    try {
      const [configs] = await db.query(
        `SELECT config_key, config_value FROM system_config 
         WHERE config_key IN (
           'email_notifications',
           'email_on_tender_created',
           'email_on_tender_updated',
           'email_on_tender_deadline',
           'email_on_tender_won',
           'email_on_tender_lost',
           'desktop_notifications',
           'desktop_on_tender_created',
           'desktop_on_tender_updated',
           'desktop_on_tender_deadline',
           'desktop_on_tender_won',
           'desktop_on_tender_lost'
         )`
      );

      const configMap: Record<string, string> = {};
      (configs as any[]).forEach((config: any) => {
        configMap[config.config_key] = config.config_value;
      });

      return {
        emailNotifications: configMap['email_notifications'] !== 'false',
        emailOnTenderCreated: configMap['email_on_tender_created'] !== 'false',
        emailOnTenderUpdated: configMap['email_on_tender_updated'] !== 'false',
        emailOnTenderDeadline: configMap['email_on_tender_deadline'] !== 'false',
        emailOnTenderWon: configMap['email_on_tender_won'] !== 'false',
        emailOnTenderLost: configMap['email_on_tender_lost'] !== 'false',
        desktopNotifications: configMap['desktop_notifications'] === 'true',
        desktopOnTenderCreated: configMap['desktop_on_tender_created'] !== 'false',
        desktopOnTenderUpdated: configMap['desktop_on_tender_updated'] !== 'false',
        desktopOnTenderDeadline: configMap['desktop_on_tender_deadline'] !== 'false',
        desktopOnTenderWon: configMap['desktop_on_tender_won'] !== 'false',
        desktopOnTenderLost: configMap['desktop_on_tender_lost'] !== 'false',
      };
    } catch (error: any) {
      logger.error({
        message: 'Error getting notification preferences',
        error: error.message,
      });
      // Return defaults
      return {
        emailNotifications: true,
        emailOnTenderCreated: true,
        emailOnTenderUpdated: true,
        emailOnTenderDeadline: true,
        emailOnTenderWon: true,
        emailOnTenderLost: true,
        desktopNotifications: false,
        desktopOnTenderCreated: true,
        desktopOnTenderUpdated: true,
        desktopOnTenderDeadline: true,
        desktopOnTenderWon: true,
        desktopOnTenderLost: true,
      };
    }
  }

  /**
   * Send tender update notification
   */
  static async sendTenderUpdateNotification(
    tender: any,
    changes: any,
    updatedBy: string
  ): Promise<{ emailSent: boolean; desktopNotification: boolean }> {
    try {
      const preferences = await this.getNotificationPreferences();
      
      // Check if email notifications are enabled for updates
      if (!preferences.emailNotifications || !preferences.emailOnTenderUpdated) {
        logger.info('Email notifications disabled for tender updates');
        return {
          emailSent: false,
          desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderUpdated,
        };
      }

      // Get recipients
      const { recipients } = await this.getEmailAlertSettings();
      
      if (recipients.length === 0) {
        logger.warn('No email recipients configured for tender update notification');
        return {
          emailSent: false,
          desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderUpdated,
        };
      }

      // Build change summary
      const changeSummary = Object.entries(changes)
        .map(([field, change]: [string, any]) => {
          const fieldName = field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return `${fieldName}: ${change.old || 'N/A'} → ${change.new || 'N/A'}`;
        })
        .join('\n');

      // Get company name from settings
      const companyName = await getCompanyName();
      
      const subject = `Tender Updated: ${tender.title || tender.tenderNumber}`;
      
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .tender-info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #4f46e5; }
            .changes { background-color: #fef3c7; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .change-item { padding: 5px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${companyName}</h1>
              <p>Tender Update Notification</p>
            </div>
            <div class="content">
              <h2>Tender Updated</h2>
              <div class="tender-info">
                <p><strong>Tender Number:</strong> ${tender.tenderNumber || 'N/A'}</p>
                <p><strong>Title:</strong> ${tender.title || 'N/A'}</p>
                <p><strong>Client:</strong> ${tender.client || 'N/A'}</p>
                <p><strong>Status:</strong> ${tender.status || 'N/A'}</p>
                <p><strong>Updated By:</strong> ${updatedBy}</p>
              </div>
              <div class="changes">
                <h3>Changes Made:</h3>
                <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${changeSummary}</pre>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated notification from ${companyName}.</p>
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textBody = `
${companyName} - Tender Update Notification

Tender Updated

Tender Number: ${tender.tenderNumber || 'N/A'}
Title: ${tender.title || 'N/A'}
Client: ${tender.client || 'N/A'}
Status: ${tender.status || 'N/A'}
Updated By: ${updatedBy}

Changes Made:
${changeSummary}

---
This is an automated notification from ${companyName}.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
      `;

      // Send to all recipients
      let emailSent = false;
      for (const recipient of recipients) {
        try {
          await emailService.sendNotification(recipient, subject, textBody, htmlBody);
          emailSent = true;
          logger.info({
            message: 'Tender update notification sent',
            recipient,
            tenderId: tender.id,
          });
        } catch (error: any) {
          logger.error({
            message: 'Failed to send tender update notification',
            recipient,
            tenderId: tender.id,
            error: error.message,
          });
        }
      }

      return {
        emailSent,
        desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderUpdated,
      };
    } catch (error: any) {
      logger.error({
        message: 'Error sending tender update notification',
        error: error.message,
      });
      return { emailSent: false, desktopNotification: false };
    }
  }

  /**
   * Send tender created notification
   */
  static async sendTenderCreatedNotification(
    tender: any,
    createdBy: string
  ): Promise<{ emailSent: boolean; desktopNotification: boolean }> {
    try {
      const preferences = await this.getNotificationPreferences();
      
      // Check if email notifications are enabled for creation
      if (!preferences.emailNotifications || !preferences.emailOnTenderCreated) {
        logger.info('Email notifications disabled for tender creation');
        return {
          emailSent: false,
          desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderCreated,
        };
      }

      // Get recipients
      const { recipients } = await this.getEmailAlertSettings();
      
      if (recipients.length === 0) {
        logger.warn('No email recipients configured for tender created notification');
        return {
          emailSent: false,
          desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderCreated,
        };
      }

      // Get company name from settings
      const companyName = await getCompanyName();
      
      const subject = `New Tender Created: ${tender.title || tender.tenderNumber}`;
      
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .tender-info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${companyName}</h1>
              <p>New Tender Created</p>
            </div>
            <div class="content">
              <h2>New Tender Has Been Created</h2>
              <div class="tender-info">
                <p><strong>Tender Number:</strong> ${tender.tenderNumber || 'N/A'}</p>
                <p><strong>Title:</strong> ${tender.title || 'N/A'}</p>
                <p><strong>Client:</strong> ${tender.client || 'N/A'}</p>
                <p><strong>Status:</strong> ${tender.status || 'N/A'}</p>
                <p><strong>Priority:</strong> ${tender.priority || 'N/A'}</p>
                ${tender.estimatedValue ? `<p><strong>Estimated Value:</strong> ${tender.currency || 'INR'} ${tender.estimatedValue.toLocaleString()}</p>` : ''}
                ${tender.submissionDeadline ? `<p><strong>Submission Deadline:</strong> ${new Date(tender.submissionDeadline).toLocaleDateString()}</p>` : ''}
                <p><strong>Created By:</strong> ${createdBy}</p>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated notification from ${companyName}.</p>
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textBody = `
${companyName} - New Tender Created

New Tender Has Been Created

Tender Number: ${tender.tenderNumber || 'N/A'}
Title: ${tender.title || 'N/A'}
Client: ${tender.client || 'N/A'}
Status: ${tender.status || 'N/A'}
Priority: ${tender.priority || 'N/A'}
${tender.estimatedValue ? `Estimated Value: ${tender.currency || 'INR'} ${tender.estimatedValue.toLocaleString()}\n` : ''}
${tender.submissionDeadline ? `Submission Deadline: ${new Date(tender.submissionDeadline).toLocaleDateString()}\n` : ''}
Created By: ${createdBy}

---
This is an automated notification from ${companyName}.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
      `;

      // Send to all recipients
      let emailSent = false;
      for (const recipient of recipients) {
        try {
          await emailService.sendNotification(recipient, subject, textBody, htmlBody);
          emailSent = true;
          logger.info({
            message: 'Tender created notification sent',
            recipient,
            tenderId: tender.id,
          });
        } catch (error: any) {
          logger.error({
            message: 'Failed to send tender created notification',
            recipient,
            tenderId: tender.id,
            error: error.message,
          });
        }
      }

      return {
        emailSent,
        desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderCreated,
      };
    } catch (error: any) {
      logger.error({
        message: 'Error sending tender created notification',
        error: error.message,
      });
      return { emailSent: false, desktopNotification: false };
    }
  }

  /**
   * Send worklog entry created notification
   */
  static async sendWorkLogCreatedNotification(
    tender: any,
    workLog: any,
    createdBy: string
  ): Promise<{ emailSent: boolean; desktopNotification: boolean }> {
    try {
      const preferences = await this.getNotificationPreferences();
      
      // Check if email notifications are enabled for worklog creation
      // For now, we'll use email_on_tender_updated as the setting for worklog notifications
      // You can add a specific setting later if needed
      if (!preferences.emailNotifications || !preferences.emailOnTenderUpdated) {
        logger.info('Email notifications disabled for worklog creation');
        return {
          emailSent: false,
          desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderUpdated,
        };
      }

      // Get recipients
      const { recipients } = await this.getEmailAlertSettings();
      
      if (recipients.length === 0) {
        logger.warn('No email recipients configured for worklog created notification');
        return {
          emailSent: false,
          desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderUpdated,
        };
      }

      // Get company name from settings
      const companyName = await getCompanyName();
      
      const subject = `Work Log Added: ${tender.title || tender.tenderNumber}`;
      
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .tender-info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            .worklog-info { background-color: #eff6ff; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${companyName}</h1>
              <p>Work Log Entry Added</p>
            </div>
            <div class="content">
              <h2>New Work Log Entry</h2>
              <div class="tender-info">
                <p><strong>Tender Number:</strong> ${tender.tenderNumber || 'N/A'}</p>
                <p><strong>Title:</strong> ${tender.title || 'N/A'}</p>
                <p><strong>Client:</strong> ${tender.client || 'N/A'}</p>
                <p><strong>Status:</strong> ${tender.status || 'N/A'}</p>
              </div>
              <div class="worklog-info">
                <p><strong>Work Log Entry:</strong></p>
                <p style="white-space: pre-wrap;">${workLog.description || 'N/A'}</p>
                <p><strong>Activity Type:</strong> ${workLog.activityType || 'Commented'}</p>
                <p><strong>Added By:</strong> ${createdBy}</p>
                <p><strong>Date:</strong> ${workLog.createdAt ? new Date(workLog.createdAt).toLocaleString() : 'N/A'}</p>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated notification from ${companyName}.</p>
              <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textBody = `
${companyName} - Work Log Entry Added

New Work Log Entry

Tender Number: ${tender.tenderNumber || 'N/A'}
Title: ${tender.title || 'N/A'}
Client: ${tender.client || 'N/A'}
Status: ${tender.status || 'N/A'}

Work Log Entry:
${workLog.description || 'N/A'}

Activity Type: ${workLog.activityType || 'Commented'}
Added By: ${createdBy}
Date: ${workLog.createdAt ? new Date(workLog.createdAt).toLocaleString() : 'N/A'}

---
This is an automated notification from ${companyName}.
© ${new Date().getFullYear()} ${companyName}. All rights reserved.
      `;

      // Send to all recipients
      let emailSent = false;
      for (const recipient of recipients) {
        try {
          await emailService.sendNotification(recipient, subject, textBody, htmlBody);
          emailSent = true;
          logger.info({
            message: 'Work log created notification sent',
            recipient,
            tenderId: tender.id,
            workLogId: workLog.id,
          });
        } catch (error: any) {
          logger.error({
            message: 'Failed to send work log created notification',
            recipient,
            tenderId: tender.id,
            workLogId: workLog.id,
            error: error.message,
          });
        }
      }

      return {
        emailSent,
        desktopNotification: preferences.desktopNotifications && preferences.desktopOnTenderUpdated,
      };
    } catch (error: any) {
      logger.error({
        message: 'Error sending work log created notification',
        error: error.message,
      });
      return { emailSent: false, desktopNotification: false };
    }
  }

  /**
   * Send lead created notification (alias for sendTenderCreatedNotification for backward compatibility)
   */
  static async sendLeadCreatedNotification(lead: any, createdBy: string): Promise<{ emailSent: boolean; desktopNotification: boolean }> {
    return this.sendTenderCreatedNotification(lead, createdBy);
  }

  /**
   * Send lead update notification (alias for sendTenderUpdateNotification for backward compatibility)
   */
  static async sendLeadUpdateNotification(lead: any, changes: any, updatedBy: string): Promise<{ emailSent: boolean; desktopNotification: boolean }> {
    return this.sendTenderUpdateNotification(lead, changes, updatedBy);
  }
}

