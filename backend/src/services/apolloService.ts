import db from '../config/database';
import logger from '../utils/logger';

const APOLLO_API_KEY = process.env.APOLLO_API_KEY || '';
const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1';

export class ApolloService {

  /**
   * Generic Apollo API caller with x-api-key header auth.
   */
  private static async apiCall(endpoint: string, data: any): Promise<any> {
    if (!APOLLO_API_KEY) {
      throw new Error('Apollo API key not configured. Set APOLLO_API_KEY in environment.');
    }

    const response = await fetch(`${APOLLO_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': APOLLO_API_KEY,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Apollo API error ${response.status}: ${errText}`);
    }

    return response.json();
  }

  /**
   * Search for people in Apollo's database.
   */
  static async searchPeople(criteria: {
    person_titles?: string[];
    person_locations?: string[];
    organization_locations?: string[];
    person_seniorities?: string[];
    q_keywords?: string;
    organization_num_employees_ranges?: string[];
    q_organization_keyword_tags?: string[];
    page?: number;
    per_page?: number;
  }): Promise<any> {
    return this.apiCall('/mixed_people/search', {
      ...criteria,
      page: criteria.page || 1,
      per_page: criteria.per_page || 25,
    });
  }

  /**
   * Search for companies in Apollo's database.
   */
  static async searchCompanies(criteria: {
    q_organization_name?: string;
    organization_locations?: string[];
    organization_num_employees_ranges?: string[];
    q_organization_keyword_tags?: string[];
    page?: number;
    per_page?: number;
  }): Promise<any> {
    return this.apiCall('/mixed_companies/search', {
      ...criteria,
      page: criteria.page || 1,
      per_page: criteria.per_page || 25,
    });
  }

  /**
   * Enrich a person by email/name/domain.
   */
  static async enrichPerson(data: {
    email?: string;
    first_name?: string;
    last_name?: string;
    domain?: string;
    organization_name?: string;
  }): Promise<any> {
    return this.apiCall('/people/match', data);
  }

  /**
   * Enrich a company by domain.
   */
  static async enrichOrganization(domain: string): Promise<any> {
    return this.apiCall('/organizations/enrich', { domain });
  }

  /**
   * Import Apollo people results into CRM (companies + contacts + optional email list).
   * Deduplicates by email. Returns { imported, skipped, errors }.
   */
  static async importToCRM(
    people: any[],
    userId: number,
    listId?: number
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const person of people) {
      try {
        const email = person.email;
        const firstName = person.first_name || '';
        const lastName = person.last_name || '';
        const orgName = person.organization?.name || person.organization_name || '';
        const orgDomain = person.organization?.primary_domain || person.domain || '';
        const personTitle = person.title || person.headline || '';
        const linkedinUrl = person.linkedin_url || '';
        const apolloContactId = person.id || '';
        const apolloOrgId = person.organization?.id || person.organization_id || '';
        const orgIndustry = person.organization?.industry || '';
        const orgPhone = person.organization?.phone || '';
        const orgWebsite = orgDomain ? `https://${orgDomain}` : '';
        const orgCity = person.organization?.city || person.city || '';
        const orgCountry = person.organization?.country || person.country || '';
        const employeeCount = person.organization?.estimated_num_employees || null;

        // Skip if no email — can't dedup without it
        if (!email) {
          skipped++;
          continue;
        }

        // Check if contact already exists by email
        const [existingContacts] = await db.query(
          'SELECT id, company_id FROM contacts WHERE email = ?',
          [email]
        );

        if ((existingContacts as any[]).length > 0) {
          // Update existing contact with Apollo data (only fill NULLs)
          const existing = (existingContacts as any[])[0];
          await db.query(
            `UPDATE contacts
             SET apollo_contact_id = COALESCE(apollo_contact_id, ?),
                 linkedin_url = COALESCE(linkedin_url, ?),
                 title = COALESCE(title, ?)
             WHERE id = ?`,
            [apolloContactId, linkedinUrl, personTitle, existing.id]
          );

          // Add to email list if specified
          if (listId) {
            await db.query(
              `INSERT IGNORE INTO email_marketing_list_members (list_id, email, name, company_name, status, contact_id)
               VALUES (?, ?, ?, ?, 'active', ?)`,
              [listId, email, `${firstName} ${lastName}`.trim(), orgName, existing.id]
            );
          }
          skipped++;
          continue;
        }

        // ---- Find or create company ----
        let companyId: number | null = null;
        if (orgName) {
          const [existingCompanies] = await db.query(
            'SELECT id FROM companies WHERE company_name = ? OR (website IS NOT NULL AND website != \'\' AND website = ?)',
            [orgName, orgWebsite]
          );

          if ((existingCompanies as any[]).length > 0) {
            companyId = (existingCompanies as any[])[0].id;
            // Backfill Apollo data onto existing company
            await db.query(
              `UPDATE companies
               SET apollo_org_id = COALESCE(apollo_org_id, ?),
                   linkedin_url = COALESCE(linkedin_url, ?),
                   employee_count = COALESCE(employee_count, ?),
                   industry = COALESCE(industry, ?)
               WHERE id = ?`,
              [apolloOrgId, '', employeeCount, orgIndustry, companyId]
            );
          } else {
            // Create company
            const [companyResult] = await db.query(
              `INSERT INTO companies (company_name, industry, website, phone, city, country, status, apollo_org_id, employee_count, created_by)
               VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?)`,
              [orgName, orgIndustry, orgWebsite, orgPhone, orgCity, orgCountry, apolloOrgId, employeeCount, userId]
            );
            companyId = (companyResult as any).insertId;
          }
        }

        // ---- Create contact ----
        const [contactResult] = await db.query(
          `INSERT INTO contacts (company_id, first_name, last_name, email, position, title, linkedin_url, apollo_contact_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [companyId, firstName, lastName, email, personTitle, personTitle, linkedinUrl, apolloContactId]
        );
        const contactId = (contactResult as any).insertId;

        // Add to email list if specified
        if (listId) {
          await db.query(
            `INSERT IGNORE INTO email_marketing_list_members (list_id, email, name, company_name, status, contact_id)
             VALUES (?, ?, ?, ?, 'active', ?)`,
            [listId, email, `${firstName} ${lastName}`.trim(), orgName, contactId]
          );
        }

        imported++;
      } catch (err: any) {
        errors.push(`${person.email || 'unknown'}: ${err.message}`);
        logger.error({ message: 'Apollo import error for person', email: person.email, error: err.message });
      }
    }

    return { imported, skipped, errors };
  }
}
