import { useState, useEffect, useCallback } from 'react';
import { configurationApi } from '../lib/api';
import type { SystemSetting, DropdownOption } from '../lib/types';

interface ConfigurationCache {
    settings: Record<string, any>;
    dropdowns: Record<string, DropdownOption[]>;
    timestamp: number;
}

const CACHE_KEY = 'configuration_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get cached configuration from localStorage
function getCachedConfiguration(): ConfigurationCache | null {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const data: ConfigurationCache = JSON.parse(cached);
        if (Date.now() - data.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }

        return data;
    } catch (e) {
        console.error('Failed to load cached configuration:', e);
        return null;
    }
}

// Save configuration to localStorage
function setCachedConfiguration(cache: ConfigurationCache): void {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error('Failed to cache configuration:', e);
    }
}

export function useConfiguration() {
    const [settings, setSettings] = useState<Record<string, any>>({});
    const [dropdowns, setDropdowns] = useState<Record<string, DropdownOption[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load configuration on mount
    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Try to load from cache first
            const cached = getCachedConfiguration();
            if (cached) {
                setSettings(cached.settings);
                setDropdowns(cached.dropdowns);
                setIsLoading(false);
                return;
            }

            // Load from API
            const [settingsResponse, statusResponse, priorityResponse, currencyResponse] = await Promise.all([
                configurationApi.getAllSettings(),
                configurationApi.getDropdownOptions('lead_status'),
                configurationApi.getDropdownOptions('lead_priority'),
                configurationApi.getDropdownOptions('currency'),
            ]);

            if (!settingsResponse.success) {
                throw new Error(settingsResponse.error || 'Failed to load settings');
            }

            // Convert settings array to key-value map
            const settingsMap: Record<string, any> = {};
            if (settingsResponse.data) {
                for (const setting of settingsResponse.data) {
                    const { settingKey, settingValue, settingType } = setting;
                    let parsedValue: any = settingValue;

                    // Parse value based on type
                    switch (settingType) {
                        case 'number':
                            parsedValue = parseFloat(settingValue);
                            break;
                        case 'boolean':
                            parsedValue = settingValue === 'true' || settingValue === '1';
                            break;
                        case 'json':
                            try {
                                parsedValue = JSON.parse(settingValue);
                            } catch (e) {
                                console.error(`Failed to parse JSON for ${settingKey}:`, e);
                            }
                            break;
                    }

                    settingsMap[settingKey] = parsedValue;
                }
            }

            const dropdownsMap: Record<string, DropdownOption[]> = {
                lead_status: statusResponse.success ? statusResponse.data || [] : [],
                lead_priority: priorityResponse.success ? priorityResponse.data || [] : [],
                currency: currencyResponse.success ? currencyResponse.data || [] : [],
            };

            setSettings(settingsMap);
            setDropdowns(dropdownsMap);

            // Cache the configuration
            setCachedConfiguration({
                settings: settingsMap,
                dropdowns: dropdownsMap,
                timestamp: Date.now(),
            });
        } catch (err: any) {
            console.error('Failed to load configuration:', err);
            setError(err.message || 'Failed to load configuration');

            // Use defaults if loading fails
            setSettings({
                'document.max_file_size_mb': 10,
                'document.allowed_extensions': ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'],
                'document.default_category_id': 1,
                'lead.default_currency': 'INR',
                'lead.default_status': 'Draft',
                'lead.default_priority': 'Medium',
            });

            setDropdowns({
                lead_status: [
                    { id: 1, optionType: 'lead_status', optionValue: 'Draft', optionLabel: 'Draft', displayOrder: 1, colorClass: 'bg-gray-100 text-gray-800', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
                    { id: 2, optionType: 'lead_status', optionValue: 'Submitted', optionLabel: 'Submitted', displayOrder: 2, colorClass: 'bg-blue-100 text-blue-800', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
                ],
                lead_priority: [
                    { id: 1, optionType: 'lead_priority', optionValue: 'Low', optionLabel: 'Low', displayOrder: 1, colorClass: 'bg-gray-100 text-gray-700', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
                    { id: 2, optionType: 'lead_priority', optionValue: 'Medium', optionLabel: 'Medium', displayOrder: 2, colorClass: 'bg-blue-100 text-blue-700', isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
                ],
                currency: [
                    { id: 1, optionType: 'currency', optionValue: 'INR', optionLabel: 'INR (₹)', displayOrder: 1, isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
                    { id: 2, optionType: 'currency', optionValue: 'USD', optionLabel: 'USD ($)', displayOrder: 2, isActive: true, isSystem: true, createdAt: '', updatedAt: '' },
                ],
            });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Helper to get a specific setting
    const getSetting = useCallback((key: string, defaultValue?: any): any => {
        return settings[key] !== undefined ? settings[key] : defaultValue;
    }, [settings]);

    // Helper to get dropdown options
    const getDropdownOptions = useCallback((type: string): DropdownOption[] => {
        return dropdowns[type] || [];
    }, [dropdowns]);

    // Refresh configuration (clears cache and reloads)
    const refreshConfiguration = useCallback(async () => {
        localStorage.removeItem(CACHE_KEY);
        await loadConfiguration();
    }, [loadConfiguration]);

    return {
        settings,
        dropdowns,
        isLoading,
        error,
        getSetting,
        getDropdownOptions,
        refreshConfiguration,
    };
}
