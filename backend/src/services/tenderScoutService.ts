import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import { WebScraperService } from './webScraperService';
import { AIService } from './aiService';
import axios from 'axios';
import RSSParser from 'rss-parser';


const rssParser = new RSSParser();

export class TenderScoutService {
    /**
     * Run scout for all active sources and interests
     */
    static async runScout(sourceId?: number, interestId?: number): Promise<any> {
        try {
            // Get active sources
            let sources;
            if (sourceId) {
                [sources] = await db.query(
                    'SELECT * FROM tender_scout_sources WHERE id = ? AND is_active = TRUE',
                    [sourceId]
                );
            } else {
                [sources] = await db.query(
                    'SELECT * FROM tender_scout_sources WHERE is_active = TRUE'
                );
            }

            const sourcesArray = sources as any[];
            if (sourcesArray.length === 0) {
                throw new CustomError('No active scout sources found', 404);
            }

            // Get active interests
            let interests;
            if (interestId) {
                [interests] = await db.query(
                    'SELECT * FROM tender_scout_interests WHERE id = ? AND is_active = TRUE',
                    [interestId]
                );
            } else {
                [interests] = await db.query(
                    'SELECT * FROM tender_scout_interests WHERE is_active = TRUE'
                );
            }

            const interestsArray = interests as any[];
            if (interestsArray.length === 0) {
                throw new CustomError('No active interests found', 404);
            }

            const results = [];

            // Scout each source
            for (const source of sourcesArray) {
                const logId = await this.createLog(source.id);
                const startTime = Date.now();

                try {
                    let tenders: any[] = [];

                    // Scout based on source type
                    if (source.source_type === 'google_search') {
                        tenders = await this.scoutGoogleSearch(source, interestsArray);
                    } else if (source.source_type === 'rss') {
                        tenders = await this.scoutRSS(source);
                    } else if (source.source_type === 'website') {
                        tenders = await this.scoutWebsite(source);
                    }

                    // Process and match tenders against interests
                    let newCount = 0;
                    for (const tender of tenders) {
                        for (const interest of interestsArray) {
                            const { score, matchedKeywords } = this.calculateRelevance(tender, interest);
                            const threshold =
                                interest.min_relevance ??
                                interest.auto_import_threshold ??
                                25;

                            if (score >= threshold) {
                                const saved = await this.saveTenderResult(
                                    tender,
                                    source.id,
                                    interest.id,
                                    score,
                                    matchedKeywords
                                );

                                if (saved) newCount++;
                            }
                        }
                    }

                    // Update log
                    await this.completeLog(logId, 'completed', tenders.length, newCount, Date.now() - startTime);

                    // Update last scraped
                    await db.query(
                        'UPDATE tender_scout_sources SET last_scraped_at = NOW() WHERE id = ?',
                        [source.id]
                    );

                    results.push({
                        source: source.name,
                        found: tenders.length,
                        new: newCount,
                    });

                } catch (error: any) {
                    await this.completeLog(logId, 'failed', 0, 0, Date.now() - startTime, error.message);
                    logger.error({
                        message: `Scout failed for source ${source.name}`,
                        error: error.message,
                    });
                }
            }

            return results;
        } catch (error: any) {
            logger.error({
                message: 'Scout execution failed',
                error: error.message,
            });
            throw error;
        }
    }

