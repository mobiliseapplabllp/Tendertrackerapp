# LeadTrack Pro - Bug Report & Improvements

**Date:** March 15, 2026
**Prepared by:** Claude (Automated Code Analysis)

---

## Bugs Fixed

### 1. Document Download Not Working (Critical)
**File:** `src/components/TenderDetailDrawer.tsx` (Line 643)
**Issue:** The Download button for documents in the tender detail slider had no `onClick` handler — it was a dead button that did nothing when clicked.
**Fix:** Added `onClick` handler that calls `documentApi.download()` to fetch the file as a blob and trigger a browser download. Also added the `download` method to the `documentApi` in `src/lib/api.ts`.

### 2. Document Error Handling Crashes App (Critical)
**File:** `src/components/TenderDetailsPage.tsx` (Lines 805, 831, 834)
**Issue:** `toast.error()` was called but no toast library was imported. This caused a `ReferenceError` crash whenever document view/download failed.
**Fix:** Replaced all `toast.error()` calls with `alert()` for immediate error feedback without external dependencies.

### 3. User Type Import Conflict (High)
**File:** `src/components/TenderDetailsPage.tsx` (Lines 17, 95)
**Issue:** `User` was imported from `lucide-react` (as an icon) but also used as a TypeScript type for `useState<User[]>()`. The lucide-react icon component was being used as a type, causing a type mismatch.
**Fix:** Added `User as UserType` import from `../lib/types` and changed the state declaration to `useState<UserType[]>()`.

### 4. Nested TableRow - Invalid HTML (High)
**File:** `src/components/TenderDashboard.tsx` (Lines 672-678)
**Issue:** A `<TableRow>` was nested inside another `<TableRow>`, which is invalid HTML and caused rendering issues in the "No tenders found" empty state.
**Fix:** Removed the outer `<TableRow>`, keeping only the inner one with the `<TableCell>`.

### 5. Missing onNavigate Prop in TenderDashboard (High)
**File:** `src/components/TenderDashboard.tsx` (Lines 50-54)
**Issue:** `App.tsx` passes `onNavigate` to `TenderDashboard`, but the component's interface didn't declare it. The prop was silently ignored, preventing navigation from tender list to tender details.
**Fix:** Added `onNavigate?: (view: string) => void` to `TenderDashboardProps` interface and included it in destructuring.

### 6. Unhandled Promise Rejection on Document Delete (Medium)
**File:** `src/components/TenderDetailDrawer.tsx` (Line 643)
**Issue:** The document delete button's `onClick` had `.then()` but no `.catch()`. If deletion failed, the promise rejection was unhandled, potentially crashing the component.
**Fix:** Added `.catch()` handler with an alert for error feedback.

### 7. Import Order Violation (Medium)
**Files:** `src/components/DocumentManagement.tsx`, `src/components/UserManagement.tsx`
**Issue:** The `EscKeyHandler` helper component was defined between the first import and subsequent imports, violating JavaScript module best practices and potentially causing issues with bundlers.
**Fix:** Moved `EscKeyHandler` after all imports, just before the main component export.

### 8. Debug Console.log in Production (Low)
**Files:** `src/components/Sidebar.tsx` (Line 36), `src/components/TenderDetailDrawer.tsx` (Line 424), `src/components/Settings.tsx` (multiple lines)
**Issue:** Debug `console.log` statements were left in production code, leaking internal state data (user objects, roles, file upload details, notification states) to browser console.
**Fix:** Removed all debug `console.log` statements. Kept legitimate `console.error` calls for error tracking.

---

## Remaining Issues (Not Yet Fixed)

### Medium Priority

1. **parseInt() without radix parameter** - 16+ instances across multiple files
   - Files: TenderDetailsPage, TenderDrawer, CreateLeadDialog, CreateTenderDialog, CompanyManagement, EmailConfigDialog, DocumentManagement, ScoutConfig
   - Risk: `parseInt("08")` could be interpreted as octal in older environments
   - Recommendation: Add `, 10` as second argument to all `parseInt()` calls

2. **parseFloat() without NaN validation** - 5+ instances
   - Files: TenderDrawer, TenderDetailDrawer
   - Risk: Empty input fields produce `NaN` values that get saved to the database
   - Recommendation: Add `|| 0` fallback or explicit NaN checks

3. **Missing `createdByFilter` in useEffect dependency**
   - File: `src/components/LeadDashboard.tsx` (Line 108)
   - Risk: Changing the "Created By" filter doesn't trigger a data refresh
   - Recommendation: Add `createdByFilter` to the dependency array

### Low Priority

4. **No React Error Boundaries**
   - The app has no Error Boundary components. Any unhandled runtime error crashes the entire application with a white screen.
   - Recommendation: Add `<ErrorBoundary>` wrapper around major sections (Dashboard, TenderDashboard, LeadDashboard, etc.) with a fallback UI.

5. **No loading states for individual actions**
   - Document download, import, and delete operations don't show loading indicators.
   - Recommendation: Add per-action loading states with spinner/disabled buttons.

6. **Unused import in LeadDetailsPage**
   - `userApi` is imported but never used in `src/components/LeadDetailsPage.tsx` (Line 18).

---

## Recommended Improvements

### Architecture

1. **Add React Router** - The current string-based `currentView` routing in `App.tsx` doesn't support browser back/forward navigation, URL sharing, or deep linking. Migrate to React Router for proper client-side routing.

2. **Add a Toast/Notification System** - Multiple components use `alert()` for error feedback (some previously used the non-existent `toast`). Install a proper toast library like `react-hot-toast` or `sonner` for consistent, non-blocking notifications.

3. **Add Error Boundaries** - Wrap major page components in Error Boundaries to prevent full-app crashes from localized errors.

4. **State Management** - Consider adding React Context or Zustand for shared state (current user, settings, notifications) instead of prop drilling through multiple levels.

### Security

5. **Rate Limiting on Login** - The login endpoint should have stricter rate limiting to prevent brute-force attacks (currently uses the general API rate limiter).

6. **CSRF Protection** - Add CSRF tokens for state-changing operations, especially for the admin endpoints.

7. **Input Sanitization** - Several frontend forms submit user input directly. Add client-side sanitization for XSS prevention as defense-in-depth.

### Performance

8. **Pagination Optimization** - The LeadDashboard and TenderDashboard fetch all data client-side and filter locally. For large datasets, move filtering to the server with query parameters.

9. **Memoization** - Add `useMemo` for expensive computations like `filteredLeads`, `filteredTenders`, `uniqueCreators`, and `statusData` in Dashboard.

10. **Image/Document Lazy Loading** - Documents list should use virtual scrolling for large document collections.

### UX

11. **Confirmation Dialogs** - Replace browser `confirm()` dialogs with styled modal dialogs that match the app's design system.

12. **Keyboard Navigation** - Add keyboard shortcuts for common actions (Escape to close drawers, Enter to submit forms).

13. **Responsive Design** - The pipeline Kanban board and dashboard charts don't gracefully handle mobile viewports.

14. **Offline Support** - Add service worker for basic offline capability and queue API calls for when connectivity is restored.

### Code Quality

15. **TypeScript Strict Mode** - Enable strict TypeScript checking to catch type errors at compile time rather than runtime.

16. **Consistent Error Handling Pattern** - Standardize error handling across all components (currently a mix of try/catch, .catch(), alert(), state-based errors, and undefined toast calls).

17. **API Response Type Safety** - Several components use `any` type for API responses. Create proper response type interfaces for type safety.

18. **Test Coverage** - No frontend tests exist. Add unit tests for critical business logic (currency formatting, date calculations, filter logic) and integration tests for key user flows.
