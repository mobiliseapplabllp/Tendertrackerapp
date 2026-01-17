import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';
import { NotificationService } from '../services/notificationService';
import { clearSettingsCache } from '../utils/settings';
import logger from '../utils/logger';

export class AdminController {
  /**
   * Get system configuration
   */
  static async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      const [configs] = await db.query(
        'SELECT * FROM system_config ORDER BY config_key ASC'
      );

      // Transform snake_case to camelCase for frontend
      const transformedConfigs = (configs as any[]).map((config: any) => ({
        id: config.id,
        configKey: config.config_key,
        configValue: config.config_value || '',
        configType: config.config_type,
        isEncrypted: config.is_encrypted === 1 || config.is_encrypted === true,
        description: config.description || null,
        updatedBy: config.updated_by,
        updatedAt: config.updated_at,
      }));

      res.json({
        success: true,
        data: transformedConfigs,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update system configuration (create or update)
   */
  static async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const { configKey, configValue, configType, description } = req.body;

      if (!configKey) {
        throw new CustomError('Config key is required', 400);
      }

      logger.info({
        message: 'Updating system config',
        configKey,
        configValue,
        configType,
        userId: req.user?.userId,
      });

      // Get existing config
      const [existing] = await db.query(
        'SELECT * FROM system_config WHERE config_key = ?',
        [configKey]
      );

      const existingArray = existing as any[];
      let oldValue: string | null = null;
      let configId: number;

      if (existingArray.length === 0) {
        // Create new config
        const configTypeValue = configType || 'string';
        logger.info({
          message: 'Creating new system config',
          configKey,
          configValue,
          configType: configTypeValue,
          userId: req.user!.userId,
        });
        
        const [result] = await db.query(
          `INSERT INTO system_config (config_key, config_value, config_type, description, updated_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            configKey,
            configValue,
            configTypeValue,
            description || null,
            req.user!.userId,
          ]
        );
        configId = (result as any).insertId;

        logger.info({
          message: 'System config created successfully',
          configKey,
          configId,
          createdBy: req.user!.userId,
        });

        // Clear settings cache to ensure fresh values are used immediately
        clearSettingsCache();
        logger.info({
          message: 'Settings cache cleared after config creation',
          configKey,
        });
      } else {
        // Update existing config
        oldValue = existingArray[0].config_value;
        configId = existingArray[0].id;

        const updateFields: string[] = ['config_value = ?', 'updated_by = ?', 'updated_at = NOW()'];
        const updateParams: any[] = [configValue, req.user!.userId];

        if (configType) {
          updateFields.push('config_type = ?');
          updateParams.push(configType);
        }

        if (description !== undefined) {
          updateFields.push('description = ?');
          updateParams.push(description);
        }

        updateParams.push(configKey);

        logger.info({
          message: 'Updating existing system config',
          configKey,
          oldValue,
          newValue: configValue,
          configType,
          userId: req.user!.userId,
        });

        await db.query(
          `UPDATE system_config 
           SET ${updateFields.join(', ')}
           WHERE config_key = ?`,
          updateParams
        );

        logger.info({
          message: 'System config updated successfully',
          configKey,
          configId,
        });

        // Clear settings cache to ensure fresh values are used immediately
        clearSettingsCache();
        logger.info({
          message: 'Settings cache cleared after config update',
          configKey,
        });

        // Log audit
        try {
          await db.query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, changes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              req.user!.userId,
              'UPDATE_CONFIG',
              'SystemConfig',
              configId,
              req.ip,
              req.get('user-agent') || '',
              JSON.stringify({ configKey, oldValue, newValue: configValue }),
            ]
          );
        } catch (auditError: any) {
          // Don't fail the request if audit logging fails
          logger.warn({
            message: 'Failed to log audit for config update',
            error: auditError.message,
            configKey,
          });
        }

        logger.info({
          message: 'System config updated',
          configKey,
          updatedBy: req.user!.userId,
        });
      }

      // Get updated/created config
      const [configs] = await db.query(
        'SELECT * FROM system_config WHERE config_key = ?',
        [configKey]
      );

      const savedConfig = (configs as any[])[0];
      
      logger.info({
        message: 'System config saved and retrieved',
        configKey,
        savedValue: savedConfig?.config_value,
        savedType: savedConfig?.config_type,
      });

      if (!savedConfig) {
        logger.error({
          message: 'Config was saved but could not be retrieved',
          configKey,
        });
        throw new CustomError('Config was saved but could not be retrieved', 500);
      }

      // Transform snake_case to camelCase for frontend
      const transformedConfig = {
        id: savedConfig.id,
        configKey: savedConfig.config_key,
        configValue: savedConfig.config_value || '',
        configType: savedConfig.config_type,
        isEncrypted: savedConfig.is_encrypted === 1 || savedConfig.is_encrypted === true,
        description: savedConfig.description || null,
        updatedBy: savedConfig.updated_by,
        updatedAt: savedConfig.updated_at,
      };

      res.json({
        success: true,
        data: transformedConfig,
      });
    } catch (error: any) {
      logger.error({
        message: 'Error updating system config',
        configKey: req.body.configKey,
        error: error.message,
        stack: error.stack,
      });
      next(error);
    }
  }

  /**
   * Test email configuration
   */
  static async testEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw new CustomError('Email address is required', 400);
      }

      const success = await emailService.testConfiguration(email);

      if (success) {
        res.json({
          success: true,
          data: {
            message: 'Test email sent successfully',
          },
        });
      } else {
        throw new CustomError('Failed to send test email. Check email configuration.', 500);
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Test SMS configuration
   */
  static async testSMS(req: Request, res: Response, next: NextFunction) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        throw new CustomError('Phone number is required', 400);
      }

      const success = await smsService.testConfiguration(phoneNumber);

      if (success) {
        res.json({
          success: true,
          data: {
            message: 'Test SMS sent successfully',
          },
        });
      } else {
        throw new CustomError('Failed to send test SMS. Check SMS configuration.', 500);
      }
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const userId = req.query.userId as string;
      const entityType = req.query.entityType as string;
      const action = req.query.action as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      const offset = (page - 1) * pageSize;
      let whereClause = '1=1';
      const params: any[] = [];

      if (userId) {
        whereClause += ' AND user_id = ?';
        params.push(userId);
      }

      if (entityType) {
        whereClause += ' AND entity_type = ?';
        params.push(entityType);
      }

      if (action) {
        whereClause += ' AND action = ?';
        params.push(action);
      }

      if (dateFrom) {
        whereClause += ' AND created_at >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        whereClause += ' AND created_at <= ?';
        params.push(dateTo);
      }

      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      const [logs] = await db.query(
        `SELECT 
          al.*,
          u.email as user_email, u.full_name as user_name
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: {
          data: logs,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get email alert settings
   */
  static async getEmailAlerts(_req: Request, res: Response, next: NextFunction) {
    try {
      // Get recipients from system_config
      const [recipientsConfig] = await db.query(
        "SELECT config_value FROM system_config WHERE config_key = 'email_alert_recipients'"
      );
      
      // Get notification schedule from system_config
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

      res.json({
        success: true,
        data: {
          recipients,
          schedule,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update email alert settings
   */
  static async updateEmailAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const { recipients, schedule } = req.body;

      // Update recipients
      const recipientsValue = JSON.stringify(recipients || []);
      const [existingRecipients] = await db.query(
        "SELECT * FROM system_config WHERE config_key = 'email_alert_recipients'"
      );
      
      if ((existingRecipients as any[]).length > 0) {
        await db.query(
          `UPDATE system_config 
           SET config_value = ?, updated_by = ?, updated_at = NOW()
           WHERE config_key = 'email_alert_recipients'`,
          [recipientsValue, (req as any).user?.userId || null]
        );
      } else {
        await db.query(
          `INSERT INTO system_config (config_key, config_value, config_type, updated_by)
           VALUES ('email_alert_recipients', ?, 'json', ?)`,
          [recipientsValue, (req as any).user?.userId || null]
        );
      }

      // Update schedule
      const scheduleValue = JSON.stringify(schedule || {});
      const [existingSchedule] = await db.query(
        "SELECT * FROM system_config WHERE config_key = 'email_alert_schedule'"
      );
      
      if ((existingSchedule as any[]).length > 0) {
        await db.query(
          `UPDATE system_config 
           SET config_value = ?, updated_by = ?, updated_at = NOW()
           WHERE config_key = 'email_alert_schedule'`,
          [scheduleValue, (req as any).user?.userId || null]
        );
      } else {
        await db.query(
          `INSERT INTO system_config (config_key, config_value, config_type, updated_by)
           VALUES ('email_alert_schedule', ?, 'json', ?)`,
          [scheduleValue, (req as any).user?.userId || null]
        );
      }

      logger.info({
        message: 'Email alert settings updated',
        updatedBy: req.user!.userId,
      });

      res.json({
        success: true,
        data: {
          message: 'Email alert settings saved successfully',
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send test notifications for all categories
   */
  static async sendTestNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { recipients } = await NotificationService.getEmailAlertSettings();

      if (recipients.length === 0) {
        throw new CustomError('No email recipients configured. Please add recipients in Email Alerts configuration page.', 400);
      }

      // Get all categories
      const [categories] = await db.query(
        `SELECT id, name FROM tender_categories WHERE is_active = TRUE ORDER BY name ASC`
      );
      const categoriesList = categories as any[];

      const results = [];

      // Send test emails for each notification type and category
      const testCases = [
        { type: 'Early warning for upcoming tenders', days: 30 },
        { type: 'Mid-term reminder', days: 15 },
        { type: 'Preparation time reminder', days: 10 },
        { type: 'One week warning', days: 7 },
        { type: 'Final preparation alert', days: 3 },
        { type: 'Urgent reminder', days: 2 },
        { type: 'Final day alert', days: 1 },
        { type: 'Daily alerts for overdue tenders', days: -5 },
      ];

      // Send category-based alerts
      for (const category of categoriesList) {
        for (const testCase of testCases) {
          try {
            await NotificationService.sendCategoryBasedAlert(
              recipients,
              category.name,
              category.id,
              testCase.type,
              testCase.days
            );
            results.push({
              category: category.name,
              type: testCase.type,
              days: testCase.days,
              status: 'success',
            });
          } catch (error: any) {
            results.push({
              category: category.name,
              type: testCase.type,
              days: testCase.days,
              status: 'failed',
              error: error.message,
            });
          }
        }
      }

      // Also send general test emails (without category filter)
      for (const testCase of testCases) {
        try {
          await NotificationService.sendTestEmail(
            recipients,
            testCase.type,
            testCase.days
          );
          results.push({
            category: 'All Categories',
            type: testCase.type,
            days: testCase.days,
            status: 'success',
          });
        } catch (error: any) {
          results.push({
            category: 'All Categories',
            type: testCase.type,
            days: testCase.days,
            status: 'failed',
            error: error.message,
          });
        }
      }

      logger.info({
        message: 'Test notifications sent',
        sentBy: req.user!.userId,
        results,
      });

      res.json({
        success: true,
        data: {
          message: 'Test notifications sent',
          recipients,
          results,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Run individual notification schedule
   */
  static async runNotificationSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { alertType } = req.body;

      if (!alertType) {
        throw new CustomError('Alert type is required', 400);
      }

      const validAlertTypes = ['days30', 'days15', 'days10', 'days7', 'days3', 'days2', 'days1', 'overdue'];
      if (!validAlertTypes.includes(alertType)) {
        throw new CustomError(`Invalid alert type. Must be one of: ${validAlertTypes.join(', ')}`, 400);
      }

      const { recipients } = await NotificationService.getEmailAlertSettings();

      if (recipients.length === 0) {
        throw new CustomError('No email recipients configured. Please add recipients in Email Alerts configuration page.', 400);
      }

      const result = await NotificationService.sendNotificationForAlertType(alertType);

      logger.info({
        message: 'Notification schedule run manually',
        alertType,
        sentBy: req.user!.userId,
        sent: result.sent,
        failed: result.failed,
        tendersCount: result.tenders.length,
      });

      res.json({
        success: true,
        data: {
          message: `Notification schedule executed for ${alertType}`,
          alertType,
          recipients,
          sent: result.sent,
          failed: result.failed,
          tendersCount: result.tenders.length,
          tenders: result.tenders,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send custom alert
   */
  static async sendCustomAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, message, categoryId, daysUntilDeadline } = req.body;

      if (!subject || !message) {
        throw new CustomError('Subject and message are required', 400);
      }

      const { recipients } = await NotificationService.getEmailAlertSettings();

      if (recipients.length === 0) {
        throw new CustomError('No email recipients configured. Please add recipients in Email Alerts configuration page.', 400);
      }

      await NotificationService.sendCustomAlert(
        recipients,
        subject,
        message,
        categoryId,
        daysUntilDeadline
      );

      logger.info({
        message: 'Custom alert sent',
        sentBy: req.user!.userId,
        subject,
        categoryId,
        daysUntilDeadline,
      });

      res.json({
        success: true,
        data: {
          message: 'Custom alert sent successfully',
          recipients,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }
}

