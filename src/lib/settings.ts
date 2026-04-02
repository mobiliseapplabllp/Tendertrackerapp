// Settings utility functions
import { adminApi } from './api';
import type { SystemConfig } from './types';

let settingsCache: Record<string, string> | null = null;
let settingsCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Format date according to system settings
 */
export async function formatDate(date: Date | string | null | undefined): Promise<string> {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const settings = await getSystemSettings();
  const dateFormat = settings['date_format'] || 'MM/DD/YYYY';
  
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
 * Format date and time according to system settings
 */
export async function formatDateTime(date: Date | string | null | undefined): Promise<string> {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'Invalid Date';
  
  const dateStr = await formatDate(dateObj);
  const timeStr = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  
  return `${dateStr} ${timeStr}`;
}

/**
 * Format currency according to system settings
 */
export async function formatCurrency(amount: number | null | undefined, currencyOverride?: string): Promise<string> {
  if (amount === null || amount === undefined) return 'N/A';
  
  const settings = await getSystemSettings();
  const currency = currencyOverride || settings['currency'] || 'INR';
  
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
 * Get company name from settings
 */
export async function getCompanyName(): Promise<string> {
  const settings = await getSystemSettings();
  return settings['company_name'] || 'Mobilise CRM';
}

/**
 * Get company email from settings
 */
export async function getCompanyEmail(): Promise<string> {
  const settings = await getSystemSettings();
  return settings['company_email'] || 'noreply@leadtrack.com';
}

/**
 * Get all system settings from API (with caching)
 */
export async function getSystemSettings(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (!forceRefresh && settingsCache && (now - settingsCacheTime) < CACHE_DURATION) {
    return settingsCache;
  }

  try {
    const response = await adminApi.getConfig();
    
    if (response.success && response.data) {
      const configs = response.data as SystemConfig[];
      const configMap: Record<string, string> = {};
      
      configs.forEach((config) => {
        configMap[config.configKey] = config.configValue;
      });

      // Update cache
      settingsCache = configMap;
      settingsCacheTime = now;
      
      return configMap;
    }
  } catch (error) {
    console.error('Failed to load system settings:', error);
    // Return cached settings if available, even if expired
    if (settingsCache) {
      return settingsCache;
    }
  }

  // Return empty object if no settings available
  return {};
}

/**
 * Get desktop notification setting from API
 */
export async function isDesktopNotificationsEnabled(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings['desktop_notifications'] === 'true';
}

/**
 * Get email notification setting from API
 */
export async function isEmailNotificationsEnabled(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings['email_notifications'] !== 'false';
}

/**
 * Check if desktop notification is enabled for a specific event
 */
export async function isDesktopNotificationEnabledForEvent(
  event: 'tender_created' | 'tender_updated' | 'tender_deadline' | 'tender_won' | 'tender_lost' | 'worklog_created'
): Promise<boolean> {
  const settings = await getSystemSettings();
  
  // Check master switch first
  if (settings['desktop_notifications'] !== 'true') {
    return false;
  }

  // Check specific event setting
  const eventMap: Record<string, string> = {
    'tender_created': 'desktop_on_tender_created',
    'tender_updated': 'desktop_on_tender_updated',
    'tender_deadline': 'desktop_on_tender_deadline',
    'tender_won': 'desktop_on_tender_won',
    'tender_lost': 'desktop_on_tender_lost',
    'worklog_created': 'desktop_on_tender_updated', // Use same setting as tender_updated
  };

  const settingKey = eventMap[event];
  return settings[settingKey] !== 'false';
}

/**
 * Check if email notification is enabled for a specific event
 */
export async function isEmailNotificationEnabledForEvent(event: 'tender_created' | 'tender_updated' | 'tender_deadline' | 'tender_won' | 'tender_lost' | 'worklog_created'): Promise<boolean> {
  const settings = await getSystemSettings();
  
  // Check master switch
  if (settings['email_notifications'] === 'false') {
    return false;
  }

  // Check specific event setting
  const eventMap: Record<string, string> = {
    'tender_created': 'email_on_tender_created',
    'tender_updated': 'email_on_tender_updated',
    'tender_deadline': 'email_on_tender_deadline',
    'tender_won': 'email_on_tender_won',
    'tender_lost': 'email_on_tender_lost',
    'worklog_created': 'email_on_tender_updated', // Use same setting as tender_updated for now
  };

  const settingKey = eventMap[event];
  return settings[settingKey] !== 'false';
}

/**
 * Clear settings cache (call this after updating settings)
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  settingsCacheTime = 0;
}

/**
 * Show desktop notification if enabled
 */
export async function showDesktopNotification(
  title: string,
  body: string,
  event: 'tender_created' | 'tender_updated' | 'tender_deadline' | 'tender_won' | 'tender_lost' | 'worklog_created',
  options?: NotificationOptions
): Promise<boolean> {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    return false;
  }

  // Check if desktop notifications are enabled for this event
  const isEnabled = await isDesktopNotificationEnabledForEvent(event);
  if (!isEnabled) {
    return false;
  }

  // Check permission
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `tender-${event}`,
        ...options,
      });
      return true;
    } catch (error) {
      console.error('Error showing desktop notification:', error);
      return false;
    }
  } else if (Notification.permission !== 'denied') {
    // Request permission
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: `tender-${event}`,
          ...options,
        });
        return true;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  return false;
}


