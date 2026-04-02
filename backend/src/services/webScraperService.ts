import axios from 'axios';
import * as cheerio from 'cheerio';
import RobotsParser from 'robots-parser';
import logger from '../utils/logger';

export class WebScraperService {
    private static userAgents = [
        'MobiliseCRMBot/1.0 (+https://leadtrack.com/bot)',
        'Mozilla/5.0 (compatible; MobiliseCRMScout/1.0; +https://leadtrack.com)',
    ];

    private static getRandomUserAgent(): string {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    /**
     * Check robots.txt compliance
     */
    static async checkRobotsTxt(url: string): Promise<boolean> {
        try {
            const urlObj = new URL(url);
            const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;

            const response = await axios.get(robotsUrl, { timeout: 5000 });
            const robots = RobotsParser(robotsUrl, response.data);

            return robots.isAllowed(url, this.getRandomUserAgent()) || false;
        } catch (error) {
            // If robots.txt doesn't exist, assume allowed
            return true;
        }
    }

    /**
     * Fetch HTML content from URL
     */
    static async fetchHTML(url: string, retries = 3): Promise<string> {
        for (let i = 0; i < retries; i++) {
            try {
                // Check robots.txt
                const allowed = await this.checkRobotsTxt(url);
                if (!allowed) {
                    throw new Error('Blocked by robots.txt');
                }

                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': this.getRandomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                    },
                    timeout: 15000,
                    maxRedirects: 5,
                });

                return response.data;
            } catch (error: any) {
                logger.warn({
                    message: `Fetch attempt ${i + 1} failed for ${url}`,
                    error: error.message,
                });

                if (i === retries - 1) throw error;

                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }

        throw new Error('Failed to fetch HTML after retries');
    }

    /**
     * Extract data using CSS selectors
     */
    static extractData(html: string, selectors: any): any[] {
        const $ = cheerio.load(html);
        const results: any[] = [];

        const listSelector = selectors.tenderList || '.tender-item';

        $(listSelector).each((_index, element) => {
            try {
                const item: any = {};

                // Extract each field using configured selectors
                Object.keys(selectors).forEach(key => {
                    if (key !== 'tenderList' && key !== 'pagination') {
                        const selector = selectors[key];
                        const $el = $(element).find(selector);

                        if ($el.length > 0) {
                            // Check if selector targets an attribute (e.g., href)
                            if (selector.includes('@')) {
                                const [sel, attr] = selector.split('@');
                                item[key] = $(element).find(sel).attr(attr) || '';
                            } else {
                                item[key] = $el.text().trim();
                            }
                        }
                    }
                });

                if (item.title || item.link) {
                    results.push(item);
                }
            } catch (error: any) {
                logger.error({
                    message: 'Error extracting tender item',
                    error: error.message,
                });
            }
        });

        return results;
    }

    /**
     * Parse date string to ISO format
     */
    static parseDate(dateStr: string, format: string = 'DD/MM/YYYY'): string | null {
        try {
            // Simple date parsing - can be enhanced with moment.js or date-fns
            const parts = dateStr.match(/\d+/g);
            if (!parts || parts.length < 3) return null;

            let day, month, year;

            if (format === 'DD/MM/YYYY') {
                [day, month, year] = parts;
            } else if (format === 'MM/DD/YYYY') {
                [month, day, year] = parts;
            } else if (format === 'YYYY-MM-DD') {
                [year, month, day] = parts;
            } else {
                return null;
            }

            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch (error) {
            return null;
        }
    }

    /**
     * Parse currency value
     */
    static parseCurrency(valueStr: string): number | null {
        try {
            // Remove currency symbols and commas
            const cleaned = valueStr.replace(/[₹$€£,]/g, '').trim();
            const value = parseFloat(cleaned);
            return isNaN(value) ? null : value;
        } catch (error) {
            return null;
        }
    }
}
