# Product Line Feature - Implementation Plan

## Overview

Add product line-based visibility control so that sales teams from different product lines (EduPro, OpsSuite, SCMPro, HREvO) can only see leads assigned to their product lines, while still being able to create leads for any product line. Each lead also gets a sub-category of either "Software" or "Hardware".

---

## Phase 1: Database Changes

### 1.1 New Table: `product_lines`
```sql
CREATE TABLE product_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,        -- e.g., EduPro, OpsSuite, SCMPro, HREvO
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed the 4 product lines
INSERT INTO product_lines (name, description, display_order) VALUES
  ('EduPro', 'Education management platform', 1),
  ('OpsSuite', 'Operations management suite', 2),
  ('SCMPro', 'Supply chain management platform', 3),
  ('HREvO', 'HR evolution platform', 4);
```

### 1.2 New Junction Table: `user_product_lines`
```sql
CREATE TABLE user_product_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    product_line_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_line_id) REFERENCES product_lines(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_line_id)
);
```
This many-to-many relationship allows users to be assigned to multiple product lines.

### 1.3 Alter `tenders` Table (leads table)
```sql
ALTER TABLE tenders
    ADD COLUMN product_line_id INT NULL AFTER lead_type_id,
    ADD COLUMN sub_category ENUM('Software', 'Hardware') NULL AFTER product_line_id,
    ADD FOREIGN KEY (product_line_id) REFERENCES product_lines(id),
    ADD INDEX idx_product_line (product_line_id),
    ADD INDEX idx_sub_category (sub_category);
```

**Files to create/modify:**
- Create: `backend/database/migrations/009_add_product_lines.sql`

---

## Phase 2: Backend API Changes

### 2.1 New Product Line Controller & Routes
**New file:** `backend/src/controllers/productLineController.ts`
- `getAll()` — List all active product lines (for dropdowns)
- `getById(id)` — Single product line detail
- `create()` — Admin: add new product line
- `update()` — Admin: update product line
- `delete()` — Admin: deactivate/delete product line

**New file:** `backend/src/routes/productLines.ts`
- `GET /api/v1/product-lines` — All users (for form dropdowns)
- `GET /api/v1/product-lines/:id` — All users
- `POST /api/v1/product-lines` — Admin only
- `PUT /api/v1/product-lines/:id` — Admin only
- `DELETE /api/v1/product-lines/:id` — Admin only

**Register in:** `backend/src/app.ts`
- Add: `app.use('/api/v1/product-lines', productLineRoutes);`

### 2.2 Modify User Controller
**File:** `backend/src/controllers/userController.ts`

**Changes to `create()`:**
- Accept `productLineIds: number[]` in request body
- After creating the user, insert rows into `user_product_lines` table

**Changes to `update()`:**
- Accept `productLineIds: number[]` in request body
- On update: delete existing entries from `user_product_lines`, re-insert new ones

**Changes to `getAll()` and `getById()`:**
- JOIN `user_product_lines` + `product_lines` to return the user's assigned product lines in the response
- Add a `productLines` array to the user response object

### 2.3 Modify User Routes Validation
**File:** `backend/src/routes/users.ts`
- Add `productLineIds` (optional array of integers) to create and update validation schemas

### 2.4 Modify Lead Controller — Visibility Filtering
**File:** `backend/src/controllers/leadController.ts`

**Changes to `getAll()`:**
- Extract `req.user.userId` from authenticated request
- Query `user_product_lines` to get the current user's assigned product lines
- **If user has assigned product lines:** Add filter `AND t.product_line_id IN (...)` to only show leads from those product lines
- **If user has NO assigned product lines (Admin override):** Show all leads (Admin/Manager users with no specific product line assignments see everything)
- Accept `productLineId` and `subCategory` as optional query parameters for additional manual filtering

**Changes to `create()`:**
- Accept `productLineId` (required) and `subCategory` (optional, "Software" or "Hardware") in request body
- Save to the `product_line_id` and `sub_category` columns
- No product line restriction on creation — any user can create a lead for any product line

**Changes to `getById()`:**
- Return the `product_line_id` and `sub_category` in the response with the product line name
- LEFT JOIN `product_lines` table

**Changes to `update()`:**
- Allow updating `productLineId` and `subCategory` fields

### 2.5 Modify Tender Controller (parallel changes)
**File:** `backend/src/controllers/tenderController.ts`
- Same filtering changes as LeadController for `getAll()`
- Same field additions for `create()` and `update()`

