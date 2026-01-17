# Desktop Notification Settings Not Saving - Investigation & Fix

## Issue
Desktop notification settings are not being saved to the database when toggled in the Settings page.

## Investigation

### 1. Frontend Code Review
- ✅ Settings component correctly calls `saveConfig('desktop_notifications', settings.desktopNotifications.toString(), 'boolean')`
- ✅ API call is made via `adminApi.updateConfig()`
- ✅ All desktop notification settings are included in the save operation (lines 202-207 in Settings.tsx)

### 2. API Integration Review
- ✅ API endpoint: `PUT /api/v1/admin/config`
- ✅ Request body includes: `configKey`, `configValue`, `configType`
- ✅ Validation is correct in `backend/src/routes/admin.ts`

### 3. Backend Controller Review
- ✅ `AdminController.updateConfig()` handles both INSERT and UPDATE operations
- ✅ Database queries look correct
- ⚠️ **Added enhanced logging** to track the save process

### 4. Database Schema Review
- ✅ `system_config` table exists with correct structure:
  - `id` (PRIMARY KEY)
  - `config_key` (VARCHAR(100) UNIQUE)
  - `config_value` (TEXT)
  - `config_type` (ENUM: 'string', 'number', 'boolean', 'json')
  - `description` (TEXT)
  - `updated_by` (INT, FOREIGN KEY to users)
  - `updated_at` (TIMESTAMP)

## Fixes Applied

### 1. Enhanced Logging
Added comprehensive logging to `AdminController.updateConfig()`:
- Log when config update is initiated
- Log when creating new config vs updating existing
- Log the values being saved
- Log any errors that occur
- Log when config is successfully saved and retrieved

### 2. Error Handling
- Added validation to ensure saved config can be retrieved
- Added try-catch around audit logging (so it doesn't fail the request)
- Better error messages

## Testing Steps

1. **Check Backend Logs**
   - Enable desktop notifications in Settings
   - Click "Save Changes"
   - Check backend console/logs for:
     - "Updating system config" message
     - "Creating new system config" or "Updating existing system config"
     - "System config saved and retrieved" message
     - Any error messages

2. **Check Database**
   ```sql
   SELECT config_key, config_value, config_type, updated_at 
   FROM system_config 
   WHERE config_key LIKE 'desktop%' 
   ORDER BY config_key;
   ```

3. **Check Network Requests**
   - Open browser DevTools → Network tab
   - Enable desktop notifications
   - Click "Save Changes"
   - Look for `PUT /api/v1/admin/config` request
   - Check request payload and response

4. **Verify Settings Persist**
   - Enable desktop notifications
   - Save settings
   - Refresh the page
   - Check if desktop notifications toggle is still ON

## Potential Issues to Check

1. **Database Connection**
   - Ensure database is running
   - Ensure `system_config` table exists
   - Check for foreign key constraint issues with `updated_by`

2. **Authentication**
   - Ensure user is authenticated (Admin role required)
   - Check if `req.user!.userId` is valid

3. **API Errors**
   - Check browser console for API errors
   - Check network tab for failed requests
   - Check backend logs for errors

4. **Frontend State**
   - Verify settings state is being updated correctly
   - Check if `fetchSettings()` is reloading after save

## Next Steps

1. Test with enhanced logging to identify where the issue occurs
2. Check backend logs when saving desktop notification settings
3. Verify database table exists and is accessible
4. Check if other settings (like email notifications) are saving correctly
5. If issue persists, check for database constraint violations or permission issues













