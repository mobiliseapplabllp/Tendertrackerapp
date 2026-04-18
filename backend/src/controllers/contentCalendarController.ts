import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { AIService } from '../services/aiService';
import { getCompanyName } from '../utils/settings';
import logger from '../utils/logger';

export class ContentCalendarController {

  /**
   * Get calendar events filtered by date range, channel, and status
   */
  static async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      const channel = req.query.channel as string;
      const status = req.query.status as string;

      let whereClause = '1=1';
      const params: any[] = [];

      if (startDate) {
        whereClause += ' AND ce.scheduled_date >= ?';
        params.push(startDate);
      }

      if (endDate) {
        whereClause += ' AND ce.scheduled_date <= ?';
        params.push(endDate);
      }

      if (channel) {
        whereClause += ' AND ce.channel = ?';
        params.push(channel);
      }

      if (status) {
        whereClause += ' AND ce.status = ?';
        params.push(status);
      }

      const [events] = await db.query(
        `SELECT ce.*, mc.name as campaign_name
         FROM marketing_content_calendar ce
         LEFT JOIN marketing_campaigns mc ON mc.id = ce.campaign_id
         WHERE ${whereClause}
         ORDER BY ce.scheduled_date ASC`,
        params
      );

      res.json({ success: true, data: events });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a content calendar event
   */
  static async createEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        title, content_type, channel, scheduled_date,
        status, campaign_id, content, ai_generated,
      } = req.body;

      if (!title || !scheduled_date) {
        throw new CustomError('title and scheduled_date are required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO marketing_content_calendar
         (title, content_type, channel, scheduled_date, status, campaign_id, content, ai_generated, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, content_type || 'social_post', channel || null, scheduled_date,
          status || 'idea', campaign_id || null,
          content || null, ai_generated || false, req.user!.userId,
        ]
      );

      const insertId = (result as any).insertId;
      const [newEvent] = await db.query('SELECT * FROM marketing_content_calendar WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newEvent as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a content calendar event (supports drag-drop reschedule)
   */
  static async updateEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const allowedFields = [
        'title', 'content_type', 'channel', 'scheduled_date',
        'status', 'campaign_id', 'content', 'ai_generated',
      ];

      const updates: string[] = [];
      const params: any[] = [];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(req.body[field]);
        }
      }

      if (updates.length === 0) {
        throw new CustomError('No valid fields to update', 400);
      }

      params.push(id);

      const [result] = await db.query(
        `UPDATE marketing_content_calendar SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Event not found', 404);
      }

      const [updated] = await db.query('SELECT * FROM marketing_content_calendar WHERE id = ?', [id]);
      res.json({ success: true, data: (updated as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete a content calendar event
   */
  static async deleteEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [result] = await db.query(
        'DELETE FROM marketing_content_calendar WHERE id = ?',
        [id]
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Event not found', 404);
      }

      res.json({ success: true, message: 'Event deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== AI ====================

  /**
   * AI-suggest optimal posting schedule across channels
   */
  static async aiSuggestSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { contentTypes, channels, startDate, endDate, campaignName, targetAudience, industry } = req.body;

      if (!startDate || !endDate) {
        throw new CustomError('startDate and endDate are required', 400);
      }

      const config = await AIService.getDefaultConfig();
      const companyName = await getCompanyName();

      // Fetch existing scheduled content to avoid conflicts
      let existingContentSummary = '';
      try {
        const [existingEvents] = await db.query(
          `SELECT channel, scheduled_date, title FROM marketing_content_calendar
           WHERE scheduled_date BETWEEN ? AND ? AND status != 'cancelled'
           ORDER BY scheduled_date ASC LIMIT 30`,
          [startDate, endDate]
        );
        const events = existingEvents as any[];
        if (events.length > 0) {
          existingContentSummary = events.map(e => `${e.scheduled_date} - ${e.channel}: ${e.title}`).join('\n');
        }
      } catch { /* ignore if table doesn't exist */ }

      const channelList = channels && channels.length > 0 ? channels.join(', ') : 'linkedin, twitter, email, instagram';
      const contentTypeList = contentTypes && contentTypes.length > 0 ? contentTypes.join(', ') : 'blog posts, social media posts, emails';

      const systemPrompt = `You are a senior content strategist at ${companyName}, specializing in B2B marketing content scheduling and optimization. You create data-driven content calendars that maximize engagement and reach for each specific platform. Return your response as valid JSON only, with no markdown formatting or code blocks.`;

      const userPrompt = `Create an optimal content posting schedule for ${companyName} with these details:

COMPANY: ${companyName}
${campaignName ? `CAMPAIGN: ${campaignName}` : ''}
TARGET AUDIENCE: ${targetAudience || 'B2B decision-makers and business professionals'}
${industry ? `INDUSTRY: ${industry}` : ''}
CONTENT TYPES: ${contentTypeList}
CHANNELS: ${channelList}
DATE RANGE: ${startDate} to ${endDate}
${existingContentSummary ? `\nALREADY SCHEDULED CONTENT (avoid conflicts):\n${existingContentSummary}` : ''}

SCHEDULING RULES:
- LinkedIn: Best engagement Tue-Thu, 8-10am and 12-1pm. Avoid weekends. 3-5 posts/week max.
- Twitter: More frequent posting OK, 3-5 tweets/day. Peak hours 9am, 12pm, 5pm. Weekdays preferred.
- Instagram: Best engagement Mon-Fri, 11am-1pm and 7-9pm. 1-2 posts/day max.
- Facebook: Best engagement Wed-Fri, 1-4pm. 1-2 posts/day max.
- Email: Best open rates Tue-Thu, 9-11am. Max 1-2 per week to avoid fatigue.
- Space content evenly across the date range -- do not cluster everything on the same days
- Avoid scheduling conflicting content on the same channel at the same time
${existingContentSummary ? '- Do NOT schedule on dates/channels that already have content listed above' : ''}

Return a JSON object with this structure:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "channel": "string",
      "contentType": "string",
      "suggestedTopic": "string (brief topic suggestion relevant to ${companyName}${campaignName ? ' and the ' + campaignName + ' campaign' : ''})",
      "rationale": "string (brief reason for this time slot)"
    }
  ],
  "generalTips": ["string (actionable tips specific to ${companyName}'s channels and audience)"],
  "bestTimesPerChannel": {
    "channelName": {
      "bestDays": ["string"],
      "bestTimes": ["string"],
      "frequencyPerWeek": number
    }
  }
}

Return ONLY the JSON object, no other text.`;

      const aiResponse = await AIService.callProvider(config, userPrompt, systemPrompt);

      let parsed;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
      } catch {
        parsed = { rawSuggestion: aiResponse };
      }

      res.json({ success: true, data: parsed });
    } catch (error: any) {
      logger.error({ message: 'AI schedule suggestion failed', error: error.message });
      next(error);
    }
  }
}