### 2.6 Modify Auth Middleware — Include Product Lines in Token Context
**File:** `backend/src/middleware/auth.ts`
- In `authenticate()`, after validating the JWT and fetching the session, query `user_product_lines` for the user and attach `req.user.productLineIds = [1, 3, ...]` to the request object
- This avoids re-querying the junction table in every controller method

---

## Phase 3: Frontend Type & API Changes

### 3.1 Update TypeScript Interfaces
**File:** `src/lib/types.ts`

```typescript
// New interface
export interface ProductLine {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

// Update User interface — add:
export interface User {
  // ...existing fields...
  productLines?: ProductLine[];     // Assigned product lines
  productLineIds?: number[];        // For create/update payloads
}

// Update Lead interface — add:
export interface Lead {
  // ...existing fields...
  productLineId?: number;           // FK to product_lines
  productLine?: ProductLine;        // Populated product line object
  subCategory?: 'Software' | 'Hardware';
}
```

### 3.2 Add Product Line API Client
**File:** `src/lib/api.ts`

```typescript
export const productLineApi = {
  getAll: async () => apiCall<ProductLine[]>('/product-lines'),
  getById: async (id: number) => apiCall<ProductLine>(`/product-lines/${id}`),
  create: async (data: Partial<ProductLine>) => apiCall<ProductLine>('/product-lines', { method: 'POST', body: JSON.stringify(data) }),
  update: async (id: number, data: Partial<ProductLine>) => apiCall<ProductLine>(`/product-lines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: async (id: number) => apiCall(`/product-lines/${id}`, { method: 'DELETE' }),
};
```

### 3.3 Update User API Payloads
- `userApi.create()` and `userApi.update()` — include `productLineIds` in the request body

---

## Phase 4: Frontend UI Changes

### 4.1 User Management — Product Line Assignment
**File:** `src/components/UserManagement.tsx`

**Changes:**
- Add a **"Product Lines" multi-select** field in the Create/Edit User form
- Fetch product lines via `productLineApi.getAll()` on mount
- Display checkboxes or multi-select dropdown for all 4 product lines
- On save: include `productLineIds` array in the create/update API call
- In the users table listing: show a "Product Lines" column with badges (e.g., `EduPro | SCMPro`)
- In the "Role Permissions" tab: add a note explaining that product line assignments control lead visibility

**UI Layout:**
```
Create/Edit User Form:
  ├── Full Name          [input]
  ├── Email              [input]
  ├── Password           [input]
  ├── Role               [select: Admin, Manager, User, Viewer]
  ├── Department         [input]
  ├── Product Lines      [multi-select checkboxes]    ← NEW
  │   ├── ☑ EduPro
  │   ├── ☐ OpsSuite
  │   ├── ☑ SCMPro
  │   └── ☐ HREvO
  └── [Save] [Cancel]
```

### 4.2 Lead Creation Dialog — Product Line & Sub-Category
**File:** `src/components/CreateLeadDialog.tsx`

**Changes:**
- Add **"Product Line"** dropdown field (required) — populated from `productLineApi.getAll()`
- Add **"Sub Category"** dropdown field (optional) — values: "Software", "Hardware"
- Include `productLineId` and `subCategory` in the create API payload
- Position these fields after the Lead Type field

**UI Layout:**
```
Create Lead Form:
  ├── Lead Number        [input]
  ├── Title              [input]
  ├── Lead Type          [select - locked to "Lead"]
  ├── Product Line       [select: EduPro, OpsSuite, SCMPro, HREvO]    ← NEW
  ├── Sub Category       [select: Software, Hardware]                   ← NEW
  ├── Company            [select]
  ├── Source             [input]
  ├── Estimated Value    [input]
  ├── ...existing fields...
  └── Documents          [file upload]
