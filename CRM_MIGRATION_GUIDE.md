# CRM Migration Guide

This guide explains how to migrate from the Tender Tracking System to the Lead Management System (CRM).

## Overview

The CRM transformation adds comprehensive lead management, sales pipeline, activity tracking, and deal management features while maintaining backward compatibility with the existing tender system.

## Migration Strategy

### Phase 1: Safe Migrations (No Data Loss)

These migrations add new tables and columns without modifying existing data:

1. **004_add_lead_types.sql** - Creates `lead_types` table
2. **005_add_sales_stages.sql** - Creates `sales_stages` and `pipeline_config` tables
3. **006_add_activity_types.sql** - Creates `calls`, `meetings`, `emails`, `tasks` tables
4. **009_add_deals_table.sql** - Creates `deals` table

**Run these first:**
```bash
cd backend
npm run migrate:crm
```

Or manually:
```bash
npx ts-node scripts/run-crm-migrations.ts safe
```

### Phase 2: Table Rename Migrations (Requires Testing)

These migrations rename tables and update foreign keys:

1. **007_rename_tenders_to_leads.sql** - Renames `tenders` to `leads`
2. **008_rename_tender_tables.sql** - Renames related tables

**⚠️ WARNING: Test these in a development environment first!**

```bash
# After testing in dev
npm run migrate:crm:rename
```

Or manually:
```bash
npx ts-node scripts/run-crm-migrations.ts rename
```

## Pre-Migration Checklist

- [ ] Backup your database
- [ ] Test migrations in a development environment
- [ ] Verify all existing functionality still works
- [ ] Review migration scripts for your specific setup
- [ ] Ensure you have rollback plan

## Post-Migration Steps

1. **Verify Data Integrity**
   ```sql
   SELECT COUNT(*) FROM leads; -- Should match previous tenders count
   SELECT COUNT(*) FROM lead_types; -- Should have default types
   SELECT COUNT(*) FROM sales_stages; -- Should have default stages
   ```

2. **Update Application Configuration**
   - Verify API endpoints are working
   - Test lead creation
   - Test pipeline view
   - Test activity tracking

3. **Train Users**
   - New lead types
   - Sales pipeline usage
   - Activity tracking features
   - Deal management

## Rollback Plan

If you need to rollback:

1. **For Safe Migrations (004, 005, 006, 009)**
   - These can be safely dropped if needed:
   ```sql
   DROP TABLE IF EXISTS deals;
   DROP TABLE IF EXISTS tasks;
   DROP TABLE IF EXISTS emails;
   DROP TABLE IF EXISTS meetings;
   DROP TABLE IF EXISTS calls;
   DROP TABLE IF EXISTS pipeline_config;
   DROP TABLE IF EXISTS sales_stages;
   DROP TABLE IF EXISTS lead_types;
   ```

2. **For Table Rename Migrations (007, 008)**
   - Use the DOWN sections in the migration files
   - Restore from backup if needed

## Data Migration Notes

- Existing tenders will automatically become leads with type "Tender"
- Default sales stage "New" will be assigned to existing records
- All existing data is preserved
- Foreign key relationships are maintained

## Troubleshooting

### Migration Fails
1. Check database connection
2. Verify user has necessary permissions
3. Check for existing tables/columns
4. Review error messages in migration script

### Data Issues After Migration
1. Verify foreign key constraints
2. Check for orphaned records
3. Review activity logs
4. Restore from backup if needed

## Support

For migration issues:
- Review migration scripts in `backend/database/migrations/`
- Check logs in `backend/logs/`
- Test in development environment first


