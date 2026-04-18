import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { ApolloService } from '../services/apolloService';
import logger from '../utils/logger';

export class ApolloController {

  /**
   * POST /apollo/search-people
   * Proxy search to Apollo People API and return results.
   */
  static async searchPeople(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ApolloService.searchPeople(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      logger.error({ message: 'Apollo searchPeople error', error: err.message });
      next(new CustomError(err.message, 502));
    }
  }

  /**
   * POST /apollo/search-companies
   * Proxy search to Apollo Company API and return results.
   */
  static async searchCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ApolloService.searchCompanies(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      logger.error({ message: 'Apollo searchCompanies error', error: err.message });
      next(new CustomError(err.message, 502));
    }
  }

  /**
   * POST /apollo/import
   * Import Apollo people results into CRM contacts / companies.
   * Body: { people: [...], listId?: number }
   */
  static async importContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const { people, listId } = req.body;
      const userId = req.user!.userId;

      if (!Array.isArray(people) || people.length === 0) {
        throw new CustomError('people array is required and must not be empty', 400);
      }

      const result = await ApolloService.importToCRM(people, userId, listId);

      // Log to apollo_import_log
      await db.query(
        `INSERT INTO apollo_import_log (import_type, search_criteria, results_count, imported_count, skipped_count, imported_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          'people_search',
          JSON.stringify({ listId, totalProvided: people.length }),
          people.length,
          result.imported,
          result.skipped,
          userId,
        ]
      );

      res.json({
        success: true,
        data: {
          imported: result.imported,
          skipped: result.skipped,
          errors: result.errors,
        },
        message: `Imported ${result.imported} contacts, skipped ${result.skipped}`,
      });
    } catch (err: any) {
      next(err instanceof CustomError ? err : new CustomError(err.message, 500));
    }
  }

  /**
   * POST /apollo/enrich-company/:id
   * Enrich an existing CRM company with Apollo organization data.
   */
  static async enrichCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = parseInt(req.params.id, 10);

      // Get company from DB
      const [companies] = await db.query('SELECT * FROM companies WHERE id = ?', [companyId]);
      const company = (companies as any[])[0];
      if (!company) throw new CustomError('Company not found', 404);

      // We need a domain to enrich — try website
      let domain = '';
      if (company.website) {
        try {
          domain = new URL(company.website).hostname.replace(/^www\./, '');
        } catch {
          domain = company.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }
      }

      if (!domain) {
        throw new CustomError('Company has no website/domain. Cannot enrich without a domain.', 400);
      }

      const apolloData = await ApolloService.enrichOrganization(domain);
      const org = apolloData.organization;

      if (!org) {
        throw new CustomError('Apollo returned no organization data for this domain', 404);
      }

      // Update company with enriched data
      await db.query(
        `UPDATE companies SET
           apollo_org_id = COALESCE(?, apollo_org_id),
           industry = COALESCE(?, industry),
           employee_count = COALESCE(?, employee_count),
           annual_revenue = COALESCE(?, annual_revenue),
           linkedin_url = COALESCE(?, linkedin_url),
           phone = COALESCE(?, phone),
           city = COALESCE(?, city),
           country = COALESCE(?, country)
         WHERE id = ?`,
        [
          org.id || null,
          org.industry || null,
          org.estimated_num_employees || null,
          org.annual_revenue || null,
          org.linkedin_url || null,
          org.phone || null,
          org.city || null,
          org.country || null,
          companyId,
        ]
      );

      // Log enrichment
      await db.query(
        `INSERT INTO apollo_import_log (import_type, search_criteria, results_count, imported_count, skipped_count, imported_by)
         VALUES ('enrichment', ?, 1, 1, 0, ?)`,
        [JSON.stringify({ companyId, domain }), req.user!.userId]
      );

      // Return updated company
      const [updated] = await db.query('SELECT * FROM companies WHERE id = ?', [companyId]);
      res.json({
        success: true,
        data: (updated as any[])[0],
        message: 'Company enriched with Apollo data',
      });
    } catch (err: any) {
      next(err instanceof CustomError ? err : new CustomError(err.message, 502));
    }
  }

  /**
   * POST /apollo/enrich-contact/:id
   * Enrich an existing CRM contact with Apollo person data.
   */
  static async enrichContact(req: Request, res: Response, next: NextFunction) {
    try {
      const contactId = parseInt(req.params.id, 10);

      // Get contact from DB
      const [contacts] = await db.query(
        `SELECT c.*, co.company_name, co.website
         FROM contacts c
         LEFT JOIN companies co ON co.id = c.company_id
         WHERE c.id = ?`,
        [contactId]
      );
      const contact = (contacts as any[])[0];
      if (!contact) throw new CustomError('Contact not found', 404);

      // Build enrichment params
      const enrichParams: any = {};
      if (contact.email) enrichParams.email = contact.email;
      if (contact.first_name) enrichParams.first_name = contact.first_name;
      if (contact.last_name) enrichParams.last_name = contact.last_name;
      if (contact.company_name) enrichParams.organization_name = contact.company_name;
      if (contact.website) {
        try {
          enrichParams.domain = new URL(contact.website).hostname.replace(/^www\./, '');
        } catch {
          enrichParams.domain = contact.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        }
      }

      if (!enrichParams.email && !enrichParams.first_name) {
        throw new CustomError('Contact needs at least an email or name for enrichment', 400);
      }

      const apolloData = await ApolloService.enrichPerson(enrichParams);
      const person = apolloData.person;

      if (!person) {
        throw new CustomError('Apollo returned no person data for this contact', 404);
      }

      // Update contact with enriched data
      await db.query(
        `UPDATE contacts SET
           apollo_contact_id = COALESCE(?, apollo_contact_id),
           linkedin_url = COALESCE(?, linkedin_url),
           title = COALESCE(?, title),
           position = COALESCE(?, position),
           phone = COALESCE(?, phone)
         WHERE id = ?`,
        [
          person.id || null,
          person.linkedin_url || null,
          person.title || null,
          person.title || null,
          person.phone_numbers?.[0]?.sanitized_number || null,
          contactId,
        ]
      );

      // Log enrichment
      await db.query(
        `INSERT INTO apollo_import_log (import_type, search_criteria, results_count, imported_count, skipped_count, imported_by)
         VALUES ('enrichment', ?, 1, 1, 0, ?)`,
        [JSON.stringify({ contactId, email: contact.email }), req.user!.userId]
      );

      // Return updated contact
      const [updated] = await db.query('SELECT * FROM contacts WHERE id = ?', [contactId]);
      res.json({
        success: true,
        data: (updated as any[])[0],
        message: 'Contact enriched with Apollo data',
      });
    } catch (err: any) {
      next(err instanceof CustomError ? err : new CustomError(err.message, 502));
    }
  }

  /**
   * GET /apollo/import-history
   * Return paginated import log entries.
   */
  static async getImportHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 25;
      const offset = (page - 1) * pageSize;

      const [rows] = await db.query(
        `SELECT ail.*, u.full_name as imported_by_name
         FROM apollo_import_log ail
         LEFT JOIN users u ON u.id = ail.imported_by
         ORDER BY ail.created_at DESC
         LIMIT ? OFFSET ?`,
        [pageSize, offset]
      );

      const [countResult] = await db.query('SELECT COUNT(*) as total FROM apollo_import_log');
      const total = (countResult as any[])[0].total;

      res.json({
        success: true,
        data: {
          items: rows,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    } catch (err: any) {
      next(new CustomError(err.message, 500));
    }
  }

  /**
   * GET /apollo/config
   * Return whether Apollo API key is configured (boolean), no secrets exposed.
   */
  static async getConfig(_req: Request, res: Response, _next: NextFunction) {
    const isConfigured = !!(process.env.APOLLO_API_KEY);
    res.json({
      success: true,
      data: { isConfigured },
    });
  }
}
