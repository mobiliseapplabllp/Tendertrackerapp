// Backend settings utility functions
import db from '../config/database';
import logger from '../utils/logger';

let settingsCache: Record<string, string> | null = null;
let settingsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all system settings from database (with caching)
 */
export async function getSystemSettings(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (!forceRefresh && settingsCache && (now - settingsCacheTime) < CACHE_DURATION) {
    return settingsCache;
  }

  try {
    const [configs] = await db.query(
      'SELECT config_key, config_value FROM system_config'
    );
    
    const configMap: Record<string, string> = {};
    (configs as any[]).forEach((config: any) => {
      configMap[config.config_key] = config.config_value;
    });

    // Update cache
    settingsCache = configMap;
    settingsCacheTime = now;
    
    return configMap;
  } catch (error: any) {
    logger.error({
      message: 'Failed to load system settings',
      error: error.message,
    });
    // Return cached settings if available, even if expired
    if (settingsCache) {
      return settingsCache;
    }
  }

  // Return empty object if no settings available
  return {};
}

/**
 * Get a specific setting value
 */
export async function getSetting(key: string, defaultValue: string = '', forceRefresh: boolean = false): Promise<string> {
  const settings = await getSystemSettings(forceRefresh);
  return settings[key] || defaultValue;
}

/**
 * Get company name from settings
 */
export async function getCompanyName(): Promise<string> {
  return await getSetting('company_name', 'LeadTrack Pro');
}

/**
 * Get company email from settings
 */
export async function getCompanyEmail(): Promise<string> {
  return await getSetting('company_email', 'noreply@leadtrack.com');
}

/**
 * Get timezone from settings
 */
export async function getTimezone(): Promise<string> {
  return await getSetting('timezone', 'UTC');
}

/**
 * Get date format from settings
 */
export async function getDateFormat(): Promise<string> {
  return await getSetting('date_format', 'MM/DD/YYYY');
}

/**
 * Get currency from settings
 */
export async function getCurrency(): Promise<string> {
  return await getSetting('currency', 'INR');
}

/**
 * Format date according to system settings
 */
export async function formatDate(date: Date | string | null | undefined): Promise<string> {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const dateFormat = await getDateFormat();
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  switch (dateFormat) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
}

/**
 * Format currency according to system settings
 */
export async function formatCurrency(amount: number | null | undefined, currencyOverride?: string): Promise<string> {
  if (amount === null || amount === undefined) return 'N/A';
  
  const currency = currencyOverride || await getCurrency();
  
  // Format based on currency
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return formatted;
}

/**
 * Check if 2FA is enabled
 * Note: This function always fetches fresh data (forceRefresh) to ensure accurate 2FA status
 */
export async function is2FAEnabled(forceRefresh: boolean = true): Promise<boolean> {
  const setting = await getSetting('two_factor_auth', 'false', forceRefresh);
  const isEnabled = setting.toLowerCase() === 'true';
  logger.info({
    message: '2FA status checked',
    enabled: isEnabled,
    settingValue: setting,
  });
  return isEnabled;
}

/**
 * Get session timeout in minutes
 */
export async function getSessionTimeout(): Promise<number> {
  const setting = await getSetting('session_timeout', '30');
  return parseInt(setting) || 30;
}

/**
 * Get password requirements
 */
export async function getPasswordRequirements(): Promise<{
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}> {
  const settings = await getSystemSettings();
  
  return {
    minLength: parseInt(settings['password_min_length'] || '8'),
    requireUppercase: settings['password_require_uppercase'] !== 'false',
    requireNumbers: settings['password_require_numbers'] !== 'false',
    requireSpecialChars: settings['password_require_special'] !== 'false',
  };
}

/**
 * Validate password against requirements
 */
export async function validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
  const requirements = await getPasswordRequirements();
  const errors: string[] = [];

  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if auto-archive is enabled
 */
export async function isAutoArchiveEnabled(): Promise<boolean> {
  const setting = await getSetting('auto_archive', 'false');
  return setting === 'true';
}

/**
 * Get auto-archive days
 */
export async function getAutoArchiveDays(): Promise<number> {
  const setting = await getSetting('auto_archive_days', '90');
  return parseInt(setting) || 90;
}

/**
 * Clear settings cache
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  settingsCacheTime = 0;
}

