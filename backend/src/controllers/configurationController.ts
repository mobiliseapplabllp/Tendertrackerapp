import { Request, Response } from 'express';
import { configurationService } from '../services/configurationService';

export class ConfigurationController {
    // Get all system settings
    async getAllSettings(req: Request, res: Response): Promise<void> {
        try {
            const settings = await configurationService.getAllSettings();
            res.json({ success: true, data: settings });
        } catch (error: any) {
            console.error('Error fetching settings:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get specific setting
    async getSetting(req: Request, res: Response): Promise<void> {
        try {
            const { key } = req.params;
            const value = await configurationService.getSetting(key);

            if (value === null) {
                res.status(404).json({ success: false, error: 'Setting not found' });
                return;
            }

            res.json({ success: true, data: { key, value } });
        } catch (error: any) {
            console.error('Error fetching setting:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Update setting
    async updateSetting(req: Request, res: Response): Promise<void> {
        try {
            const { key } = req.params;
            const { value } = req.body;

            if (value === undefined) {
                res.status(400).json({ success: false, error: 'Value is required' });
                return;
            }

            const updated = await configurationService.updateSetting(key, value);
            res.json({ success: true, data: updated });
        } catch (error: any) {
            console.error('Error updating setting:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                error.message.includes('not editable') ? 403 : 500;
            res.status(statusCode).json({ success: false, error: error.message });
        }
    }

    // Get dropdown options
    async getDropdownOptions(req: Request, res: Response): Promise<void> {
        try {
            const { type } = req.params;
            const activeOnly = req.query.activeOnly !== 'false';

            const options = await configurationService.getDropdownOptions(type, activeOnly);
            res.json({ success: true, data: options });
        } catch (error: any) {
            console.error('Error fetching dropdown options:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Create dropdown option
    async createDropdownOption(req: Request, res: Response): Promise<void> {
        try {
            const option = await configurationService.createDropdownOption(req.body);
            res.status(201).json({ success: true, data: option });
        } catch (error: any) {
            console.error('Error creating dropdown option:', error);
            const statusCode = error.message.includes('required') ? 400 : 500;
            res.status(statusCode).json({ success: false, error: error.message });
        }
    }

    // Update dropdown option
    async updateDropdownOption(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const option = await configurationService.updateDropdownOption(parseInt(id), req.body);
            res.json({ success: true, data: option });
        } catch (error: any) {
            console.error('Error updating dropdown option:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                error.message.includes('No fields') ? 400 : 500;
            res.status(statusCode).json({ success: false, error: error.message });
        }
    }

    // Delete dropdown option
    async deleteDropdownOption(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            await configurationService.deleteDropdownOption(parseInt(id));
            res.json({ success: true, message: 'Dropdown option deleted successfully' });
        } catch (error: any) {
            console.error('Error deleting dropdown option:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                error.message.includes('Cannot delete system') ? 403 : 500;
            res.status(statusCode).json({ success: false, error: error.message });
        }
    }

    // Clear cache (admin only)
    async clearCache(req: Request, res: Response): Promise<void> {
        try {
            configurationService.clearCache();
            res.json({ success: true, message: 'Cache cleared successfully' });
        } catch (error: any) {
            console.error('Error clearing cache:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

export const configurationController = new ConfigurationController();
