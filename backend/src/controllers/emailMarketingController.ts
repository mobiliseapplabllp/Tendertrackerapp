import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { AIService } from '../services/aiService';
import { emailService } from '../services/emailService';
import { getCompanyName } from '../utils/settings';
import logger from '../utils/logger';

export class EmailMarketingController {

  // ==================== LISTS ====================

  /**
   * Get all email lists with member counts
   */
  static async getLists(_req: Request, res: Response, next: NextFunction) {
    try {
      const [lists] = await db.query(
        `SELECT el.*,
                (SELECT COUNT(*) FROM email_marketing_list_members elm WHERE elm.list_id = el.id) as member_count
         FROM email_marketing_lists el
         ORDER BY el.created_at DESC`
      );

      res.json({ success: true, data: lists });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a new email list
   */
  static async createList(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description } = req.body;

      if (!name) {
        throw new CustomError('name is required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO email_marketing_lists (name, description, created_by)
         VALUES (?, ?, ?)`,
        [name, description || null, req.user!.userId]
      );

      const insertId = (result as any).insertId;
      const [newList] = await db.query('SELECT * FROM email_marketing_lists WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newList as any[])[0] });
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        return next(new CustomError('A list with this name already exists', 409));
      }
      next(error);
    }
  }

  /**
   * Update an email list
   */
  static async updateList(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
      }

      if (updates.length === 0) {
        throw new CustomError('No valid fields to update', 400);
      }

      params.push(id);

      const [result] = await db.query(
        `UPDATE email_marketing_lists SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('List not found', 404);
      }

      const [updated] = await db.query('SELECT * FROM email_marketing_lists WHERE id = ?', [id]);
      res.json({ success: true, data: (updated as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete an email list
   */
  static async deleteList(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Remove FK references to avoid constraint violations
      await db.query(
        'DELETE FROM email_marketing_list_members WHERE list_id = ?',
        [id]
      );
      await db.query(
        'UPDATE email_marketing_campaigns SET list_id = NULL WHERE list_id = ?',
        [id]
      );

      const [result] = await db.query(
        'DELETE FROM email_marketing_lists WHERE id = ?',
        [id]
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('List not found', 404);
      }

      res.json({ success: true, message: 'List deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== MEMBERS ====================

  /**
   * Get members of a specific list with pagination
   */
  static async getListMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      const offset = (page - 1) * pageSize;

      const [members] = await db.query(
        `SELECT * FROM email_marketing_list_members
         WHERE list_id = ? AND status = 'active'
         ORDER BY added_at DESC
         LIMIT ? OFFSET ?`,
        [id, pageSize, offset]
      );

      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM email_marketing_list_members WHERE list_id = ? AND status = 'active'`,
        [id]
      );

      res.json({
        success: true,
        data: members,
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
   * Batch add members to a list
   */
  static async addMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { emails, name, company } = req.body;

      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new CustomError('emails array is required', 400);
      }

      // Verify list exists
      const [lists] = await db.query(
        'SELECT id FROM email_marketing_lists WHERE id = ?',
        [id]
      );
      if ((lists as any[]).length === 0) {
        throw new CustomError('List not found', 404);
      }

      let addedCount = 0;
      let skippedCount = 0;

      for (const email of emails) {
        try {
          await db.query(
            `INSERT INTO email_marketing_list_members (list_id, email, name, company_name, status)
             VALUES (?, ?, ?, ?, 'active')
             ON DUPLICATE KEY UPDATE status = 'active'`,
            [id, email.trim().toLowerCase(), name || null, company || null]
          );
          addedCount++;
        } catch {
          skippedCount++;
        }
      }

      res.json({
        success: true,
        data: { addedCount, skippedCount },
        message: `${addedCount} members added, ${skippedCount} skipped`,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Remove a member from a list
   */
  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, memberId } = req.params;

      const [result] = await db.query(
        `UPDATE email_marketing_list_members SET status = 'unsubscribed' WHERE id = ? AND list_id = ?`,
        [memberId, id]
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Member not found', 404);
      }

      res.json({ success: true, message: 'Member removed successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== EMAIL CAMPAIGNS ====================

  /**
   * Get email campaigns
   */
  static async getEmailCampaigns(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;
      const offset = (page - 1) * pageSize;

      const [campaigns] = await db.query(
        `SELECT emc.*,
                el.name as list_name
         FROM email_marketing_campaigns emc
         LEFT JOIN email_marketing_lists el ON el.id = emc.list_id
         ORDER BY emc.created_at DESC
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      const [countResult] = await db.query(
        'SELECT COUNT(*) as total FROM email_marketing_campaigns'
      );

      res.json({
        success: true,
        data: campaigns,
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
   * Create an email campaign
   */
  static async createEmailCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, body, list_id, campaign_id, from_name, scheduled_at, status } = req.body;

      if (!subject || !body) {
        throw new CustomError('subject and body are required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO email_marketing_campaigns
         (campaign_id, list_id, subject, body, from_name, scheduled_at, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [campaign_id || null, list_id || null, subject, body, from_name || null, scheduled_at || null, status || 'draft', req.user!.userId]
      );

      const insertId = (result as any).insertId;
      const [newCampaign] = await db.query('SELECT * FROM email_marketing_campaigns WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newCampaign as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update an email campaign
   */
  static async updateEmailCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const allowedFields = ['subject', 'body', 'list_id', 'campaign_id', 'from_name', 'scheduled_at', 'status'];

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
        `UPDATE email_marketing_campaigns SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Email campaign not found', 404);
      }

      const [updated] = await db.query('SELECT * FROM email_marketing_campaigns WHERE id = ?', [id]);
      res.json({ success: true, data: (updated as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Send an email campaign to all list members
   */
  static async sendEmailCampaign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Fetch campaign
      const [campaigns] = await db.query(
        'SELECT * FROM email_marketing_campaigns WHERE id = ?',
        [id]
      );

      const campaign = (campaigns as any[])[0];
      if (!campaign) {
        throw new CustomError('Email campaign not found', 404);
      }

      if (!campaign.list_id) {
        throw new CustomError('Campaign has no associated email list', 400);
      }

      if (campaign.status === 'sent') {
        throw new CustomError('Campaign has already been sent', 400);
      }

      // Fetch all active members of the list
      const [members] = await db.query(
        `SELECT email FROM email_marketing_list_members WHERE list_id = ? AND status = 'active'`,
        [campaign.list_id]
      );

      const memberList = members as any[];
      if (memberList.length === 0) {
        throw new CustomError('No active members in the associated list', 400);
      }

      // Send to each member
      let sentCount = 0;
      let failedCount = 0;

      for (const member of memberList) {
        try {
          await emailService.sendNotification(
            member.email,
            campaign.subject,
            campaign.body,
            campaign.body
          );
          sentCount++;
        } catch (err: any) {
          logger.error({ message: 'Failed to send campaign email', email: member.email, error: err.message });
          failedCount++;
        }
      }

      // Update campaign status
      await db.query(
        `UPDATE email_marketing_campaigns
         SET status = 'sent', sent_at = NOW(), total_sent = ?, updated_at = NOW()
         WHERE id = ?`,
        [sentCount, id]
      );

      res.json({
        success: true,
        data: { sentCount, failedCount, totalRecipients: memberList.length },
        message: `Campaign sent to ${sentCount} recipients (${failedCount} failed)`,
      });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== AI ====================

  /**
   * AI-generate email content
   */
  static async aiGenerateEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, topic, context, tone, productName, targetAudience, campaignName, campaignDescription, listName } = req.body;

      // Accept either 'subject' or 'topic' from frontend
      const emailSubject = subject || topic;
      if (!emailSubject) {
        throw new CustomError('subject or topic is required', 400);
      }

      const config = await AIService.getDefaultConfig();
      const companyName = await getCompanyName();

      const systemPrompt = `You are a senior email marketing specialist at ${companyName}. You write high-converting marketing emails that are specific, value-driven, and action-oriented. Every email you write MUST be directly about the product/topic described -- never generic marketing filler. Return your response as valid JSON only, with no markdown formatting or code blocks.`;

      const userPrompt = `Generate a professional marketing email for ${companyName} with these EXACT details:

SUBJECT/TOPIC: ${emailSubject}
${productName ? `PRODUCT/SERVICE: ${productName}` : ''}
${campaignName ? `CAMPAIGN: ${campaignName}` : ''}
${campaignDescription ? `CAMPAIGN CONTEXT: ${campaignDescription}` : ''}
ADDITIONAL CONTEXT: ${context || 'Product/service marketing email'}
TARGET AUDIENCE: ${targetAudience || 'business professionals and decision-makers'}
${listName ? `EMAIL LIST: ${listName}` : ''}
TONE: ${tone || 'professional'}
SENDER: ${companyName}

EMAIL REQUIREMENTS:
- Subject line MUST mention "${emailSubject}" specifically and be compelling (40-60 chars ideal)
- Preheader text should complement the subject line and create urgency (max 100 chars)
- Email body should be 200-300 words, structured as:
  1. Personalized greeting
  2. Opening hook that addresses a pain point or opportunity relevant to the audience
  3. 2-3 specific benefits or value propositions of "${emailSubject}"${productName ? ` / "${productName}"` : ''}
  4. Social proof or credibility statement about ${companyName}
  5. Clear, single call-to-action
  6. Professional sign-off from ${companyName}

CRITICAL RULES:
- Every paragraph MUST relate directly to "${emailSubject}"
- Do NOT write generic content like "we offer great solutions" -- be specific about what "${emailSubject}" delivers
- Include at least one specific data point, benefit, or outcome
- The CTA must be specific (not just "learn more" but related to the actual product/topic)
- Use email-safe HTML with inline styles for the body

Return a JSON object with this structure:
{
  "subject": "string (compelling subject line mentioning ${emailSubject})",
  "preheader": "string (preview text, max 100 chars)",
  "body": "string (HTML formatted email body with inline styles, 200-300 words)",
  "plainText": "string (plain text version of the email)"
}

Return ONLY the JSON object, no other text.`;

      const aiResponse = await AIService.callProvider(config, userPrompt, systemPrompt);

      let parsed;
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse);
      } catch {
        parsed = { subject: emailSubject, body: aiResponse };
      }

      res.json({ success: true, data: parsed });
    } catch (error: any) {
      logger.error({ message: 'AI email generation failed', error: error.message });
      next(error);
    }
  }
}
