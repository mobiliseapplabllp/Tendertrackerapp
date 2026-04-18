import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import logger from '../utils/logger';

// Valid role columns that can be updated
const VALID_ROLES = ['viewer', 'user', 'manager'] as const;
type RoleType = typeof VALID_ROLES[number];

// Group ordering for consistent display
const GROUP_ORDER = [
  'DASHBOARDS & VIEWS',
  'CRM & SALES',
  'TENDER MANAGEMENT',
  'MARKETING',
  'DOCUMENTS',
  'SYSTEM',
];

// Default permission seed data for reset
const DEFAULT_PERMISSIONS = [
  // DASHBOARDS & VIEWS
  { key: 'view_dashboards', label: 'View Dashboards', desc: 'Access dashboards and overview pages', group: 'DASHBOARDS & VIEWS', sort: 1, viewer: true, user: true, manager: true, admin: true },
  { key: 'view_reports', label: 'View Reports', desc: 'Access reports and analytics', group: 'DASHBOARDS & VIEWS', sort: 2, viewer: true, user: true, manager: true, admin: true },
  // CRM & SALES
  { key: 'view_leads', label: 'View Leads', desc: 'See lead listings and details', group: 'CRM & SALES', sort: 1, viewer: true, user: true, manager: true, admin: true },
  { key: 'create_leads', label: 'Create Leads', desc: 'Create new leads', group: 'CRM & SALES', sort: 2, viewer: false, user: true, manager: true, admin: true },
  { key: 'edit_leads', label: 'Edit Leads', desc: 'Modify existing leads', group: 'CRM & SALES', sort: 3, viewer: false, user: true, manager: true, admin: true },
  { key: 'delete_leads', label: 'Delete Leads', desc: 'Remove leads from system', group: 'CRM & SALES', sort: 4, viewer: false, user: false, manager: true, admin: true },
  { key: 'view_companies', label: 'View Companies', desc: 'Access company directory', group: 'CRM & SALES', sort: 5, viewer: true, user: true, manager: true, admin: true },
  { key: 'manage_companies', label: 'Manage Companies', desc: 'Create and edit companies', group: 'CRM & SALES', sort: 6, viewer: false, user: true, manager: true, admin: true },
  { key: 'view_sales_hub', label: 'View Sales Hub', desc: 'Access sales pipeline and hub', group: 'CRM & SALES', sort: 7, viewer: false, user: true, manager: true, admin: true },
  { key: 'manage_teams', label: 'Manage Teams', desc: 'Configure team structure and assignments', group: 'CRM & SALES', sort: 8, viewer: false, user: false, manager: true, admin: true },
  { key: 'manage_targets', label: 'Manage Targets', desc: 'Set and modify sales targets', group: 'CRM & SALES', sort: 9, viewer: false, user: false, manager: true, admin: true },
  { key: 'manage_products', label: 'Manage Products', desc: 'Product catalog management', group: 'CRM & SALES', sort: 10, viewer: false, user: false, manager: true, admin: true },
  // TENDER MANAGEMENT
  { key: 'view_tenders', label: 'View Tenders', desc: 'Access tender listings', group: 'TENDER MANAGEMENT', sort: 1, viewer: true, user: true, manager: true, admin: true },
  { key: 'create_tenders', label: 'Create Tenders', desc: 'Create new tenders', group: 'TENDER MANAGEMENT', sort: 2, viewer: false, user: true, manager: true, admin: true },
  { key: 'manage_tenders', label: 'Manage Tenders', desc: 'Edit and delete tenders', group: 'TENDER MANAGEMENT', sort: 3, viewer: false, user: true, manager: true, admin: true },
  { key: 'tender_scout', label: 'Tender Scout', desc: 'Access tender scouting tools', group: 'TENDER MANAGEMENT', sort: 4, viewer: false, user: true, manager: true, admin: true },
  { key: 'ai_search', label: 'AI Search', desc: 'Use AI-powered search', group: 'TENDER MANAGEMENT', sort: 5, viewer: false, user: true, manager: true, admin: true },
  // MARKETING
  { key: 'view_campaigns', label: 'View Campaigns', desc: 'Access marketing campaigns', group: 'MARKETING', sort: 1, viewer: false, user: true, manager: true, admin: true },
  { key: 'manage_campaigns', label: 'Manage Campaigns', desc: 'Create and edit campaigns', group: 'MARKETING', sort: 2, viewer: false, user: true, manager: true, admin: true },
  { key: 'social_media', label: 'Social Media', desc: 'Access social media management', group: 'MARKETING', sort: 3, viewer: false, user: true, manager: true, admin: true },
  { key: 'email_marketing', label: 'Email Marketing', desc: 'Access email marketing', group: 'MARKETING', sort: 4, viewer: false, user: true, manager: true, admin: true },
  { key: 'lead_capture', label: 'Lead Capture', desc: 'Manage lead capture forms', group: 'MARKETING', sort: 5, viewer: false, user: false, manager: true, admin: true },
  // DOCUMENTS
  { key: 'view_documents', label: 'View Documents', desc: 'Access document management', group: 'DOCUMENTS', sort: 1, viewer: true, user: true, manager: true, admin: true },
  { key: 'manage_collateral', label: 'Manage Collateral', desc: 'Upload and manage collateral', group: 'DOCUMENTS', sort: 2, viewer: false, user: true, manager: true, admin: true },
  { key: 'share_collateral', label: 'Share Collateral', desc: 'Share collateral externally', group: 'DOCUMENTS', sort: 3, viewer: false, user: true, manager: true, admin: true },
  // SYSTEM
  { key: 'manage_users', label: 'User Management', desc: 'Create and manage users', group: 'SYSTEM', sort: 1, viewer: false, user: false, manager: false, admin: true },
  { key: 'manage_settings', label: 'System Settings', desc: 'Access system configuration', group: 'SYSTEM', sort: 2, viewer: false, user: false, manager: false, admin: true },
  { key: 'manage_categories', label: 'Categories & Tags', desc: 'Manage categories and tags', group: 'SYSTEM', sort: 3, viewer: false, user: false, manager: false, admin: true },
];

