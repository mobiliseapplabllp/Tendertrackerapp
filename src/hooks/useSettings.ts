// React hook for accessing system settings
import { useState, useEffect } from 'react';
import { getSystemSettings } from '../lib/settings';

interface Settings {
  timezone: string;
  dateFormat: string;
  currency: string;
  companyName: string;
  companyEmail: string;
  [key: string]: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const systemSettings = await getSystemSettings();
      setSettings({
        timezone: systemSettings['timezone'] || 'UTC',
        dateFormat: systemSettings['date_format'] || 'MM/DD/YYYY',
        currency: systemSettings['currency'] || 'INR',
        companyName: systemSettings['company_name'] || 'LeadTrack Pro',
        companyEmail: systemSettings['company_email'] || 'noreply@leadtrack.com',
        ...systemSettings,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Set defaults
      setSettings({
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        currency: 'INR',
        companyName: 'LeadTrack Pro',
        companyEmail: 'noreply@leadtrack.com',
      });
    } finally {
      setLoading(false);
    }
  };

  // Synchronous formatting functions using loaded settings
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date || !settings) return 'N/A';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';
    
    const dateFormat = settings.dateFormat || 'MM/DD/YYYY';
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
  };

  const formatCurrency = (amount: number | null | undefined, currencyOverride?: string): string => {
    if (amount === null || amount === undefined || !settings) return 'N/A';
    
    const currency = currencyOverride || settings.currency || 'INR';
    
    // Format based on currency
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
    
    return formatted;
  };

  return {
    settings,
    loading,
    formatDate,
    formatCurrency,
    reload: loadSettings,
  };
}

