import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { AIService } from '../services/aiService';
import { getCompanyName } from '../utils/settings';
import logger from '../utils/logger';

export class AudienceSegmentController {

  /**
   * Get all audience segments
   */
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const [segments] = await db.query(
        `SELECT * FROM audience_segments
         ORDER BY created_at DESC`
      );

      res.json({ success: true, data: segments });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get a single segment with a preview of matching criteria
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [segments] = await db.query(
        'SELECT * FROM audience_segments WHERE id = ?',
        [id]
      );

      const segment = (segments as any[])[0];
      if (!segment) {
        throw new CustomError('Segment not found', 404);
      }

      // Parse criteria and provide a preview of matching contacts
      let matchPreview: any[] = [];
      if (segment.criteria) {
        const criteria = typeof segment.criteria === 'string' ? JSON.parse(segment.criteria) : segment.criteria;

        // Build a simple preview query based on criteria
        let previewQuery = 'SELECT id, name, industry, location FROM companies WHERE 1=1';
        const previewParams: any[] = [];

        if (criteria.industry) {
          previewQuery += ' AND industry = ?';
          previewParams.push(criteria.industry);
        }
        if (criteria.location) {
          previewQuery += ' AND (location LIKE ? OR city LIKE ? OR state LIKE ?)';
          previewParams.push(`%${criteria.location}%`, `%${criteria.location}%`, `%${criteria.location}%`);
        }
        if (criteria.minEmployees) {
          previewQuery += ' AND employee_count >= ?';
          previewParams.push(criteria.minEmployees);
        }
        if (criteria.maxEmployees) {
          previewQuery += ' AND employee_count <= ?';
          previewParams.push(criteria.maxEmployees);
        }

        previewQuery += ' LIMIT 10';

        try {
          const [preview] = await db.query(previewQuery, previewParams);
          matchPreview = preview as any[];
        } catch {
          // If company columns don't match, return empty preview
          matchPreview = [];
        }
      }

      segment.matchPreview = matchPreview;