export class PermissionController {

  /**
   * Get full permission matrix grouped by permission_group
   */
  static async getMatrix(_req: Request, res: Response, next: NextFunction) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM role_permissions ORDER BY permission_group, sort_order'
      );

      const permissions = rows as any[];

      // Group by permission_group, preserving defined order
      const groupMap = new Map<string, any[]>();
      for (const perm of permissions) {
        const group = perm.permission_group;
        if (!groupMap.has(group)) {
          groupMap.set(group, []);
        }
        groupMap.get(group)!.push({
          id: perm.id,
          permissionKey: perm.permission_key,
          label: perm.permission_label,
          description: perm.permission_description,
          group: perm.permission_group,
          sortOrder: perm.sort_order,
          roleViewer: !!perm.role_viewer,
          roleUser: !!perm.role_user,
          roleManager: !!perm.role_manager,
          roleAdmin: !!perm.role_admin,
        });
      }

      // Build sorted groups array
      const groups = GROUP_ORDER
        .filter(name => groupMap.has(name))
        .map(name => ({
          name,
          permissions: groupMap.get(name)!,
        }));

      // Add any groups not in our predefined order
      for (const [name, perms] of groupMap) {
        if (!GROUP_ORDER.includes(name)) {
          groups.push({ name, permissions: perms });
        }
      }

      res.json({ success: true, data: { groups } });
    } catch (error: any) {
      logger.error({ message: 'Error fetching permission matrix', error: error.message });
      next(error);
    }
  }

  /**
   * Update a single permission toggle
   * Body: { permissionKey: string, role: string, enabled: boolean }
   */
  static async updatePermission(req: Request, res: Response, next: NextFunction) {
    try {
      const { permissionKey, role, enabled } = req.body;

      if (!permissionKey || !role || typeof enabled !== 'boolean') {
        throw new CustomError('Missing required fields: permissionKey, role, enabled', 400);
      }

      // Validate role
      if (!VALID_ROLES.includes(role as RoleType)) {
        throw new CustomError(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(', ')}`, 400);
      }

      const column = `role_${role}`;

      const [result] = await db.query(
        `UPDATE role_permissions SET ${column} = ? WHERE permission_key = ?`,
        [enabled, permissionKey]
      );

      const updateResult = result as any;
      if (updateResult.affectedRows === 0) {
        throw new CustomError(`Permission not found: ${permissionKey}`, 404);
      }

      logger.info({
        message: 'Permission updated',
        permissionKey,
        role,
        enabled,
        updatedBy: req.user?.userId,
      });

      res.json({ success: true, data: { permissionKey, role, enabled } });
    } catch (error: any) {
      if (error instanceof CustomError) return next(error);
      logger.error({ message: 'Error updating permission', error: error.message });
      next(error);
    }
  }

  /**
   * Bulk update all permissions in a group for a role
   * Body: { group: string, role: string, enabled: boolean }
   */
  static async bulkUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { group, role, enabled } = req.body;

      if (!group || !role || typeof enabled !== 'boolean') {
        throw new CustomError('Missing required fields: group, role, enabled', 400);
      }

      if (!VALID_ROLES.includes(role as RoleType)) {
        throw new CustomError(`Invalid role: ${role}. Must be one of: ${VALID_ROLES.join(', ')}`, 400);
      }

      const column = `role_${role}`;

      const [result] = await db.query(
        `UPDATE role_permissions SET ${column} = ? WHERE permission_group = ?`,
        [enabled, group]
      );

      const updateResult = result as any;

      logger.info({
        message: 'Bulk permission update',
        group,
        role,
        enabled,
        affectedRows: updateResult.affectedRows,
        updatedBy: req.user?.userId,
      });

      res.json({
        success: true,
        data: { group, role, enabled, affectedRows: updateResult.affectedRows },
      });
    } catch (error: any) {
      if (error instanceof CustomError) return next(error);
      logger.error({ message: 'Error in bulk permission update', error: error.message });
      next(error);
    }
  }

  /**
   * Reset all permissions to defaults
   */
  static async resetDefaults(_req: Request, res: Response, next: NextFunction) {
    try {
      // Update each permission to its default value
      for (const perm of DEFAULT_PERMISSIONS) {
        await db.query(
          `UPDATE role_permissions
           SET role_viewer = ?, role_user = ?, role_manager = ?, role_admin = ?
           WHERE permission_key = ?`,
          [perm.viewer, perm.user, perm.manager, perm.admin, perm.key]
        );
      }

      logger.info({
        message: 'Permissions reset to defaults',
        updatedBy: (_req as any).user?.userId,
      });

      res.json({ success: true, data: { message: 'Permissions reset to defaults' } });
    } catch (error: any) {
      logger.error({ message: 'Error resetting permissions', error: error.message });
      next(error);
    }
  }
}
