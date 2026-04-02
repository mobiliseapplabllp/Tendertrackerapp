// React hook for accessing system settings
import { useState, useEffect } from 'react';
import { getSystemSettings } from '../lib/settings';
import { formatCurrencyCompact, formatCurrencyFull } from '../lib/currencyFormatter';

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
        companyName: systemSettings['company_name'] || 'Mobilise CRM',
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
        companyName: 'Mobilise CRM',
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

  const formatCurrency = (
    amount: number | null | undefined,
    currencyOverride?: string,
    options?: { compact?: boolean; decimals?: number }
  ): string => {
    if (amount === null || amount === undefined || !settings) return 'N/A';

    const currency = currencyOverride || settings.currency || 'INR';

    // Use compact formatting for dashboard cards (default)
    const compact = options?.compact !== undefined ? options.compact : true;
    const decimals = options?.decimals !== undefined ? options.decimals : 2;

    // For compact display (dashboard cards)
    if (compact) {
      return formatCurrencyCompact(amount, {
        currency,
        decimals,
        compact: true,
        compactThreshold: 100000, // Show full number below 1 Lakh/100K
      });
    }

    // For full display (detailed views)
    return formatCurrencyFull(amount, currency);
  };

  return {
    settings,
    loading,
    formatDate,
    formatCurrency,
    reload: loadSettings,
  };
}