    static async runAISearch(interestId: number, limit = 5): Promise<any[]> {
        const [interests] = await db.query(
            'SELECT * FROM tender_scout_interests WHERE id = ? AND is_active = TRUE',
            [interestId]
        );

        const interest = (interests as any[])[0];
        if (!interest) {
            throw new CustomError('Interest profile not found or inactive', 404);
        }

        const [results] = await db.query(
            `SELECT id, title, url, ai_summary as summary, raw_data, matched_keywords
             FROM tender_scout_results
             WHERE interest_id = ?
             ORDER BY discovered_at DESC
             LIMIT ?`,
            [interestId, 10]
        );

        const context = (results as any[])
            .map((result) => {
                const raw = result.raw_data ? JSON.parse(result.raw_data) : {};
                const fileLinks = [];
                if (raw.url) fileLinks.push(raw.url);
                if (raw.pdf_url) fileLinks.push(raw.pdf_url);
                return `Title: ${result.title || 'N/A'}
URL: ${result.url || 'N/A'}
Summary: ${result.summary || 'N/A'}
Files: ${[...new Set(fileLinks)].join(', ') || 'None'}
Matched Keywords: ${JSON.stringify(result.matched_keywords || [])}`;
            })
            .join('\n\n');

        const keywords = this.safeParse(interest.keywords);
        const prompt = `You are a business analyst. Generate up to ${limit} fresh tender opportunities for Keywords: ${keywords.join(
            ', '
        )}. Use the following context from previously discovered tenders:

${context}

Return a JSON array with fields: title, summary, url, confidence (0-100), fileLinks (array), matchedKeywords (array).`;

        const aiConfig = await AIService.getDefaultConfig();
        const aiResponse = await AIService.callProvider(aiConfig, prompt, 'You are an AI tender scout');

        try {
            // Attempt to extract JSON array from response if it contains text
            const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
            const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;

            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            // fall through
        }

        return [
            {
                title: 'AI Search Result',
                summary: aiResponse,
                url: '',
                confidence: 0,
                fileLinks: [],
                matchedKeywords: keywords.slice(0, 3),
            },
        ];
    }

