# CRM Migration Plan - Safe Incremental Approach

## Strategy: Parallel Implementation with Gradual Migration

To avoid breaking the software, we'll use a **parallel implementation** strategy where both "tender" and "lead" systems coexist initially, then gradually migrate.

## Phase 1: Database Foundation (SAFE - No Breaking Changes)

### Status: ✅ COMPLETED
- [x] Create new tables (lead_types, sales_stages, activity_types, calls, meetings, etc.)
- [x] Add new columns to existing tenders table (lead_type_id, sales_stage_id, etc.)
- [x] Keep existing tenders table intact
- [x] All existing functionality continues to work

### Migration Scripts Created:
- `004_add_lead_types.sql` - Creates lead_types table
- `005_add_sales_stages.sql` - Creates sales_stages and pipeline_config
- `006_add_activity_types.sql` - Creates activity tracking tables
- `007_rename_tenders_to_leads.sql` - **DO NOT RUN YET** - This is the breaking change
- `008_rename_tender_tables.sql` - **DO NOT RUN YET**
- `009_add_deals_table.sql` - Creates deals and sales_forecasts

### Action Items:
1. Run migrations 004, 005, 006, 009 (safe - only adds new tables/columns)
2. **DO NOT run migrations 007, 008 yet** (these rename tables and break existing code)

## Phase 2: Backend API - Parallel Implementation (SAFE)

### Strategy: Support Both Endpoints Temporarily

### Step 2.1: Keep Existing TenderController Working
- ✅ Keep `tenderController.ts` as-is
- ✅ Keep `/api/v1/tenders` routes working
- ✅ All existing frontend code continues to work

### Step 2.2: Add New LeadController (Parallel)
- ✅ Created `leadController.ts` (needs completion)
- ✅ Created `/api/v1/leads` routes
- ✅ Add to app.ts alongside existing routes
- ⚠️ **Fix remaining "tender" references in leadController.ts**

### Step 2.3: Update Services to Support Both
- Update `notificationService.ts` to support both tender and lead terminology
- Update `documentService.ts` to work with both tender_id and lead_id
- Update `aiService.ts` methods to accept both

### Action Items:
1. Complete LeadController by fixing all remaining "tender" references
2. Add both routes to app.ts: `/tenders` (existing) and `/leads` (new)
3. Update services to handle both entity types
4. Test that both endpoints work independently

## Phase 3: Frontend - Gradual Component Migration (SAFE)

### Strategy: Create New Components, Keep Old Ones

### Step 3.1: Create New Lead Components (Parallel)
- Create `LeadDashboard.tsx` (copy from TenderDashboard)
- Create `LeadDetailsPage.tsx` (copy from TenderDetailsPage)
- Create `CreateLeadDialog.tsx` (copy from CreateTenderDialog)
- Keep old components working

### Step 3.2: Update Types Gradually
- Add new `Lead` type alongside existing `Tender` type
- Update API client to support both endpoints
- Frontend can use either endpoint

### Step 3.3: Add Feature Flag
- Add environment variable or config: `USE_LEADS=true/false`
- Sidebar shows "Tenders" or "Leads" based on flag
- Allows easy rollback

### Action Items:
1. Create new Lead* components (don't delete Tender* yet)
2. Update Sidebar to conditionally show Tenders or Leads
3. Update App.tsx to route to appropriate component
4. Test both paths work

## Phase 4: Data Migration (CAREFUL - Requires Testing)

### Strategy: Run in Development First, Then Production

### Step 4.1: Test Migration Scripts
- Create test script that:
  1. Backs up database
  2. Runs migrations 007, 008
  3. Verifies data integrity
  4. Tests API endpoints

### Step 4.2: Run Migration in Development
- Run migrations 007, 008 in dev environment
- Test all functionality
- Fix any issues

### Step 4.3: Update Code to Use New Table Names
- Update LeadController to use `leads` table
- Update TenderController to use `leads` table (or deprecate)
- Update all services

### Action Items:
1. Create backup script
2. Create migration test script
3. Run in dev environment
4. Fix any issues
5. Document rollback procedure

## Phase 5: Frontend Migration (After Backend Stable)

### Strategy: Switch Over Gradually

### Step 5.1: Update All Components
- Rename TenderDashboard → LeadDashboard (delete old)
- Rename TenderDetailsPage → LeadDetailsPage (delete old)
- Update all imports
- Update all API calls to use `/leads`

### Step 5.2: Update Terminology
- Replace "Tender" with "Lead" in UI
- Update all labels, tooltips, messages
- Update documentation

### Action Items:
1. Update component names
2. Update all API calls
3. Update UI text
4. Test thoroughly

## Phase 6: Cleanup (Final Step)

### Remove Old Code
- Delete TenderController (or keep as deprecated)
- Delete old routes
- Remove feature flags
- Update documentation

## Risk Mitigation

### 1. Database Backup
- Always backup before running migrations
- Test migrations in dev first
- Have rollback scripts ready

### 2. Feature Flags
- Use feature flags to switch between old/new
- Easy rollback if issues found
- Gradual rollout to users

### 3. Parallel Support
- Keep both systems working during transition
- Allows gradual migration
- No forced cutover

### 4. Testing Strategy
- Test each phase independently
- Integration tests for both paths
- User acceptance testing

## Current Status

### ✅ Completed:
- Database migration files created (004, 005, 006, 009)
- LeadController created (needs completion)
- Leads routes created
- App.ts updated to include leads routes

### ⚠️ In Progress:
- Fix remaining "tender" references in LeadController
- Complete LeadController methods
- Update services to support both

### 📋 Next Steps (Priority Order):
1. **Complete LeadController** - Fix all "tender" references
2. **Update Services** - Make them work with both tender_id and lead_id
3. **Test Backend** - Ensure both /tenders and /leads work
4. **Create Frontend Components** - New Lead* components
5. **Add Feature Flag** - Allow switching between old/new
6. **Test Migration** - Run migrations 007, 008 in dev
7. **Frontend Migration** - Switch to new components
8. **Cleanup** - Remove old code

## Rollback Plan

If something breaks:

1. **Database Rollback:**
   - Use migration DOWN scripts
   - Restore from backup

2. **Code Rollback:**
   - Revert to previous git commit
   - Keep old routes active
   - Disable new routes via feature flag

3. **Frontend Rollback:**
   - Switch feature flag back to "tenders"
   - Use old components
   - Revert API calls

## Testing Checklist

Before each phase:
- [ ] Database backup created
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Rollback procedure tested
- [ ] Documentation updated

## Timeline Estimate

- Phase 1: ✅ Complete
- Phase 2: 2-3 days (backend parallel implementation)
- Phase 3: 2-3 days (frontend parallel components)
- Phase 4: 1-2 days (data migration testing)
- Phase 5: 2-3 days (frontend migration)
- Phase 6: 1 day (cleanup)

**Total: ~10-14 days for safe migration**


