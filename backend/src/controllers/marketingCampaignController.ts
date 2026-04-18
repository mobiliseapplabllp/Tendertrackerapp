import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { AIService } from '../services/aiService';
import { getCompanyName } from '../utils/settings';
import logger from '../utils/logger';
import { CampaignPublishingService } from '../services/campaignPublishingService';

export class MarketingCampaignController {

  // ==================== CAMPAIGNS CRUD ====================

  /**
   * Get all campaigns with pagination, filtering, and joined data
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const status = req.query.status as string;
      const type = req.query.type as string;
      const search = req.query.search as string;
      const offset = (page - 1) * pageSize;

      let whereClause = 'mc.deleted_at IS NULL';
      const params: any[] = [];

      if (status) {
        whereClause += ' AND mc.status = ?';
        params.push(status);
      }

      if (type) {
        whereClause += ' AND mc.type = ?';
        params.push(type);
      }

      if (search) {
        whereClause += ' AND (mc.name LIKE ? OR mc.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      // Count total
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM marketing_campaigns mc WHERE ${whereClause}`,
        params
      );
      const total = (countResult as any[])[0].total;

      // Fetch campaigns with audience segment name and channel count
      const [campaigns] = await db.query(
        `SELECT mc.*,
                seg.name as segment_name,
                (SELECT COUNT(*) FROM marketing_campaign_channels mcc WHERE mcc.campaign_id = mc.id) as channel_count
         FROM marketing_campaigns mc
         LEFT JOIN audience_segments seg ON seg.id = mc.target_audience_id
         WHERE ${whereClause}
         ORDER BY mc.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );

      res.json({
        success: true,
        data: campaigns,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get a single campaign with all its channels
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [campaigns] = await db.query(
        `SELECT mc.*,
                seg.name as segment_name
         FROM marketing_campaigns mc
         LEFT JOIN audience_segments seg ON seg.id = mc.target_audience_id
         WHERE mc.id = ? AND mc.deleted_at IS NULL`,
        [id]
      );

      const campaign = (campaigns as any[])[0];
      if (!campaign) {
        throw new CustomError('Campaign not found', 404);
      }

      // Fetch channels for this campaign
      const [channels] = await db.query(
        `SELECT * FROM marketing_campaign_channels WHERE campaign_id = ? ORDER BY created_at ASC`,
        [id]
      );

      campaign.channels = channels;

      res.json({ success: true, data: campaign });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a new campaign
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name, description, type, status, target_audience_id,
        budget, start_date, end_date,
      } = req.body;

      const userId = req.user!.userId;

      const [result] = await db.query(
        `INSERT INTO marketing_campaigns
         (name, description, type, status, target_audience_id, budget, start_date, end_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name, description || null, type || 'email', status || 'draft',
          target_audience_id || null, budget || null,
          start_date || null, end_date || null,
          userId,
        ]
      );

      const insertId = (result as any).insertId;
      const [newCampaign] = await db.query('SELECT * FROM marketing_campaigns WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newCampaign as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a campaign (dynamic fields)
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const allowedFields = [
        'name', 'description', 'type', 'status', 'target_audience_id',
        'budget', 'start_date', 'end_date',
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

      await db.query(
        `UPDATE marketing_campaigns SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        params
      );

      const [updated] = await db.query('SELECT * FROM marketing_campaigns WHERE id = ?', [id]);
      const campaign = (updated as any[])[0];
      if (!campaign) {
        throw new CustomError('Campaign not found', 404);
      }

      res.json({ success: true, data: campaign });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Soft delete a campaign
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [result] = await db.query(
        `UPDATE marketing_campaigns SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL`,
        [id]
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Campaign not found', 404);
      }

      res.json({ success: true, message: 'Campaign deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== ACTIVATE ====================

  /**
   * Activate a campaign -- publish immediate channels, schedule future ones
   */
  static async activateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify campaign exists and is not already active
      const [campaigns] = await db.query(
        'SELECT * FROM marketing_campaigns WHERE id = ? AND deleted_at IS NULL', [id]
      );
      if ((campaigns as any[]).length === 0) throw new CustomError('Campaign not found', 404);