    /**
     * Helper to safely parse JSON fields
     */
    private static safeParse(field: any): any[] {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') {
            try {
                return JSON.parse(field);
            } catch {
                return [field];
            }
        }
        return [];
    }

    /**
     * Scout using Google Custom Search API
     */
    private static async scoutGoogleSearch(source: any, interests: any[]): Promise<any[]> {
        // Get API credentials from database
        const [apiKeyConfig] = await db.query(
            "SELECT config_value FROM system_config WHERE config_key = 'google_search_api_key'"
        );
        const [engineIdConfig] = await db.query(
            "SELECT config_value FROM system_config WHERE config_key = 'google_search_engine_id'"
        );

        const apiKey = (apiKeyConfig as any[])[0]?.config_value || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
        const engineId = (engineIdConfig as any[])[0]?.config_value || process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

        if (!apiKey || !engineId) {
            logger.warn('Google Custom Search API not configured');
            return [];
        }

        const tenders: any[] = [];
        const config = source.scraping_config || {};
        const domains = this.safeParse(config.domains);
        const domainList = domains
            .map((domain: string) => domain?.toString().trim())
            .filter((domain: string) => domain);
        const extraTerms = this.safeParse(config.extraTerms);
        const maxPages = Math.max(1, Math.min(5, parseInt(config.maxPages, 10) || 3));
        const includePrivate = Boolean(config.includePrivate);
        const dateRestrict = config.dateRestrict || 'd5';

        for (const interest of interests) {
            const keywords = this.safeParse(interest.keywords);
            if (keywords.length === 0) continue;

            const keywordClause = keywords
                .slice(0, 5)
                .map((keyword: string) => `"${keyword.trim()}"`)
                .join(' OR ');

            const domainClause = domainList.length > 0
                ? domainList.map((domain: string) => `site:${domain}`).join(' OR ')
                : includePrivate
                    ? ''
                    : 'site:gov.in';

            const queryParts = [];
            if (domainClause) queryParts.push(`(${domainClause})`);
            queryParts.push('tender');
            if (keywordClause) queryParts.push(`(${keywordClause})`);
            if (extraTerms.length > 0) queryParts.push(extraTerms.join(' '));

            const query = queryParts.join(' ').replace(/\s+/g, ' ').trim();

            for (let page = 0; page < maxPages; page++) {
                const start = page * 10;
                try {
                    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
                        params: {
                            key: apiKey,
                            cx: engineId,
                            q: query,
                            num: 10,
                            sort: 'date',
                            dateRestrict,
                            start,
                        },
                    });

                    logger.info({
                        message: 'Executing Google search',
                        source: source.name,
                        query,
                        page,
                    });

                    const items = response.data.items || [];
                    logger.info({
                        message: 'Google search results',
                        source: source.name,
                        page,
                        count: items.length,
                    });

                    if (items.length === 0) {
                        break;
                    }

                    for (const item of items) {
                        tenders.push({
                            title: item.title,
                            description: item.snippet,
                            url: item.link,
                            organization: this.extractOrganization(item.link),
                            location: 'India',
                        });
                    }
                } catch (error: any) {
                    logger.error({
                        message: 'Google Search API error',
                        error: error.message,
                    });
                    break;
                }

                await new Promise((resolve) => setTimeout(resolve, 1200));
            }
        }

        return tenders;
    }

    /**
     * Scout RSS feed
     */
    private static async scoutRSS(source: any): Promise<any[]> {
        try {
            const feed = await rssParser.parseURL(source.url);
            const tenders: any[] = [];

            for (const item of feed.items) {
                tenders.push({
                    title: item.title || '',
                    description: item.contentSnippet || item.content || '',
                    url: item.link || '',
                    organization: feed.title || '',
                    deadline: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                });
            }

            return tenders;
        } catch (error: any) {
            logger.error({
                message: 'RSS parsing error',
                error: error.message,
            });
            return [];
        }
    }

    /**
     * Scout website using web scraping
     */
    private static async scoutWebsite(source: any): Promise<any[]> {
        try {
            const html = await WebScraperService.fetchHTML(source.url);
            const config = source.scraping_config || {};
            const rawData = WebScraperService.extractData(html, config.selectors || {});

            const tenders: any[] = [];

            for (const item of rawData) {
                tenders.push({
                    title: item.title || '',
                    description: item.description || '',
                    url: item.link || source.url,
                    organization: item.organization || '',
                    estimatedValue: item.value ? WebScraperService.parseCurrency(item.value) : null,
                    deadline: item.deadline ? WebScraperService.parseDate(item.deadline, config.dateFormat) : null,
                    location: item.location || 'India',
                });
            }

            return tenders;
        } catch (error: any) {
            logger.error({
                message: 'Website scraping error',
                error: error.message,
            });
            return [];
        }
    }

    /**
     * Calculate relevance score (0-100)
     */
    private static calculateRelevance(tender: any, interest: any): { score: number; matchedKeywords: string[] } {
        let score = 0;
        const keywords = this.safeParse(interest.keywords);
        const tenderText = `${tender.title} ${tender.description}`.toLowerCase();
        const matchedKeywords = new Set<string>();

        // Base score for Google results (they already matched our search query)
        score += 20;

        // Keyword matching (50%) - improved matching logic
        let keywordScore = 0;
        let matchedCount = 0;

        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();

            // Exact match (full credit)
            if (tenderText.includes(keywordLower)) {
                keywordScore += 1;
                matchedCount++;
                matchedKeywords.add(keywordLower);
            } else {
                // Partial word matching - check if any word in keyword appears
                const keywordWords = keywordLower.split(' ');
                let partialMatch = false;

                for (const word of keywordWords) {
                    if (word.length > 3 && tenderText.includes(word)) {
                        keywordScore += 0.5;
                        partialMatch = true;
                        break;
                    }
                }

                if (partialMatch) {
                    matchedCount++;
                    matchedKeywords.add(keywordLower);
                }
            }
        }

        // Give credit if at least some keywords matched
        if (matchedCount > 0) {
            score += (keywordScore / keywords.length) * 50;
        }

        // Value range (15%)
        if (tender.estimatedValue && interest.min_value && interest.max_value) {
            if (tender.estimatedValue >= interest.min_value && tender.estimatedValue <= interest.max_value) {
                score += 15;
            }
        }

        // Region matching (10%)
        if (interest.regions) {
            const regions = this.safeParse(interest.regions);
            if (regions.includes('India') && tender.location?.includes('India')) {
                score += 10;
            }
        } else {
            score += 10; // Default if no region specified
        }

        // Deadline proximity (5%)
        if (tender.deadline) {
            const daysUntil = Math.floor((new Date(tender.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntil >= 7 && daysUntil <= 60) {
                score += 5;
            } else if (daysUntil > 0) {
                score += 3;
            }
        }

        return {
            score: Math.min(Math.round(score), 100),
            matchedKeywords: Array.from(matchedKeywords),
        };
    }

    /**
     * Save tender result to database
     */
    private static async saveTenderResult(
        tender: any,
        sourceId: number,
        interestId: number,
        relevanceScore: number,
        matchedKeywords: string[]
    ): Promise<boolean> {
        try {
            // Generate external ID from URL or title
            const externalId = tender.url ?
                Buffer.from(tender.url).toString('base64').substring(0, 255) :
                Buffer.from(tender.title).toString('base64').substring(0, 255);

            // Check if already exists
            const [existing] = await db.query(
                'SELECT id FROM tender_scout_results WHERE external_id = ? AND source_id = ?',
                [externalId, sourceId]
            );

            if ((existing as any[]).length > 0) {
                return false; // Already exists
            }

            // Generate AI summary if relevance is high
            let aiSummary = null;
            if (relevanceScore >= 70) {
                try {
                    aiSummary = await this.generateTenderSummary(tender);
                } catch (error) {
                    logger.warn('Failed to generate AI summary');
                }
            }

            await db.query(
                `INSERT INTO tender_scout_results 
        (source_id, interest_id, external_id, title, description, url, organization, 
         estimated_value, currency, deadline, location, raw_data, matched_keywords, ai_summary, relevance_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    sourceId,
                    interestId,
                    externalId,
                    tender.title?.substring(0, 500) || '',
                    tender.description?.substring(0, 5000) || '',
                    tender.url?.substring(0, 500) || '',
                    tender.organization?.substring(0, 255) || '',
                    tender.estimatedValue || null,
                    tender.currency || 'INR',
                    tender.deadline || null,
                    tender.location || 'India',
                    JSON.stringify(tender),
                    matchedKeywords.length > 0 ? JSON.stringify(matchedKeywords) : null,
                    aiSummary,
                    relevanceScore,
                ]
            );

            return true;
        } catch (error: any) {
            logger.error({
                message: 'Failed to save tender result',
                error: error.message,
            });
            return false;
        }
    }

    /**
     * Generate AI summary for discovered tender
     */
    private static async generateTenderSummary(tender: any): Promise<string> {
        try {
            return await AIService.generateTenderSummary(tender, []);
        } catch (error) {
            return 'AI summary generation failed.';
        }
    }

    /**
     * Extract organization from URL
     */
    private static extractOrganization(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '').split('.')[0];
        } catch (error) {
            return '';
        }
    }

    /**
     * Create scout log entry
     */
    private static async createLog(sourceId: number): Promise<number> {
        const [result] = await db.query(
            'INSERT INTO tender_scout_logs (source_id, status) VALUES (?, ?)',
            [sourceId, 'running']
        );
        return (result as any).insertId;
    }

    /**
     * Complete scout log entry
     */
    private static async completeLog(
        logId: number,
        status: string,
        found: number,
        newCount: number,
        executionTime: number,
        errorMessage?: string
    ): Promise<void> {
        await db.query(
            `UPDATE tender_scout_logs 
       SET completed_at = NOW(), status = ?, tenders_found = ?, tenders_new = ?, 
           execution_time_ms = ?, error_message = ?
       WHERE id = ?`,
            [status, found, newCount, executionTime, errorMessage || null, logId]
        );
    }

    /**
     * Import discovered tender to main tenders table
     */
    static async importTender(resultId: number, userId: number): Promise<number> {
        try {
            // Get the scout result
            const [results] = await db.query(
                'SELECT * FROM tender_scout_results WHERE id = ?',
                [resultId]
            );

            const result = (results as any[])[0];
            if (!result) {
                throw new CustomError('Scout result not found', 404);
            }

            // Generate unique tender number
            const tenderNumber = `SCOUT-${Date.now()}-${resultId}`;

            // Insert into tenders table
            const [insertResult] = await db.query(
                `INSERT INTO tenders 
        (tender_number, title, description, status, priority, estimated_value, currency, 
         submission_deadline, created_by, assigned_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    tenderNumber,
                    result.title,
                    result.description || `Discovered from: ${result.url}\n\n${result.ai_summary || ''}`,
                    'Draft',
                    result.relevance_score >= 80 ? 'High' : 'Medium',
                    result.estimated_value,
                    result.currency,
                    result.deadline,
                    userId,
                    userId,
                ]
            );

            const tenderId = (insertResult as any).insertId;

            // Update scout result
            await db.query(
                `UPDATE tender_scout_results 
         SET status = ?, imported_tender_id = ?, reviewed_at = NOW(), reviewed_by = ?
         WHERE id = ?`,
                ['imported', tenderId, userId, resultId]
            );

            return tenderId;
        } catch (error: any) {
            logger.error({
                message: 'Failed to import tender',
                error: error.message,
            });
            throw error;
        }
    }
}