      res.json({ success: true, data: segment });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a new audience segment
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, criteria, contact_count, is_dynamic } = req.body;

      if (!name) {
        throw new CustomError('name is required', 400);
      }

      const [result] = await db.query(
        `INSERT INTO audience_segments (name, description, criteria, contact_count, is_dynamic, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          name,
          description || null,
          criteria ? JSON.stringify(criteria) : null,
          contact_count || 0,
          is_dynamic !== false,
          req.user!.userId,
        ]
      );

      const insertId = (result as any).insertId;
      const [newSegment] = await db.query('SELECT * FROM audience_segments WHERE id = ?', [insertId]);

      res.status(201).json({ success: true, data: (newSegment as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update an audience segment
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const allowedFields = ['name', 'description', 'criteria', 'contact_count', 'is_dynamic'];

      const updates: string[] = [];
      const params: any[] = [];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          const value = field === 'criteria' && typeof req.body[field] === 'object'
            ? JSON.stringify(req.body[field])
            : req.body[field];
          params.push(value);
        }
      }

      if (updates.length === 0) {
        throw new CustomError('No valid fields to update', 400);
      }

      params.push(id);

      const [result] = await db.query(
        `UPDATE audience_segments SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        params
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Segment not found', 404);
      }

      const [updated] = await db.query('SELECT * FROM audience_segments WHERE id = ?', [id]);
      res.json({ success: true, data: (updated as any[])[0] });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete an audience segment (soft delete)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [result] = await db.query(
        'DELETE FROM audience_segments WHERE id = ?',
        [id]
      );

      if ((result as any).affectedRows === 0) {
        throw new CustomError('Segment not found', 404);
      }

      res.json({ success: true, message: 'Segment deleted successfully' });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Refresh the contact_count for a segment based on its criteria
   */
  static async refreshCount(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [segments] = await db.query(
        'SELECT * FROM audience_segments WHERE id = ?',
        [id]
      );

      const segment = (segments as any[])[0];
      if (!segment) {
        throw new CustomError('Segment not found', 404);
      }

      let count = 0;
      if (segment.criteria) {
        const criteria = typeof segment.criteria === 'string' ? JSON.parse(segment.criteria) : segment.criteria;

        // Count matching companies based on criteria
        let countQuery = 'SELECT COUNT(*) as total FROM companies WHERE 1=1';
        const countParams: any[] = [];

        if (criteria.industry) {
          countQuery += ' AND industry = ?';
          countParams.push(criteria.industry);
        }
        if (criteria.location) {
          countQuery += ' AND (location LIKE ? OR city LIKE ? OR state LIKE ?)';
          countParams.push(`%${criteria.location}%`, `%${criteria.location}%`, `%${criteria.location}%`);
        }
        if (criteria.minEmployees) {
          countQuery += ' AND employee_count >= ?';
          countParams.push(criteria.minEmployees);
        }
        if (criteria.maxEmployees) {
          countQuery += ' AND employee_count <= ?';
          countParams.push(criteria.maxEmployees);
        }

        // Also count from tenders if criteria include lead-based filters
        if (criteria.leadSource) {
          const [leadCount] = await db.query(
            'SELECT COUNT(*) as total FROM tenders WHERE source = ?',
            [criteria.leadSource]
          );
          count += (leadCount as any[])[0].total;
        }

        try {
          const [companyCount] = await db.query(countQuery, countParams);
          count += (companyCount as any[])[0].total;
        } catch {
          // If columns don't match, keep count at 0
        }
      }

      // Update the count
      await db.query(
        'UPDATE audience_segments SET contact_count = ?, updated_at = NOW() WHERE id = ?',
        [count, id]
      );

      res.json({ success: true, data: { id: segment.id, contact_count: count } });
    } catch (error: any) {
      next(error);
    }
  }

  // ==================== AI ====================

  /**
   * AI suggests audience segments based on existing company data
   */
  static async aiSuggestSegments(_req: Request, res: Response, next: NextFunction) {
    try {
      const config = await AIService.getDefaultConfig();
      const companyName = await getCompanyName();

      // Gather rich data summaries for context
      let industriesSummary = '';
      let locationsSummary = '';
      let dealStatusSummary = '';
      let productLinesSummary = '';
      let totalCompanies = 0;

      try {
        const [industries] = await db.query(
          'SELECT industry, COUNT(*) as count FROM companies WHERE industry IS NOT NULL GROUP BY industry ORDER BY count DESC LIMIT 20'
        );
        industriesSummary = (industries as any[]).map(i => `${i.industry} (${i.count})`).join(', ');
      } catch {
        industriesSummary = 'Data not available';
      }

      try {
        const [locations] = await db.query(
          'SELECT city, state, COUNT(*) as count FROM companies WHERE city IS NOT NULL GROUP BY city, state ORDER BY count DESC LIMIT 20'
        );
        locationsSummary = (locations as any[]).map(l => `${l.city || ''}${l.state ? ', ' + l.state : ''} (${l.count})`).join(', ');
      } catch {
        locationsSummary = 'Data not available';
      }

      try {
        const [statuses] = await db.query(
          `SELECT status, COUNT(*) as count FROM tenders WHERE deleted_at IS NULL GROUP BY status ORDER BY count DESC`
        );
        dealStatusSummary = (statuses as any[]).map(s => `${s.status} (${s.count})`).join(', ');
      } catch {
        dealStatusSummary = 'Data not available';
      }

      try {
        const [productLines] = await db.query(
          'SELECT name, description FROM product_lines WHERE deleted_at IS NULL ORDER BY name LIMIT 15'
        );
        productLinesSummary = (productLines as any[]).map(pl => pl.name).join(', ');
      } catch {
        productLinesSummary = 'Data not available';
      }

      try {
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM companies');
        totalCompanies = (countResult as any[])[0].total;
      } catch { /* ignore */ }

      const systemPrompt = `You are a senior marketing strategist at ${companyName}, specializing in B2B audience segmentation and targeted marketing campaigns. You analyze CRM data to create actionable audience segments that drive higher conversion rates. Return your response as valid JSON only, with no markdown formatting or code blocks.`;

      const userPrompt = `Analyze the following CRM data from ${companyName}'s database and suggest 5-8 high-value audience segments for targeted marketing campaigns.

COMPANY: ${companyName}
TOTAL COMPANIES IN DATABASE: ${totalCompanies}

CRM DATA SUMMARY:
- Industries: ${industriesSummary || 'Various'}
- Locations: ${locationsSummary || 'Various'}
- Deal/Lead statuses: ${dealStatusSummary || 'Various'}
- Product lines offered: ${productLinesSummary || 'Various'}

SEGMENTATION REQUIREMENTS:
- Each segment must be actionable for marketing campaigns (email, social media, content)
- Segments should be based on the ACTUAL data above, not hypothetical data
- Include segments based on: industry verticals, geographic clusters, company size tiers, and deal engagement level
- Each segment should have a specific marketing tip that ${companyName} can act on immediately
- Estimate segment sizes based on the actual counts provided above
- Criteria must use the exact industry/location values from the data above

Return a JSON object with this structure:
{
  "segments": [
    {
      "name": "string (specific, descriptive segment name)",
      "description": "string (2-3 sentences explaining who is in this segment and why they matter to ${companyName})",
      "criteria": {
        "industry": "string or null (must match an industry from the data above)",
        "location": "string or null (must match a location from the data above)",
        "minEmployees": "number or null",
        "maxEmployees": "number or null"
      },
      "estimatedSize": "string (e.g., 'Large (~150 companies)', 'Medium (~50 companies)', 'Small (~20 companies)')",
      "marketingTip": "string (specific, actionable marketing recommendation for ${companyName} targeting this segment)"
    }
  ]
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
      logger.error({ message: 'AI segment suggestion failed', error: error.message });
      next(error);
    }
  }
}
