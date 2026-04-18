import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';

export class MarketingAnalyticsController {

  /**
   * Get marketing overview stats
   */
  static async getOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      // Total campaigns by status
      const [campaignStats] = await db.query(
        `SELECT
           COUNT(*) as total_campaigns,
           SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_campaigns,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_campaigns,
           SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_campaigns,
           COALESCE(SUM(budget), 0) as total_budget
         FROM marketing_campaigns
         WHERE deleted_at IS NULL`
      );

      // Engagement summary by channel type
      const [channelStats] = await db.query(
        `SELECT
           mcc.channel,
           COUNT(*) as total_posts,
           SUM(CASE WHEN mcc.status = 'published' THEN 1 ELSE 0 END) as published_count,
           SUM(CASE WHEN mcc.status = 'scheduled' THEN 1 ELSE 0 END) as scheduled_count
         FROM marketing_campaign_channels mcc
         JOIN marketing_campaigns mc ON mc.id = mcc.campaign_id AND mc.deleted_at IS NULL
         GROUP BY mcc.channel`
      );

      // Recent analytics entries
      const [recentAnalytics] = await db.query(
        `SELECT ma.*, mc.name as campaign_name
         FROM marketing_analytics ma
         LEFT JOIN marketing_campaigns mc ON mc.id = ma.campaign_id
         ORDER BY ma.recorded_at DESC
         LIMIT 10`
      );

      res.json({
        success: true,
        data: {
          campaigns: (campaignStats as any[])[0],
          channelBreakdown: channelStats,
          recentAnalytics,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get analytics for a specific campaign by channel
   */
  static async getCampaignAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { campaignId } = req.params;

      // Verify campaign exists
      const [campaigns] = await db.query(
        'SELECT id, name, status, budget FROM marketing_campaigns WHERE id = ? AND deleted_at IS NULL',
        [campaignId]
      );

      const campaign = (campaigns as any[])[0];
      if (!campaign) {
        throw new CustomError('Campaign not found', 404);
      }

      // Channel-level metrics
      const [channels] = await db.query(
        `SELECT id, channel, status, engagement_metrics, scheduled_at, updated_at
         FROM marketing_campaign_channels
         WHERE campaign_id = ?
         ORDER BY created_at ASC`,
        [campaignId]
      );

      // Analytics records for this campaign
      const [analytics] = await db.query(
        `SELECT * FROM marketing_analytics
         WHERE campaign_id = ?
         ORDER BY recorded_at DESC`,
        [campaignId]
      );

      res.json({
        success: true,
        data: {
          campaign,
          channels,
          analytics,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Record a marketing metric/analytics entry
   */
  static async recordMetric(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        campaign_id, channel, metric_type, metric_value,
      } = req.body;

      if (!metric_type) {
        throw new CustomError('metric_type is required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO marketing_analytics
         (campaign_id, channel, metric_type, metric_value)
         VALUES (?, ?, ?, ?)`,
        [
          campaign_id || null,
          channel || null,
          metric_type,
          metric_value || 0,
        ]
      );

      const insertId = (result as any).insertId;
      const [newMetric] = await db.query('SELECT * FROM marketing_analytics WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newMetric as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }
}
