# Database Migrations

## Running Migrations

To apply migrations, you can use either method:

```bash
# Option 1: Using MySQL command line
mysql -h <host> -u <user> -p <database> < migrations/<migration_file>.sql

# Option 2: Using the migration scripts (recommended)
npm run migrate:soft-delete      # Soft delete support
npm run migrate:emd-fees         # EMD and Tender Fees columns
npm run migrate:reminders         # Work log reminders tables
npm run migrate:document-fields   # Document name and description
npm run migrate:otp-purpose      # OTP purpose column for password reset
```

## Migration: Add Soft Delete Support

**File:** `add_soft_delete.sql`

**Description:** Adds soft delete support to tenders, documents, and tender_activities tables.

**Columns Added:**
- `tenders.deleted_at` - Timestamp when tender was soft deleted
- `tenders.deleted_by` - User ID who deleted the tender
- `documents.deleted_at` - Timestamp when document was soft deleted
- `documents.deleted_by` - User ID who deleted the document
- `tender_activities.deleted_at` - Timestamp when activity was soft deleted

**Note:** The application will work without this migration, but soft delete functionality will not be available. The backend code checks for column existence before using soft delete features.

## Migration: Add OTP Purpose Column

**File:** `add_otp_purpose.sql`

**Description:** Adds a purpose column to distinguish between login OTPs and password reset OTPs.

**Columns Added:**
- `otp_verifications.purpose` - ENUM('login', 'password_reset') - Purpose of the OTP

**Run Migration:**
```bash
npm run migrate:otp-purpose
```

**Note:** This migration is required for the forgot password and reset password functionality to work. The backend code checks for column existence before using purpose-specific OTP features.
