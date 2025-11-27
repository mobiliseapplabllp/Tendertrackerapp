import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { TenderScoutService } from '../services/tenderScoutService';
import logger from '../utils/logger';

const parseJsonField = (field: any): any => {
    if (!field) return null;
    if (typeof field === 'string') {
        try {
            return JSON.parse(field);
        } catch {
            return field;
        }
    }
    return field;
};

export const tenderScoutController = {
    // ==================== SOURCES ====================

    async getSources(req: Request, res: Response, next: NextFunction) {
        try {
            const [sources] = await db.query(
                'SELECT * FROM tender_scout_sources ORDER BY created_at DESC'
            );

            // Convert MySQL BOOLEAN (0/1) to JavaScript boolean (true/false)
            const formattedSources = (sources as any[]).map(source => ({
                ...source,
                isActive: Boolean(source.is_active)
            }));

            res.json({ success: true, data: formattedSources });
        } catch (error) {
            next(error);
        }
    },

    async createSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, sourceType, url, scrapingConfig, isActive } = req.body;

            const [result] = await db.query(
                `INSERT INTO tender_scout_sources (name, source_type, url, scraping_config, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
                [name, sourceType, url, JSON.stringify(scrapingConfig || {}), isActive !== false, req.user!.userId]
            );

            res.status(201).json({
                success: true,
                data: { id: (result as any).insertId },
                message: 'Scout source created successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    async updateSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name, sourceType, url, scrapingConfig, isActive } = req.body;

            await db.query(
                `UPDATE tender_scout_sources 
         SET name = ?, source_type = ?, url = ?, scraping_config = ?, is_active = ?
         WHERE id = ?`,
                [name, sourceType, url, JSON.stringify(scrapingConfig || {}), isActive, id]
            );

            res.json({ success: true, message: 'Scout source updated successfully' });
        } catch (error) {
            next(error);
        }
    },

    async deleteSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            await db.query('DELETE FROM tender_scout_sources WHERE id = ?', [id]);

            res.json({ success: true, message: 'Scout source deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    // ==================== INTERESTS ====================

    async getInterests(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.userId;
            const role = req.user!.role;

            let query = 'SELECT * FROM tender_scout_interests';
            let params: any[] = [];

            // Non-admins can only see their own interests
            if (role !== 'Admin') {
                query += ' WHERE user_id = ?';
                params = [userId];
            }

            query += ' ORDER BY created_at DESC';

            const [interests] = await db.query(query, params);

            // Convert MySQL BOOLEAN (0/1) to JavaScript boolean (true/false)
            // AND parse JSON fields (keywords, categories, regions)
            const formattedInterests = (interests as any[]).map(interest => ({
                ...interest,
                isActive: Boolean(interest.is_active),
                keywords: parseJsonField(interest.keywords),
                categories: parseJsonField(interest.categories),
                regions: parseJsonField(interest.regions),
                minRelevance: interest.min_relevance ?? 25,
            }));

            res.json({ success: true, data: formattedInterests });
        } catch (error) {
            next(error);
        }
    },

    async createInterest(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, keywords, categories, minValue, maxValue, regions, isActive, autoImportThreshold, minRelevance } = req.body;
            const userId = req.user!.userId;

            // Explicitly convert isActive to boolean (MySQL stores as 0/1)
            const isActiveValue = isActive === false || isActive === 'false' || isActive === 0 ? 0 : 1;

            logger.info('Creating interest profile', {
                name,
                isActiveReceived: isActive,
                isActiveType: typeof isActive,
                isActiveConverted: isActiveValue
            });

            const [result] = await db.query(
                `INSERT INTO tender_scout_interests 
         (user_id, name, keywords, categories, min_value, max_value, regions, is_active, auto_import_threshold, min_relevance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    userId,
                    name,
                    JSON.stringify(keywords),
                    JSON.stringify(categories || []),
                    minValue || null,
                    maxValue || null,
                    JSON.stringify(regions || []),
                    isActiveValue,
                    autoImportThreshold || 80,
                    minRelevance || 25,
                ]
            );

            res.status(201).json({
                success: true,
                data: { id: (result as any).insertId },
                message: 'Interest profile created successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    async updateInterest(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name, keywords, categories, minValue, maxValue, regions, isActive, autoImportThreshold, minRelevance } = req.body;

            // Explicitly convert isActive to boolean (MySQL stores as 0/1)
            const isActiveValue = isActive === true || isActive === 'true' || isActive === 1 ? 1 : 0;

            await db.query(
                `UPDATE tender_scout_interests 
         SET name = ?, keywords = ?, categories = ?, min_value = ?, max_value = ?, 
             regions = ?, is_active = ?, auto_import_threshold = ?, min_relevance = ?
         WHERE id = ?`,
                [
                    name,
                    JSON.stringify(keywords),
                    JSON.stringify(categories || []),
                    minValue || null,
                    maxValue || null,
                    JSON.stringify(regions || []),
                    isActiveValue,
                    autoImportThreshold || 80,
                    minRelevance || 25,
                    id,
                ]
            );

            res.json({ success: true, message: 'Interest profile updated successfully' });
        } catch (error) {
            next(error);
        }
    },

    async deleteInterest(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            await db.query('DELETE FROM tender_scout_interests WHERE id = ?', [id]);

            res.json({ success: true, message: 'Interest profile deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    // ==================== RESULTS ====================

    async getResults(req: Request, res: Response, next: NextFunction) {
        try {
            const { status, minRelevance, limit = 50, offset = 0 } = req.query;

            let query = `
        SELECT r.*, s.name as source_name, i.name as interest_name
        FROM tender_scout_results r
        LEFT JOIN tender_scout_sources s ON r.source_id = s.id
        LEFT JOIN tender_scout_interests i ON r.interest_id = i.id
        WHERE 1=1
      `;
            const params: any[] = [];

            if (status) {
                query += ' AND r.status = ?';
                params.push(status);
            }

            if (minRelevance) {
                query += ' AND r.relevance_score >= ?';
                params.push(minRelevance);
            }

            query += ' ORDER BY r.discovered_at DESC LIMIT ? OFFSET ?';
            params.push(parseInt(limit as string), parseInt(offset as string));

            const [results] = await db.query(query, params);
            const formattedResults = (results as any[]).map((result) => ({
                ...result,
                matchedKeywords: parseJsonField(result.matched_keywords) || [],
            }));

            // Get total count
            let countQuery = 'SELECT COUNT(*) as total FROM tender_scout_results WHERE 1=1';
            const countParams: any[] = [];

            if (status) {
                countQuery += ' AND status = ?';
                countParams.push(status);
            }

            if (minRelevance) {
                countQuery += ' AND relevance_score >= ?';
                countParams.push(minRelevance);
            }

            const [countResult] = await db.query(countQuery, countParams);
            const total = (countResult as any[])[0].total;

            res.json({
                success: true,
                data: formattedResults,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                }
            });
        } catch (error) {
            next(error);
        }
    },

    async getResultById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const [results] = await db.query(
                `SELECT r.*, s.name as source_name, i.name as interest_name
         FROM tender_scout_results r
         LEFT JOIN tender_scout_sources s ON r.source_id = s.id
         LEFT JOIN tender_scout_interests i ON r.interest_id = i.id
         WHERE r.id = ?`,
                [id]
            );

            const result = (results as any[])[0];
            if (!result) {
                throw new CustomError('Result not found', 404);
            }

            res.json({
                success: true,
                data: {
                    ...result,
                    matchedKeywords: parseJsonField(result.matched_keywords) || [],
                },
            });
        } catch (error) {
            next(error);
        }
    },

    async updateResultStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            await db.query(
                'UPDATE tender_scout_results SET status = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?',
                [status, req.user!.userId, id]
            );

            res.json({ success: true, message: 'Status updated successfully' });
        } catch (error) {
            next(error);
        }
    },

    async importResult(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userId = req.user!.userId;

            const tenderId = await TenderScoutService.importTender(parseInt(id), userId);

            res.json({
                success: true,
                data: { tenderId },
                message: 'Tender imported successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    async deleteResult(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            await db.query('DELETE FROM tender_scout_results WHERE id = ?', [id]);

            res.json({ success: true, message: 'Result deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    async aiSearch(req: Request, res: Response, next: NextFunction) {
        try {
            const { interestId } = req.body;
            if (!interestId) {
                throw new CustomError('Interest ID is required', 400);
            }

            const results = await TenderScoutService.runAISearch(parseInt(interestId, 10));

            res.json({
                success: true,
                data: results,
            });
        } catch (error) {
            next(error);
        }
    },

    async deleteResultsBulk(req: Request, res: Response, next: NextFunction) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                throw new CustomError('At least one result ID is required', 400);
            }

            await db.query('DELETE FROM tender_scout_results WHERE id IN (?)', [ids]);

            res.json({ success: true, message: 'Selected results deleted successfully' });
        } catch (error) {
            next(error);
        }
    },

    // ==================== SCOUT EXECUTION ====================

    async runScout(req: Request, res: Response, next: NextFunction) {
        try {
            const { sourceId, interestId } = req.body;

            logger.info({
                message: 'Manual scout execution started',
                userId: req.user!.userId,
                sourceId,
                interestId,
            });

            const results = await TenderScoutService.runScout(sourceId, interestId);

            res.json({
                success: true,
                data: results,
                message: 'Scout completed successfully'
            });
        } catch (error) {
            next(error);
        }
    },

    async getLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const { limit = 50, offset = 0 } = req.query;

            const [logs] = await db.query(
                `SELECT l.*, s.name as source_name
         FROM tender_scout_logs l
         LEFT JOIN tender_scout_sources s ON l.source_id = s.id
         ORDER BY l.started_at DESC
         LIMIT ? OFFSET ?`,
                [parseInt(limit as string), parseInt(offset as string)]
            );

            res.json({ success: true, data: logs });
        } catch (error) {
            next(error);
        }
    },

    async getStats(req: Request, res: Response, next: NextFunction) {
        try {
            // Get statistics
            const [newCount] = await db.query(
                'SELECT COUNT(*) as count FROM tender_scout_results WHERE status = ?',
                ['new']
            );

            const [totalCount] = await db.query(
                'SELECT COUNT(*) as count FROM tender_scout_results'
            );

            const [importedCount] = await db.query(
                'SELECT COUNT(*) as count FROM tender_scout_results WHERE status = ?',
                ['imported']
            );

            const [avgRelevance] = await db.query(
                'SELECT AVG(relevance_score) as avg FROM tender_scout_results'
            );

            res.json({
                success: true,
                data: {
                    newTenders: (newCount as any[])[0].count,
                    totalDiscovered: (totalCount as any[])[0].count,
                    imported: (importedCount as any[])[0].count,
                    avgRelevance: Math.round((avgRelevance as any[])[0].avg || 0),
                },
            });
        } catch (error) {
            next(error);
        }
    },
};
