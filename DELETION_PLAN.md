# Deletion Plan - Step by Step

**Date:** 2025-01-27  
**Status:** Ready for Execution

## Verification Summary

### ✅ Confirmed Unused (Safe to Delete)

1. **TenderDrawer import in LeadDashboard**
   - File: `src/components/LeadDashboard.tsx:21`
   - Status: Imported but never used in JSX
   - Risk: None

2. **TenderDrawer import in TenderDashboard**
   - File: `src/components/TenderDashboard.tsx:21`
   - Status: Imported but never rendered (uses navigation instead)
   - Risk: Low (selectedTenderId state exists but unused)

3. **Commented QuickDocumentAccess import**
   - File: `src/components/TenderDetailsPage.tsx:17`
   - Status: Commented out code
   - Risk: None

4. **Unused state: selectedTenderId in TenderDashboard**
   - File: `src/components/TenderDashboard.tsx:51`
   - Status: State declared but never used
   - Risk: Low

5. **Unused state: selectedLeadId in LeadDashboard**
   - File: `src/components/LeadDashboard.tsx:51`
   - Status: State declared but never used
   - Risk: Low

### ⚠️ Console Statements (Should Replace)

Found in:
- `src/components/CreateLeadDialog.tsx:173`
- `src/components/LeadDashboard.tsx:83,96`
- `src/components/Settings.tsx:255,260,266,270,272,276,285,293,305,309,314,318`
- `src/components/TenderDashboard.tsx:83,96`

### ❓ UI Components (Decision Needed)

~28 UI components with no imports found. Decision needed on whether to:
- Keep for future features
- Remove to reduce bundle size

---

## Deletion Steps

### Step 1: Remove Unused Imports ✅ SAFE

**Action:** Remove unused TenderDrawer imports

**Files to modify:**
1. `src/components/LeadDashboard.tsx` - Remove line 21
2. `src/components/TenderDashboard.tsx` - Remove line 21

**Verification:** 
- ✅ No JSX usage found
- ✅ Components use navigation instead
- ✅ No dynamic imports

---

### Step 2: Remove Unused State Variables ✅ SAFE

**Action:** Remove unused state declarations

**Files to modify:**
1. `src/components/LeadDashboard.tsx` - Remove `selectedLeadId` state (line 51)
2. `src/components/TenderDashboard.tsx` - Remove `selectedTenderId` state (line 51)

**Verification:**
- ✅ States declared but never used
- ✅ No references found

---

### Step 3: Remove Commented Code ✅ SAFE

**Action:** Remove commented import

**Files to modify:**
1. `src/components/TenderDetailsPage.tsx` - Remove line 17 (commented import)

**Verification:**
- ✅ Already commented out
- ✅ Not used in component

---

### Step 4: Replace Console Statements ⚠️ RECOMMENDED

**Action:** Replace console.log/error with proper error handling

**Files to modify:**
- Multiple files (see list above)

**Note:** This is a code quality improvement, not deletion

---

### Step 5: UI Components ⏸️ PENDING DECISION

**Action:** Remove unused UI components (if approved)

**Components:** ~28 components (see VERIFICATION_REPORT.md)

**Decision Required:**
- Keep for future features?
- Remove to reduce bundle size?

---

## Execution Order

1. ✅ **Step 1** - Remove unused imports (Lowest risk)
2. ✅ **Step 2** - Remove unused state (Low risk)
3. ✅ **Step 3** - Remove commented code (No risk)
4. ⏸️ **Step 4** - Replace console statements (Code quality)
5. ⏸️ **Step 5** - UI components (Requires decision)

---

## Risk Assessment

- **Step 1-3:** ✅ Low risk - Unused code only
- **Step 4:** ⚠️ Medium risk - Need to ensure proper error handling
- **Step 5:** ⚠️ Medium risk - May be needed for future features

---

## Rollback Plan

All changes will be:
1. Made step by step
2. Verified after each step
3. Can be reverted via git if needed

---

## Ready to Proceed

✅ Verification complete  
✅ Deletion plan ready  
⏳ Awaiting approval to proceed with Step 1


