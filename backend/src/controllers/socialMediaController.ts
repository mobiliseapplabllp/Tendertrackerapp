import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { AIService } from '../services/aiService';
import { getCompanyName } from '../utils/settings';
import logger from '../utils/logger';

export class SocialMediaController {

  // ==================== ACCOUNTS ====================

  /**
   * Get all social media accounts (tokens are excluded for security)
   */
  static async getAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const [accounts] = await db.query(
        `SELECT id, platform, account_name, profile_url, is_active, created_at, updated_at
         FROM social_media_accounts
         WHERE connected_by = ?
         ORDER BY platform ASC`,
        [req.user!.userId]
      );

      res.json({ success: true, data: accounts });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Connect a new social media account
   */
  static async connectAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { platform, account_name, account_id, page_id, profile_url, access_token, refresh_token } = req.body;

      if (!platform || !account_name) {
        throw new CustomError('platform and account_name are required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO social_media_accounts
         (platform, account_name, account_id, page_id, profile_url, access_token, refresh_token, is_active, connected_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
        [platform, account_name, account_id || null, page_id || null, profile_url || null, access_token || null, refresh_token || null, req.user!.userId]
      );

      const insertId = (result as any).insertId;
      const [newAccount] = await db.query(
        'SELECT id, platform, account_name, profile_url, is_active, created_at FROM social_media_accounts WHERE id = ?',
        [insertId]
      );

      res.status(201).json({ success: true, data: (newAccount as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Disconnect a social media account (soft: set is_active = false)
   */
  static async disconnectAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [result] = await db.query(
        'UPDATE social_media_accounts SET is_active = FALSE, updated_at = NOW() WHERE id = ? AND connected_by = ?',
        [id, req.user!.userId]
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Account not found', 404);
      }

      res.json({ success: true, message: 'Account disconnected successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update a social media account
   */
  static async updateAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const allowedFields = ['account_name', 'account_id', 'page_id', 'profile_url', 'access_token', 'refresh_token'];

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

      params.push(id, req.user!.userId);

      const [result] = await db.query(
        `UPDATE social_media_accounts SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ? AND connected_by = ?`,
        params
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Account not found', 404);
      }

      const [updated] = await db.query(
        'SELECT id, platform, account_name, profile_url, is_active, created_at, updated_at FROM social_media_accounts WHERE id = ?',
        [id]
      );

      res.json({ success: true, data: (updated as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== POSTS ====================

  /**
   * Get scheduled posts across campaigns
   */
  static async getScheduledPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;

      const [posts] = await db.query(
        `SELECT mcc.*, mc.name as campaign_name
         FROM marketing_campaign_channels mcc
         JOIN marketing_campaigns mc ON mc.id = mcc.campaign_id AND mc.deleted_at IS NULL
         WHERE mcc.status = 'scheduled'
         ORDER BY mcc.scheduled_at ASC
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      const [countResult] = await db.query(
        `SELECT COUNT(*) as total
         FROM marketing_campaign_channels mcc
         JOIN marketing_campaigns mc ON mc.id = mcc.campaign_id AND mc.deleted_at IS NULL
         WHERE mcc.status = 'scheduled'`
      );

      res.json({
        success: true,
        data: posts,
        pagination: {
          page,
          pageSize,
          total: (countResult as any[])[0].total,
          totalPages: Math.ceil((countResult as any[])[0].total / pageSize),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get published posts with engagement metrics
   */
  static async getPublishedPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;

      const [posts] = await db.query(
        `SELECT mcc.*, mc.name as campaign_name
         FROM marketing_campaign_channels mcc
         JOIN marketing_campaigns mc ON mc.id = mcc.campaign_id AND mc.deleted_at IS NULL
         WHERE mcc.status = 'published'
         ORDER BY mcc.updated_at DESC
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      const [countResult] = await db.query(
        `SELECT COUNT(*) as total
         FROM marketing_campaign_channels mcc
         JOIN marketing_campaigns mc ON mc.id = mcc.campaign_id AND mc.deleted_at IS NULL
         WHERE mcc.status = 'published'`
      );

      res.json({
        success: true,
        data: posts,
        pagination: {
          page,
          pageSize,
          total: (countResult as any[])[0].total,
          totalPages: Math.ceil((countResult as any[])[0].total / pageSize),
        },
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== AI ====================

  /**
   * AI-generate a platform-specific social media post
   */
  static async aiGeneratePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { platform, topic, tone, includeHashtags, campaignName, productName, targetAudience, campaignDescription } = req.body;

      if (!platform || !topic) {
        throw new CustomError('platform and topic are required', 400);
      }

      const config = await AIService.getDefaultConfig();
      const companyName = await getCompanyName();

      const platformGuidelines: Record<string, string> = {
        linkedin: `Professional LinkedIn post (max 1300 chars). Start with a compelling hook in the first line that stops the scroll. Use line breaks for readability. Include specific data points, stats, or results where possible. End with a clear call-to-action and 3-5 relevant hashtags. Tone: thought leadership, authoritative, value-driven.`,
        twitter: `Concise tweet (max 280 chars). Be punchy, direct, and attention-grabbing. Lead with the most compelling point. Include 2-3 relevant hashtags. If the topic warrants it, pose a question to drive engagement.`,
        instagram: `Engaging Instagram caption (up to 2200 chars). Start with a hook that makes people stop scrolling. Tell a mini-story or share a relatable insight. Use emojis strategically (not excessively). End with a strong CTA and include 15-20 relevant hashtags in a separate block.`,
        facebook: `Conversational Facebook post (300-500 chars). Be friendly and community-oriented. Ask a question or invite discussion. Use 1-2 emojis. Include a clear CTA. Keep hashtags minimal (3-5 max).`,
        youtube: `YouTube video description (200-300 words). Start with a concise summary of the video content. Include timestamps format. Add relevant tags and keywords for SEO. End with links and CTAs.`,
      };

      const guidelines = platformGuidelines[platform.toLowerCase()] || 'Write engaging, audience-appropriate content tailored to the platform.';

      const systemPrompt = `You are a senior social media strategist at ${companyName}. You create high-performing, platform-specific content that drives engagement and conversions. Every post you write MUST be specifically about the topic/product described -- never generic filler content. Return your response as valid JSON only, with no markdown formatting or code blocks.`;

      const userPrompt = `Generate a ${platform} post for ${companyName} with these EXACT details:

TOPIC/PRODUCT: ${topic}
${productName ? `PRODUCT NAME: ${productName}` : ''}
${campaignName ? `CAMPAIGN: ${campaignName}` : ''}
${campaignDescription ? `CAMPAIGN CONTEXT: ${campaignDescription}` : ''}
TARGET AUDIENCE: ${targetAudience || 'business professionals and decision-makers'}
TONE: ${tone || 'professional'}
COMPANY: ${companyName}

PLATFORM-SPECIFIC GUIDANCE:
${guidelines}

CRITICAL RULES:
- Every sentence MUST directly relate to "${topic}"${productName ? ` and specifically mention or reference "${productName}"` : ''}
- Do NOT write generic motivational or filler content
- Include specific value propositions, benefits, or data points related to the topic
- The post must sound like it comes from ${companyName}, not a generic brand
- Tailor the language and approach specifically for ${targetAudience || 'business professionals'}
- ${includeHashtags !== false ? 'Include relevant, specific hashtags (not generic ones like #business or #success)' : 'Do NOT include hashtags'}

Return a JSON object with this structure:
{
  "post": "string (the complete post content, specifically about ${topic})",
  "hashtags": ["string (specific, relevant hashtags)"],
  "characterCount": number,
  "suggestedImageDescription": "string (brief description of an ideal accompanying image that relates to ${topic})"
}

Return ONLY the JSON object, no other text.`;

      const aiResponse = await AIService.callProvider(config, userPrompt, systemPrompt);

      let parsed;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
      } catch {
        parsed = { post: aiResponse };
      }

      res.json({ success: true, data: parsed });
    } catch (error: any) {
      logger.error({ message: 'AI social post generation failed', error: error.message });
      next(error);
    }
  }
}
