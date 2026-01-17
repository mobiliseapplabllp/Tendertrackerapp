import pool from '../config/database';

export interface SystemSetting {
    id: number;
    settingKey: string;
    settingValue: string;
    settingType: 'string' | 'number' | 'boolean' | 'json';
    description?: string;
    category?: string;
    isEditable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface DropdownOption {
    id: number;
    optionType: string;
    optionValue: string;
    optionLabel: string;
    displayOrder: number;
    colorClass?: string;
    icon?: string;
    isActive: boolean;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// In-memory cache with TTL
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class ConfigurationService {
    private settingsCache: Map<string, CacheEntry<any>> = new Map();
    private dropdownCache: Map<string, CacheEntry<DropdownOption[]>> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    private isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
        if (!entry) return false;
        return Date.now() - entry.timestamp < this.CACHE_TTL;
    }

    private setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
        cache.set(key, { data, timestamp: Date.now() });
    }

    private getCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
        const entry = cache.get(key);
        if (this.isCacheValid(entry)) {
            return entry!.data;
        }
        cache.delete(key);
        return null;
    }

    // Clear all caches
    clearCache(): void {
        this.settingsCache.clear();
        this.dropdownCache.clear();
    }

    // Get all system settings
    async getAllSettings(): Promise<SystemSetting[]> {
        const cacheKey = 'all_settings';
        const cached = this.getCache(this.settingsCache, cacheKey);
        if (cached) return cached;

        const [rows] = await pool.query(
            `SELECT id, setting_key as settingKey, setting_value as settingValue, 
                    setting_type as settingType, description, category, 
                    is_editable as isEditable, created_at as createdAt, 
                    updated_at as updatedAt
             FROM system_settings
             ORDER BY category, setting_key`
        );

        this.setCache(this.settingsCache, cacheKey, rows);
        return rows as SystemSetting[];
    }

    // Get specific setting by key
    async getSetting(key: string): Promise<any> {
        const cached = this.getCache(this.settingsCache, key);
        if (cached !== null) return cached;

        const [rows] = await pool.query<any[]>(
            `SELECT setting_value as settingValue, setting_type as settingType
             FROM system_settings
             WHERE setting_key = ?`,
            [key]
        );

        if (!Array.isArray(rows) || rows.length === 0) {
            return null;
        }

        const { settingValue, settingType } = rows[0];
        let parsedValue: any = settingValue;

        // Parse value based on type
        switch (settingType) {
            case 'number':
                parsedValue = parseFloat(settingValue);
                break;
            case 'boolean':
                parsedValue = settingValue === 'true' || settingValue === '1' || settingValue === 1;
                break;
            case 'json':
                try {
                    parsedValue = JSON.parse(settingValue);
                } catch (e) {
                    console.error(`Failed to parse JSON for setting ${key}:`, e);
                }
                break;
        }

        this.setCache(this.settingsCache, key, parsedValue);
        return parsedValue;
    }

    // Update setting
    async updateSetting(key: string, value: any): Promise<SystemSetting> {
        // Get current setting info
        const [rows] = await pool.query<any[]>(
            'SELECT setting_type as settingType, is_editable as isEditable FROM system_settings WHERE setting_key = ?',
            [key]
        );

        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error(`Setting ${key} not found`);
        }

        const { settingType, isEditable } = rows[0];

        if (!isEditable) {
            throw new Error(`Setting ${key} is not editable`);
        }

        // Convert value to string for storage
        let stringValue: string;
        switch (settingType) {
            case 'number':
                if (isNaN(Number(value))) {
                    throw new Error(`Invalid number value for setting ${key}`);
                }
                stringValue = String(value);
                break;
            case 'boolean':
                stringValue = value ? '1' : '0';
                break;
            case 'json':
                try {
                    stringValue = JSON.stringify(value);
                } catch (e) {
                    throw new Error(`Invalid JSON value for setting ${key}`);
                }
                break;
            default:
                stringValue = String(value);
        }

        const [updateResult] = await pool.query<any>(
            `UPDATE system_settings 
             SET setting_value = ?, updated_at = CURRENT_TIMESTAMP
             WHERE setting_key = ?`,
            [stringValue, key]
        );

        // Invalidate cache
        this.settingsCache.delete(key);
        this.settingsCache.delete('all_settings');

        // Fetch and return updated setting
        const [updated] = await pool.query<any[]>(
            `SELECT id, setting_key as settingKey, setting_value as settingValue, 
                    setting_type as settingType, description, category, 
                    is_editable as isEditable, created_at as createdAt, 
                    updated_at as updatedAt
             FROM system_settings WHERE setting_key = ?`,
            [key]
        );

        return updated[0] as SystemSetting;
    }

    // Get dropdown options by type
    async getDropdownOptions(type: string, activeOnly: boolean = true): Promise<DropdownOption[]> {
        const cacheKey = `${type}_${activeOnly}`;
        const cached = this.getCache(this.dropdownCache, cacheKey);
        if (cached) return cached;

        const query = activeOnly
            ? `SELECT id, option_type as optionType, option_value as optionValue, 
                      option_label as optionLabel, display_order as displayOrder, 
                      color_class as colorClass, icon, is_active as isActive, 
                      is_system as isSystem, created_at as createdAt, 
                      updated_at as updatedAt
               FROM dropdown_options
               WHERE option_type = ? AND is_active = 1
               ORDER BY display_order, option_label`
            : `SELECT id, option_type as optionType, option_value as optionValue, 
                      option_label as optionLabel, display_order as displayOrder, 
                      color_class as colorClass, icon, is_active as isActive, 
                      is_system as isSystem, created_at as createdAt, 
                      updated_at as updatedAt
               FROM dropdown_options
               WHERE option_type = ?
               ORDER BY display_order, option_label`;

        const [rows] = await pool.query<any[]>(query, [type]);

        this.setCache(this.dropdownCache, cacheKey, rows as DropdownOption[]);
        return rows as DropdownOption[];
    }

    // Create dropdown option
    async createDropdownOption(data: Partial<DropdownOption>): Promise<DropdownOption> {
        const {
            optionType,
            optionValue,
            optionLabel,
            displayOrder = 0,
            colorClass,
            icon,
            isActive = true,
            isSystem = false,
        } = data;

        if (!optionType || !optionValue || !optionLabel) {
            throw new Error('optionType, optionValue, and optionLabel are required');
        }

        const [result] = await pool.query<any>(
            `INSERT INTO dropdown_options 
             (option_type, option_value, option_label, display_order, color_class, icon, is_active, is_system)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [optionType, optionValue, optionLabel, displayOrder, colorClass, icon, isActive ? 1 : 0, isSystem ? 1 : 0]
        );

        // Invalidate cache
        this.dropdownCache.delete(`${optionType}_true`);
        this.dropdownCache.delete(`${optionType}_false`);

        // Fetch and return created option
        const [rows] = await pool.query<any[]>(
            `SELECT id, option_type as optionType, option_value as optionValue, 
                    option_label as optionLabel, display_order as displayOrder, 
                    color_class as colorClass, icon, is_active as isActive, 
                    is_system as isSystem, created_at as createdAt, 
                    updated_at as updatedAt
             FROM dropdown_options WHERE id = ?`,
            [(result as any).insertId]
        );

        return rows[0] as DropdownOption;
    }

    // Update dropdown option
    async updateDropdownOption(id: number, data: Partial<DropdownOption>): Promise<DropdownOption> {
        const {
            optionLabel,
            displayOrder,
            colorClass,
            icon,
            isActive,
        } = data;

        // Get current option
        const [current] = await pool.query<any[]>(
            'SELECT option_type as optionType, is_system as isSystem FROM dropdown_options WHERE id = ?',
            [id]
        );

        if (!Array.isArray(current) || current.length === 0) {
            throw new Error(`Dropdown option ${id} not found`);
        }

        const { optionType } = current[0];

        // Build update query dynamically
        const updates: string[] = [];
        const values: any[] = [];

        if (optionLabel !== undefined) {
            updates.push('option_label = ?');
            values.push(optionLabel);
        }
        if (displayOrder !== undefined) {
            updates.push('display_order = ?');
            values.push(displayOrder);
        }
        if (colorClass !== undefined) {
            updates.push('color_class = ?');
            values.push(colorClass);
        }
        if (icon !== undefined) {
            updates.push('icon = ?');
            values.push(icon);
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            values.push(isActive ? 1 : 0);
        }

        if (updates.length === 0) {
            throw new Error('No fields to update');
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await pool.query(
            `UPDATE dropdown_options 
             SET ${updates.join(', ')}
             WHERE id = ?`,
            values
        );

        // Invalidate cache
        this.dropdownCache.delete(`${optionType}_true`);
        this.dropdownCache.delete(`${optionType}_false`);

        // Fetch and return updated option
        const [rows] = await pool.query<any[]>(
            `SELECT id, option_type as optionType, option_value as optionValue, 
                    option_label as optionLabel, display_order as displayOrder, 
                    color_class as colorClass, icon, is_active as isActive, 
                    is_system as isSystem, created_at as createdAt, 
                    updated_at as updatedAt
             FROM dropdown_options WHERE id = ?`,
            [id]
        );

        return rows[0] as DropdownOption;
    }

    // Delete dropdown option
    async deleteDropdownOption(id: number): Promise<void> {
        // Check if it's a system option
        const [rows] = await pool.query<any[]>(
            'SELECT option_type as optionType, is_system as isSystem FROM dropdown_options WHERE id = ?',
            [id]
        );

        if (!Array.isArray(rows) || rows.length === 0) {
            throw new Error(`Dropdown option ${id} not found`);
        }

        const { optionType, isSystem } = rows[0];

        if (isSystem) {
            throw new Error('Cannot delete system dropdown options');
        }

        await pool.query('DELETE FROM dropdown_options WHERE id = ?', [id]);

        // Invalidate cache
        this.dropdownCache.delete(`${optionType}_true`);
        this.dropdownCache.delete(`${optionType}_false`);
    }
}

export const configurationService = new ConfigurationService();
