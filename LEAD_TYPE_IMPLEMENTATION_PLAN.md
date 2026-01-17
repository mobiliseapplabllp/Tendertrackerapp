# Lead Type Implementation Plan
**Date:** 2025-01-27  
**Status:** In Progress  
**Priority:** High

## Executive Summary
This plan outlines the implementation of lead type filtering to separate Tenders and Leads throughout the application, ensuring data integrity and accurate dashboard calculations.

## Current State Analysis

### ✅ Already Implemented
- Database schema has `lead_type_id` column in `tenders` table
- `lead_types` table exists with: Tender, Lead, Opportunity, Prospect
- Lead interface includes `leadTypeId` and `leadType` fields
- CreateLeadDialog has lead type selection
- Backend API supports lead type filtering

### ❌ Missing Implementation
- CreateTenderDialog doesn't set lead_type_id
- CreateLeadDialog allows user to change lead type (should be locked to "Lead")
- TenderDashboard doesn't filter by lead_type = "Tender"
- LeadDashboard doesn't filter by lead_type = "Lead"
- Dashboard calculations include lost/cancelled/deleted items

## Implementation Plan

### Phase 1: Create Dialog Updates
**Goal:** Ensure new records are created with correct lead type

#### 1.1 Update CreateTenderDialog
- Add hidden/non-editable lead_type_id field
- Set default value to "Tender" lead type ID
- Fetch "Tender" lead type ID on dialog open
- Pass lead_type_id in create request

#### 1.2 Update CreateLeadDialog
- Make lead_type_id field non-editable (disabled)
- Set default value to "Lead" lead type ID
- Fetch "Lead" lead type ID on dialog open
- Ensure lead_type_id is always "Lead" for new leads

### Phase 2: Dashboard Filtering
**Goal:** Separate Tenders and Leads in their respective dashboards

#### 2.1 Update TenderDashboard
- Add lead_type filter to all API calls
- Filter by lead_type = "Tender" in all tabs:
  - Active tab
  - Draft tab
  - Submitted tab
  - Under Review tab
  - Shortlisted tab
  - Won tab
  - Lost tab
  - Cancelled tab
  - Deleted tab
- Update status counts to include lead_type filter
- Ensure search and other filters work with lead_type filter

#### 2.2 Update LeadDashboard
- Add lead_type filter to all API calls
- Filter by lead_type = "Lead" in all tabs:
  - Active tab
  - Deleted tab
- Update status counts to include lead_type filter
- Ensure search and other filters work with lead_type filter

### Phase 3: Dashboard Calculations Fix
**Goal:** Exclude lost/cancelled/deleted items from calculations

#### 3.1 Update Backend Dashboard Controller
- Exclude status IN ('Lost', 'Cancelled') from:
  - Total value calculations
  - Active tenders/leads count
  - Qualified leads count
  - Active tenders/leads count
  - Sales pipeline calculations
- Exclude deleted_at IS NOT NULL from all calculations
- Update SQL queries in `reportController.ts`:
  - `getDashboard()` method
  - All aggregation queries
  - Status-based filters

#### 3.2 Update Frontend Dashboard
- Verify calculations match backend
- Display correct metrics
- Show separate metrics for Tenders vs Leads if needed

### Phase 4: API Updates
**Goal:** Ensure backend supports lead_type filtering

#### 4.1 Update TenderController
- Add lead_type_id filter support
- Ensure getAll() method filters by lead_type when provided
- Update status counts to respect lead_type filter

#### 4.2 Update LeadController
- Verify lead_type_id filter support
- Ensure getAll() method filters by lead_type when provided
- Update status counts to respect lead_type filter

## Technical Implementation Details

### Database Queries
```sql
-- Get Tender lead type ID
SELECT id FROM lead_types WHERE name = 'Tender' LIMIT 1;

-- Get Lead lead type ID
SELECT id FROM lead_types WHERE name = 'Lead' LIMIT 1;

-- Filter tenders by lead type
WHERE lead_type_id = (SELECT id FROM lead_types WHERE name = 'Tender' LIMIT 1)
AND status NOT IN ('Lost', 'Cancelled')
AND deleted_at IS NULL
```

### API Filter Structure
```typescript
{
  leadTypeId: number, // ID of lead type
  status: string[],   // Status array
  includeDeleted: boolean
}
```

### Frontend Filter Structure
```typescript
const filters = {
  leadTypeId: tenderLeadTypeId, // For TenderDashboard
  leadTypeId: leadLeadTypeId,   // For LeadDashboard
  status: ['Draft', 'Submitted', ...],
  page: 1,
  pageSize: 10
};
```

## Testing Checklist

### Create Dialog Tests
- [ ] CreateTenderDialog sets lead_type_id to "Tender"
- [ ] CreateTenderDialog doesn't allow changing lead type
- [ ] CreateLeadDialog sets lead_type_id to "Lead"
- [ ] CreateLeadDialog doesn't allow changing lead type
- [ ] New tenders appear only in TenderDashboard
- [ ] New leads appear only in LeadDashboard

### Dashboard Filtering Tests
- [ ] TenderDashboard shows only tenders
- [ ] LeadDashboard shows only leads
- [ ] All tabs in TenderDashboard filter correctly
- [ ] All tabs in LeadDashboard filter correctly
- [ ] Search works with lead type filter
- [ ] Status counts are accurate per lead type

### Dashboard Calculations Tests
- [ ] Total value excludes lost/cancelled/deleted
- [ ] Active count excludes lost/cancelled/deleted
- [ ] Qualified leads excludes lost/cancelled/deleted
- [ ] Sales pipeline excludes lost/cancelled/deleted
- [ ] EMD calculations exclude lost/cancelled/deleted
- [ ] Tender fees exclude lost/cancelled/deleted

## Risk Assessment

### High Risk
- **Data Migration:** Existing records may not have lead_type_id set
  - **Mitigation:** Ensure migration sets default values

### Medium Risk
- **Performance:** Additional filter may impact query performance
  - **Mitigation:** Ensure lead_type_id is indexed

### Low Risk
- **User Confusion:** Users may not understand lead type separation
  - **Mitigation:** Clear UI labels and documentation

## Rollout Plan

1. **Development:** Implement all phases
2. **Testing:** Complete all test cases
3. **Staging:** Deploy to staging environment
4. **UAT:** User acceptance testing
5. **Production:** Deploy with monitoring

## Success Criteria

✅ New tenders are created with lead_type = "Tender"  
✅ New leads are created with lead_type = "Lead"  
✅ TenderDashboard shows only tenders  
✅ LeadDashboard shows only leads  
✅ Dashboard calculations exclude lost/cancelled/deleted items  
✅ All tabs filter correctly by lead type  
✅ No performance degradation  
✅ No data integrity issues

## Timeline

- **Phase 1:** 2 hours
- **Phase 2:** 3 hours
- **Phase 3:** 2 hours
- **Phase 4:** 1 hour
- **Testing:** 2 hours
- **Total:** ~10 hours