```

### 4.3 Tender Creation Dialog — Product Line & Sub-Category
**File:** `src/components/CreateTenderDialog.tsx`

**Same changes as CreateLeadDialog:**
- Add Product Line dropdown (required)
- Add Sub Category dropdown (optional)
- Include in create API payload

### 4.4 Lead Dashboard — Product Line Filter & Column
**File:** `src/components/LeadDashboard.tsx`

**Changes:**
- **Automatic filtering**: The backend handles visibility filtering based on the authenticated user's product line assignments — the dashboard simply calls the API as before, and the backend returns only permitted leads
- Add a **"Product Line" filter dropdown** in the filters bar for users with multiple product lines to narrow down further
- Add a **"Product Line" column** in the leads table showing the product line badge
- Add a **"Sub Category" column** or combine with Product Line as "EduPro / Software"
- Update stats cards to reflect the filtered data

### 4.5 Tender Dashboard — Product Line Filter & Column
**File:** `src/components/TenderDashboard.tsx`

**Same changes as LeadDashboard:**
- Backend handles visibility filtering automatically
- Add Product Line filter dropdown
- Add Product Line column in table
- Add Sub Category display

### 4.6 Tender Detail Drawer — Show & Edit Product Line
**File:** `src/components/TenderDetailDrawer.tsx`

**Changes to the Classification Box:**
```
Classification Box:
  ├── Status      [dropdown]
  ├── Type        [dropdown - Lead Type]
  ├── Priority    [dropdown]
  ├── Product Line [dropdown: EduPro, OpsSuite, SCMPro, HREvO]    ← NEW
  └── Sub Category [dropdown: Software, Hardware]                   ← NEW
```
- Fetch product lines on mount
- Include in save payload

### 4.7 Tender Details Page — Show & Edit Product Line
**File:** `src/components/TenderDetailsPage.tsx`

**Changes to the Overview section:**
- Add Product Line and Sub Category as editable fields in the information grid
- Include in the update API call

### 4.8 Lead Details Page — Show Product Line
**File:** `src/components/LeadDetailsPage.tsx`

**Changes:**
- Display Product Line and Sub Category in the lead info grid
- These are display-only here (full editing is done in TenderDetailsPage)

---

## Phase 5: Admin Management (Optional Enhancement)

### 5.1 Product Line Management UI
**Option A (Recommended):** Add a "Product Lines" tab to the existing `CategoryManagement.tsx` component
**Option B:** Add to the `Settings.tsx` component under a new tab

**Features:**
- List all product lines with active/inactive status
- Add new product line (Admin only)
- Edit product line name/description
- Deactivate/reactivate product lines
- Show user count per product line

---

## Implementation Order

| Step | Task | Files | Estimated Effort |
|------|------|-------|-----------------|
| 1 | Database migration (tables + seed data) | 1 new migration file | Small |
| 2 | Backend: Product Line controller + routes | 2 new files + app.ts | Medium |
| 3 | Backend: Modify auth middleware (attach productLineIds) | auth.ts | Small |
| 4 | Backend: Modify Lead/Tender controllers (filtering + fields) | leadController.ts, tenderController.ts | Medium |
| 5 | Backend: Modify User controller (CRUD with product lines) | userController.ts, users.ts | Medium |
| 6 | Frontend: Update types + API client | types.ts, api.ts | Small |
| 7 | Frontend: User Management — product line assignment | UserManagement.tsx | Medium |
| 8 | Frontend: Create Lead/Tender dialogs — product line fields | CreateLeadDialog.tsx, CreateTenderDialog.tsx | Small |
| 9 | Frontend: Lead/Tender dashboards — column + filter | LeadDashboard.tsx, TenderDashboard.tsx | Medium |
| 10 | Frontend: Detail pages — display + edit | TenderDetailDrawer.tsx, TenderDetailsPage.tsx, LeadDetailsPage.tsx | Medium |
| 11 | Admin: Product Line management UI | CategoryManagement.tsx or Settings.tsx | Medium |
| 12 | Testing and verification | All modified files | Medium |

---

## Access Control Rules Summary

| Action | Rule |
|--------|------|
| **Create lead/tender** | Any authenticated user can create for ANY product line |
| **View leads/tenders** | Users see ONLY leads from their assigned product lines |
| **Admin/Manager with no product lines** | See ALL leads (global visibility) |
| **Edit lead/tender** | Same as view — only if the lead's product line is in user's assignments |
| **Product Line assignment** | Admin manages via User Management page |

---

## Risk Considerations

1. **Backward compatibility**: Existing leads with no `product_line_id` (NULL) should remain visible to all users. The filter should be: "Show leads WHERE product_line_id IN (user's lines) OR product_line_id IS NULL"
2. **Admin override**: Admin users should always see all leads regardless of product line assignment
3. **Migration**: Existing leads will have NULL product_line_id. Consider a one-time data migration or allow NULL to mean "visible to all"
4. **Pipeline/Sales Dashboard**: The PipelineView and SalesDashboard also list leads — they need the same product line filtering
5. **Reports**: ReportsAnalytics component should respect product line filtering