      // Get all channels for this campaign
      const [channels] = await db.query(
        'SELECT * FROM marketing_campaign_channels WHERE campaign_id = ?', [id]
      );
      const channelList = channels as any[];

      if (channelList.length === 0) {
        throw new CustomError('Campaign has no channels. Add at least one channel before activating.', 400);
      }

      // Update campaign status to active
      await db.query('UPDATE marketing_campaigns SET status = ?, updated_at = NOW() WHERE id = ?', ['active', id]);

      const results: any[] = [];

      for (const channel of channelList) {
        const scheduledAt = channel.scheduled_at ? new Date(channel.scheduled_at) : null;
        const now = new Date();

        if (scheduledAt && scheduledAt > now) {
          // Future schedule -- mark as scheduled
          await db.query(
            'UPDATE marketing_campaign_channels SET status = ?, updated_at = NOW() WHERE id = ?',
            ['scheduled', channel.id]
          );
          results.push({
            channelId: channel.id,
            channel: channel.channel,
            action: 'scheduled',
            scheduledAt: channel.scheduled_at,
            message: `Scheduled for ${channel.scheduled_at}`,
          });
        } else {
          // No schedule or past schedule -- publish immediately
          try {
            const publishResult = await CampaignPublishingService.publishChannel(channel);
            results.push({
              channelId: channel.id,
              channel: channel.channel,
              action: publishResult.success ? 'published' : 'failed',
              externalPostId: publishResult.externalPostId,
              error: publishResult.error,
              message: publishResult.success ? 'Published successfully' : `Failed: ${publishResult.error}`,
            });
          } catch (err: any) {
            results.push({
              channelId: channel.id,
              channel: channel.channel,
              action: 'failed',
              error: err.message,
              message: `Failed: ${err.message}`,
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          campaignId: id,
          campaignStatus: 'active',
          channelResults: results,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== CHANNELS ====================

  /**
   * Add a channel to a campaign
   */
  static async addChannel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { channel_type, channel: channelField, content, post_content, subject_line, scheduled_at, status } = req.body;
      const channelValue = channel_type || channelField;
      const contentValue = content || post_content || subject_line || null;

      if (!channelValue) {
        throw new CustomError('channel is required', 400);
      }

      // Verify campaign exists
      const [campaigns] = await db.query(
        'SELECT id FROM marketing_campaigns WHERE id = ? AND deleted_at IS NULL',
        [id]
      );
      if ((campaigns as any[]).length === 0) {
        throw new CustomError('Campaign not found', 404);
      }

      const [result] = await db.query(
        `INSERT INTO marketing_campaign_channels
         (campaign_id, channel, post_content, scheduled_at, status)
         VALUES (?, ?, ?, ?, ?)`,
        [id, channelValue, contentValue, scheduled_at || null, status || 'draft']
      );

      const insertId = (result as any).insertId;
      const [newChannel] = await db.query('SELECT * FROM marketing_campaign_channels WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newChannel as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a channel
   */
  static async updateChannel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, channelId } = req.params;
      // Map frontend field names to actual DB column names
      const fieldMapping: Record<string, string> = {
        channel_type: 'channel',
        channel: 'channel',
        content: 'post_content',
        post_content: 'post_content',
        scheduled_at: 'scheduled_at',
        status: 'status',
        engagement_metrics: 'engagement_metrics',
      };

      const updates: string[] = [];
      const params: any[] = [];

      for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
        if (req.body[bodyField] !== undefined) {
          // Avoid duplicating the same DB column if both aliases are present
          const alreadyAdded = updates.some(u => u.startsWith(`${dbColumn} = `));
          if (alreadyAdded) continue;
          updates.push(`${dbColumn} = ?`);
          const value = bodyField === 'engagement_metrics' && typeof req.body[bodyField] === 'object'
            ? JSON.stringify(req.body[bodyField])
            : req.body[bodyField];
          params.push(value);
        }
      }

      if (updates.length === 0) {
        throw new CustomError('No valid fields to update', 400);
      }

      params.push(channelId, id);

      const [result] = await db.query(
        `UPDATE marketing_campaign_channels SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND campaign_id = ?`,
        params
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Channel not found', 404);
      }

      const [updated] = await db.query('SELECT * FROM marketing_campaign_channels WHERE id = ?', [channelId]);
      res.json({ success: true, data: (updated as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Remove a channel from a campaign
   */
  static async removeChannel(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, channelId } = req.params;

      const [result] = await db.query(
        'DELETE FROM marketing_campaign_channels WHERE id = ? AND campaign_id = ?',
        [channelId, id]
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Channel not found', 404);
      }

      res.json({ success: true, message: 'Channel removed successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== AI ====================

  /**
   * AI-generate a full multi-channel campaign
   */
  static async aiGenerateCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { productName, goal, targetAudience, channels, productDescription, budget, duration } = req.body;

      if (!productName || !goal) {
        throw new CustomError('productName and goal are required', 400);
      }

      const config = await AIService.getDefaultConfig();
      const companyName = await getCompanyName();
      const channelList = channels && channels.length > 0 ? channels.join(', ') : 'email, linkedin, twitter';

      const systemPrompt = `You are a senior marketing strategist at ${companyName}. You create high-performing, multi-channel marketing campaigns that are specific to the product/service being promoted. Every piece of content you generate MUST directly reference and promote the specific product -- never generic marketing filler. Return your response as valid JSON only, with no markdown formatting or code blocks.`;

      const userPrompt = `Generate a complete multi-channel marketing campaign for ${companyName} with these EXACT details:

COMPANY: ${companyName}
PRODUCT/SERVICE: ${productName}
${productDescription ? `PRODUCT DESCRIPTION: ${productDescription}` : ''}
CAMPAIGN GOAL: ${goal}
TARGET AUDIENCE: ${targetAudience || 'B2B decision-makers and business professionals'}
CHANNELS: ${channelList}
${budget ? `BUDGET: INR ${budget}` : ''}
${duration ? `CAMPAIGN DURATION: ${duration}` : ''}

CHANNEL-SPECIFIC REQUIREMENTS:
- Email: Compelling subject line mentioning "${productName}". Body should be 200-300 words with greeting, value proposition, 2-3 benefits, CTA. HTML formatted with inline styles.
- LinkedIn: Professional thought-leadership post (max 1300 chars). Hook in first line. Include specific benefits/stats about "${productName}". End with CTA and 3-5 hashtags.
- Twitter: Punchy tweet (max 280 chars) that grabs attention and mentions "${productName}" specifically. Include 2-3 relevant hashtags.
- Instagram: Engaging caption with hook, story, emojis, CTA. 15-20 hashtags including "${productName}"-specific ones.
- Facebook: Conversational, community-focused post (300-500 chars). Include CTA and 3-5 hashtags.

CRITICAL RULES:
- Every piece of content MUST mention "${productName}" by name and describe its specific benefits
- Do NOT write generic marketing content -- every sentence must be about "${productName}"
- All content must sound like it comes from ${companyName}
- Tailor messaging to: ${targetAudience || 'B2B decision-makers'}
- Include specific value propositions, not vague claims

Return a JSON object with this exact structure:
{
  "campaignName": "string (specific to ${productName}, not generic)",
  "campaignDescription": "string (2-3 sentences describing this campaign for ${productName})",
  "channels": {
    "email": {
      "subject": "string (must mention ${productName})",
      "body": "string (HTML formatted, 200-300 words about ${productName})"
    },
    "linkedin": {
      "post": "string (max 1300 chars, about ${productName})",
      "hashtags": ["string"]
    },
    "twitter": {
      "post": "string (max 280 chars, about ${productName})",
      "hashtags": ["string"]
    },
    "instagram": {
      "caption": "string (about ${productName})",
      "hashtags": ["string"]
    },
    "facebook": {
      "post": "string (about ${productName})",
      "hashtags": ["string"]
    }
  },
  "suggestedSchedule": {
    "bestDays": ["string"],
    "bestTimes": ["string"],
    "frequencyPerWeek": number
  }
}

Only include channels that were requested: ${channelList}. Return ONLY the JSON object, no other text.`;

      const aiResponse = await AIService.callProvider(config, userPrompt, systemPrompt);

      // Attempt to parse JSON from the response
      let parsed;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
      } catch {
        parsed = { rawContent: aiResponse };
      }

      res.json({ success: true, data: parsed });
    } catch (error: any) {
      logger.error({ message: 'AI campaign generation failed', error: error.message });
      next(error);
    }
  }

  /**
   * AI-generate content for a single channel
   */
  static async aiGenerateContent(req: Request, res: Response, next: NextFunction) {
    try {
      const { channel, channel_type, topic, tone, context, campaign_name, campaign_description, campaign_type, target_audience, budget, start_date, end_date } = req.body;

      const channelName = channel || channel_type || 'general';
      const contentTopic = topic || campaign_name || 'marketing content';
      const additionalContext = context || campaign_description || '';
      const audience = target_audience || 'business professionals';

      const config = await AIService.getDefaultConfig();
      const companyName = await getCompanyName();

      // Channel-specific guidance
      const channelGuidance: Record<string, string> = {
        email: `Write a professional email from ${companyName} with a compelling subject line mentioning "${contentTopic}". Include a personalized greeting, clear value proposition with specific benefits, 2-3 data points or outcomes, and a strong call-to-action. Keep it concise (200-300 words). Use HTML with inline styles.`,
        linkedin: `Write a professional LinkedIn post from ${companyName} (max 1300 chars). Start with a hook that stops the scroll. Include specific data/stats about "${contentTopic}". Use line breaks for readability. End with a CTA and 3-5 specific hashtags. Tone: thought leadership.`,
        facebook: `Write an engaging Facebook post from ${companyName} (max 500 chars). Be conversational and community-oriented. Use 1-2 emojis. Include a clear CTA related to "${contentTopic}". Add 3-5 relevant hashtags.`,
        twitter: `Write a concise tweet from ${companyName} (max 280 chars). Be punchy and attention-grabbing. Mention "${contentTopic}" explicitly. Include 2-3 specific hashtags.`,
        instagram: `Write an Instagram caption from ${companyName}. Start with a hook, tell a mini-story about "${contentTopic}", use emojis strategically, end with CTA and 15-20 relevant hashtags in a separate block.`,
        youtube: `Write a YouTube video description for ${companyName} (200-300 words) about "${contentTopic}". Start with a summary, include key points, timestamps format, relevant tags, and CTAs.`,
      };

      const guidance = channelGuidance[channelName.toLowerCase()] || `Write professional marketing content from ${companyName} about "${contentTopic}".`;

      const systemPrompt = `You are a senior ${channelName} marketing content creator at ${companyName}. You MUST write content that is specifically and directly about the product/campaign described. Do NOT generate generic content. Every sentence must relate to the specific product "${contentTopic}" and campaign goal provided. Return your response as valid JSON only, with no markdown formatting or code blocks.`;

      const userPrompt = `Generate ${channelName} marketing content for ${companyName} with these EXACT details:

COMPANY: ${companyName}
CAMPAIGN: ${contentTopic}
PRODUCT/SERVICE DESCRIPTION: ${additionalContext || contentTopic}
CAMPAIGN TYPE: ${campaign_type || 'multi-channel'}
TARGET AUDIENCE: ${audience}
TONE: ${tone || 'professional'}
${budget ? `BUDGET: INR ${budget}` : ''}
${start_date ? `CAMPAIGN PERIOD: ${start_date}${end_date ? ' to ' + end_date : ''}` : ''}

CHANNEL-SPECIFIC GUIDANCE: ${guidance}

CRITICAL INSTRUCTIONS:
- Content MUST be specifically about "${contentTopic}" -- mention the product/service by name
- Reference the specific value proposition from the description
- All content must sound like it comes from ${companyName}
- Tailor messaging to the target audience: ${audience}
- Do NOT write generic marketing content -- every line must be relevant to "${contentTopic}"
- For email: use HTML with inline styles for formatting. Subject line MUST mention "${contentTopic}" and ${companyName}
- For LinkedIn, Twitter, Facebook, Instagram: use PLAIN TEXT only (no HTML tags). Use line breaks, bullet points with dashes, and emojis where appropriate

Return a JSON object with this structure:
{
  "content": "string (the main content body -- specific to ${contentTopic} from ${companyName})",
  "subject": "string (compelling subject line mentioning ${contentTopic} -- for email channel)",
  "hashtags": ["string (relevant, specific hashtags -- for social media channels)"],
  "callToAction": "string (specific CTA related to ${contentTopic})"
}

Return ONLY the JSON object, no other text.`;

      const aiResponse = await AIService.callProvider(config, userPrompt, systemPrompt);

      let parsed;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
      } catch {
        parsed = { content: aiResponse };
      }

      res.json({ success: true, data: parsed });
    } catch (error: any) {
      logger.error({ message: 'AI content generation failed', error: error.message });
      next(error);
    }
  }

  // ==================== DASHBOARD ====================

  /**
   * Get marketing campaign dashboard stats
   */
  static async getDashboardStats(_req: Request, res: Response, next: NextFunction) {
    try {
      // Total campaigns
      const [totalResult] = await db.query(
        'SELECT COUNT(*) as total FROM marketing_campaigns WHERE deleted_at IS NULL'
      );

      // By status
      const [byStatus] = await db.query(
        `SELECT status, COUNT(*) as count
         FROM marketing_campaigns
         WHERE deleted_at IS NULL
         GROUP BY status`
      );

      // By type
      const [byType] = await db.query(
        `SELECT type, COUNT(*) as count
         FROM marketing_campaigns
         WHERE deleted_at IS NULL
         GROUP BY type`
      );

      // Total budget
      const [budgetResult] = await db.query(
        'SELECT COALESCE(SUM(budget), 0) as total_budget FROM marketing_campaigns WHERE deleted_at IS NULL'
      );

      // Recent campaigns (last 5)
      const [recentCampaigns] = await db.query(
        `SELECT id, name, status, type, created_at
         FROM marketing_campaigns
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 5`
      );

      res.json({
        success: true,
        data: {
          totalCampaigns: (totalResult as any[])[0].total,
          byStatus,
          byType,
          totalBudget: (budgetResult as any[])[0].total_budget,
          recentCampaigns,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== CHANNEL MEDIA ====================

  /**
   * Upload a file to a campaign channel — auto-saves to collateral library
   * POST /:id/channels/:channelId/upload
   */
  static async uploadChannelMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, channelId } = req.params;
      const file = req.file;
      if (!file) throw new CustomError('No file uploaded', 400);

      // Verify campaign and channel exist
      const [campaigns] = await db.query('SELECT * FROM marketing_campaigns WHERE id = ? AND deleted_at IS NULL', [id]);
      if ((campaigns as any[]).length === 0) { if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); throw new CustomError('Campaign not found', 404); }

      const [channels] = await db.query('SELECT * FROM marketing_campaign_channels WHERE id = ? AND campaign_id = ?', [channelId, id]);
      if ((channels as any[]).length === 0) { if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path); throw new CustomError('Channel not found', 404); }

      const campaign = (campaigns as any[])[0];
      const channel = (channels as any[])[0];

      // Auto-detect category for collateral library
      const fileType = file.mimetype || '';
      let categoryId = 1; // Default: Brochures
      if (fileType.startsWith('video/')) categoryId = 2; // Product Videos
      else if (fileType.includes('presentation') || fileType.includes('powerpoint')) categoryId = 4; // Presentations
      else if (fileType.includes('pdf')) categoryId = 1; // Brochures
      else if (fileType.startsWith('image/')) categoryId = 1; // Brochures

      // Determine product line from campaign (check if campaign has a linked product)
      let productLineId = null;
      // Try to find from campaign description or name
      const [productLines] = await db.query('SELECT id, name FROM product_lines WHERE is_active = 1');
      for (const pl of productLines as any[]) {
        if (campaign.name.toLowerCase().includes(pl.name.toLowerCase())) {
          productLineId = pl.id;
          break;
        }
      }

      const fileExtension = require('path').extname(file.originalname).toLowerCase();
      const title = file.originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      // Save to collateral library
      const [collateralResult] = await db.query(
        `INSERT INTO collateral_items
          (title, description, category_id, product_line_id, file_name, original_name, file_path, file_type, file_size, file_extension, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          `Auto-uploaded from campaign: ${campaign.name} (${channel.channel} channel)`,
          categoryId,
          productLineId,
          file.filename,
          file.originalname,
          file.filename,
          fileType,
          file.size,
          fileExtension,
          req.user!.userId,
        ]
      );

      const collateralId = (collateralResult as any).insertId;

      // Auto-tag with campaign name and channel
      try {
        // Find or create tags
        const tagsToAdd = [campaign.name, channel.channel, 'campaign-media'];
        for (const tagName of tagsToAdd) {
          const [existing] = await db.query('SELECT id FROM collateral_tags WHERE name = ?', [tagName]);
          let tagId;
          if ((existing as any[]).length > 0) {
            tagId = (existing as any[])[0].id;
          } else {
            const [newTag] = await db.query('INSERT INTO collateral_tags (name, tag_type) VALUES (?, ?)', [tagName, 'general']);
            tagId = (newTag as any).insertId;
          }
          await db.query('INSERT IGNORE INTO collateral_item_tags (collateral_id, tag_id) VALUES (?, ?)', [collateralId, tagId]);
        }
      } catch { /* non-critical */ }

      // Update channel's media_urls JSON
      let currentMediaUrls: any[] = [];
      try {
        if (channel.media_urls) {
          currentMediaUrls = typeof channel.media_urls === 'string' ? JSON.parse(channel.media_urls) : channel.media_urls;
        }
      } catch { currentMediaUrls = []; }
      if (!Array.isArray(currentMediaUrls)) currentMediaUrls = [];

      const newMedia = {
        collateralId,
        fileName: file.originalname,
        fileType: fileType,
        fileSize: file.size,
        url: `/api/v1/collateral/${collateralId}/download`,
      };
      currentMediaUrls.push(newMedia);

      await db.query(
        'UPDATE marketing_campaign_channels SET media_urls = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(currentMediaUrls), channelId]
      );

      res.status(201).json({
        success: true,
        data: {
          collateralId,
          media: newMedia,
          totalAttachments: currentMediaUrls.length,
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Attach an existing collateral item to a channel
   * POST /:id/channels/:channelId/attach
   */
  static async attachCollateral(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, channelId } = req.params;
      const { collateralIds } = req.body; // array of collateral IDs

      if (!collateralIds || !Array.isArray(collateralIds) || collateralIds.length === 0) {
        throw new CustomError('collateralIds array is required', 400);
      }

      // Verify channel exists
      const [channels] = await db.query('SELECT * FROM marketing_campaign_channels WHERE id = ? AND campaign_id = ?', [channelId, id]);
      if ((channels as any[]).length === 0) throw new CustomError('Channel not found', 404);
      const channel = (channels as any[])[0];

      // Fetch collateral items
      const placeholders = collateralIds.map(() => '?').join(',');
      const [items] = await db.query(
        `SELECT id, title, original_name, file_type, file_size FROM collateral_items WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
        collateralIds
      );

      // Build media URLs
      let currentMediaUrls: any[] = [];
      try {
        if (channel.media_urls) {
          currentMediaUrls = typeof channel.media_urls === 'string' ? JSON.parse(channel.media_urls) : channel.media_urls;
        }
      } catch { currentMediaUrls = []; }
      if (!Array.isArray(currentMediaUrls)) currentMediaUrls = [];

      const newItems = (items as any[]).map((item: any) => ({
        collateralId: item.id,
        fileName: item.original_name,
        fileType: item.file_type,
        fileSize: item.file_size,
        url: `/api/v1/collateral/${item.id}/download`,
      }));

      // Avoid duplicates
      for (const item of newItems) {
        if (!currentMediaUrls.some((m: any) => m.collateralId === item.collateralId)) {
          currentMediaUrls.push(item);
        }
      }

      await db.query(
        'UPDATE marketing_campaign_channels SET media_urls = ?, updated_at = NOW() WHERE id = ?',
        [JSON.stringify(currentMediaUrls), channelId]
      );

      res.json({ success: true, data: { mediaUrls: currentMediaUrls, totalAttachments: currentMediaUrls.length } });
    } catch (error: any) {
      next(error);
    }
  }
}
