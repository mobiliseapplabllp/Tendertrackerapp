# Safe CRM Migration Strategy

## Current Situation

We've started the CRM transformation but need to ensure we don't break the existing software. Here's the safe approach:

## ✅ What's Already Done (Safe - No Breaking Changes)

1. **Database Migrations Created** (but NOT run yet):
   - `004_add_lead_types.sql` - Adds new table (safe)
   - `005_add_sales_stages.sql` - Adds new tables (safe)
   - `006_add_activity_types.sql` - Adds new tables (safe)
   - `009_add_deals_table.sql` - Adds new tables (safe)
   - `007_rename_tenders_to_leads.sql` - **DO NOT RUN** - This breaks things
   - `008_rename_tender_tables.sql` - **DO NOT RUN** - This breaks things

2. **Backend Code**:
   - ✅ LeadController created (needs completion)
   - ✅ Leads routes created
   - ✅ App.ts updated to support both routes

## ⚠️ Critical Issues to Fix

### 1. LeadController Has Mixed References
The LeadController still has many "tender" variable names that need to be "lead". This is causing inconsistencies.

**Fix Strategy:**
- Use find/replace systematically
- Test each method after fixing
- Keep TenderController working in parallel

### 2. Database Table Names
Currently, LeadController references `leads` table, but it doesn't exist yet (still `tenders`).

**Fix Strategy:**
- Make LeadController work with `tenders` table initially
- After migration runs, update to `leads` table
- Use conditional logic: `const tableName = process.env.USE_LEADS_TABLE ? 'leads' : 'tenders'`

### 3. Frontend Still Uses Old Endpoints
All frontend code still calls `/api/v1/tenders`. This will break if we remove it.

**Fix Strategy:**
- Keep `/tenders` endpoint working
- Add `/leads` endpoint in parallel
- Gradually migrate frontend
- Use feature flag to switch

## Recommended Migration Path

### Phase 1: Complete Backend (Current Priority)

**Step 1.1: Fix LeadController to Work with Current Database**
- Update all queries to use `tenders` table (not `leads`)
- Update all references from `tender_*` to work with current schema
- Test that LeadController works with existing data

**Step 1.2: Run Safe Migrations**
```bash
# Run these (safe - only adds new tables/columns):
npm run migrate -- 004_add_lead_types
npm run migrate -- 005_add_sales_stages  
npm run migrate -- 006_add_activity_types
npm run migrate -- 009_add_deals_table
```

**Step 1.3: Update LeadController to Use New Columns**
- Add support for `lead_type_id`, `sales_stage_id`, etc.
- Still query from `tenders` table
- Add new CRM fields to responses

**Step 1.4: Test Both Endpoints**
- Test `/api/v1/tenders` - should work as before
- Test `/api/v1/leads` - should work with new fields
- Both should return same data (just different field names)

### Phase 2: Frontend Parallel Implementation

**Step 2.1: Create New Components (Don't Delete Old)**
- Copy TenderDashboard → LeadDashboard
- Copy TenderDetailsPage → LeadDetailsPage
- Update to use `/leads` API
- Keep old components working

**Step 2.2: Add Feature Flag**
```typescript
// In App.tsx or config
const USE_LEADS = process.env.REACT_APP_USE_LEADS === 'true';

// In Sidebar
{USE_LEADS ? 'Leads' : 'Tenders'}
```

**Step 2.3: Test Both Paths**
- Test with USE_LEADS=false (old path)
- Test with USE_LEADS=true (new path)
- Both should work

### Phase 3: Database Migration (After Everything Works)

**Step 3.1: Backup Database**
```bash
mysqldump -u user -p database_name > backup_before_migration.sql
```

**Step 3.2: Run Table Rename Migrations**
```bash
# Only after testing in dev environment
npm run migrate -- 007_rename_tenders_to_leads
npm run migrate -- 008_rename_tender_tables
```

**Step 3.3: Update Code to Use New Table Names**
- Update LeadController: `tenders` → `leads`
- Update TenderController: `tenders` → `leads` (or deprecate)
- Update all services

**Step 3.4: Test Everything**
- All endpoints should work
- All data should be accessible
- No data loss

### Phase 4: Frontend Migration

**Step 4.1: Switch Feature Flag**
- Set USE_LEADS=true
- Test thoroughly
- Fix any issues

**Step 4.2: Remove Old Components**
- Delete TenderDashboard
- Delete TenderDetailsPage
- Update all imports
- Remove feature flag

### Phase 5: Cleanup

- Remove TenderController (or mark deprecated)
- Remove `/tenders` routes
- Update documentation

## Immediate Next Steps (Priority Order)

1. **Fix LeadController** - Make it work with `tenders` table
2. **Run Safe Migrations** - Only the ones that add tables/columns
3. **Test Backend** - Both endpoints should work
4. **Create Frontend Components** - Parallel implementation
5. **Add Feature Flag** - Allow switching
6. **Test Everything** - Both paths work
7. **Plan Database Migration** - When ready, run table renames

## Safety Checklist

Before running any migration:
- [ ] Database backup created
- [ ] Tested in development environment
- [ ] Rollback plan documented
- [ ] Both old and new code paths work
- [ ] No breaking changes to existing functionality
- [ ] Feature flags in place for easy rollback

## Key Principle

**"Never break what's working. Always add, never remove (until migration is complete)."**

- Keep old code working
- Add new code in parallel
- Test both paths
- Migrate gradually
- Remove old code only after new code is proven


