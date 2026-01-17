import { Request, Response, NextFunction } from 'express';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import * as crypto from 'crypto';
import logger from '../utils/logger';
import { AIService } from '../services/aiService';

const ENCRYPTION_KEY = process.env.AI_API_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

export class AIController {
  /**
   * Encrypt API key
   */
  static encryptApiKey(apiKey: string): string {
    try {
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

      let encrypted = cipher.update(apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Return iv:authTag:encrypted
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error: any) {
      logger.error({
        message: 'Failed to encrypt API key',
        error: error.message,
      });
      throw new CustomError('Failed to encrypt API key', 500);
    }
  }

  /**
   * Get all AI API configurations
   */
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const [configs] = await db.query(
        `SELECT 
          id,
          provider_name,
          model_name,
          base_url,
          is_active,
          is_default,
          max_tokens,
          temperature,
          description,
          created_by,
          updated_by,
          created_at,
          updated_at
        FROM ai_api_configs 
        ORDER BY is_default DESC, created_at DESC`
      );

      const configsArray = configs as any[];
      const transformedConfigs = configsArray.map((config: any) => ({
        id: config.id,
        providerName: config.provider_name,
        modelName: config.model_name,
        baseUrl: config.base_url || null,
        isActive: config.is_active === 1 || config.is_active === true,
        isDefault: config.is_default === 1 || config.is_default === true,
        maxTokens: config.max_tokens || 2000,
        temperature: config.temperature ? parseFloat(config.temperature) : 0.7,
        description: config.description || null,
        createdBy: config.created_by || null,
        updatedBy: config.updated_by || null,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      }));

      res.json({
        success: true,
        data: transformedConfigs,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Get a single AI API configuration by ID
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const [configs] = await db.query(
        `SELECT 
          id,
          provider_name,
          model_name,
          base_url,
          is_active,
          is_default,
          max_tokens,
          temperature,
          description,
          created_by,
          updated_by,
          created_at,
          updated_at
        FROM ai_api_configs 
        WHERE id = ?`,
        [id]
      );

      const configsArray = configs as any[];
      if (configsArray.length === 0) {
        throw new CustomError('AI API configuration not found', 404);
      }

      const config = configsArray[0];
      const transformedConfig = {
        id: config.id,
        providerName: config.provider_name,
        modelName: config.model_name,
        baseUrl: config.base_url || null,
        isActive: config.is_active === 1 || config.is_active === true,
        isDefault: config.is_default === 1 || config.is_default === true,
        maxTokens: config.max_tokens || 2000,
        temperature: config.temperature ? parseFloat(config.temperature) : 0.7,
        description: config.description || null,
        createdBy: config.created_by || null,
        updatedBy: config.updated_by || null,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      };

      res.json({
        success: true,
        data: transformedConfig,
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Create a new AI API configuration
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        providerName,
        modelName,
        apiKey,
        baseUrl,
        isActive = true,
        isDefault = false,
        maxTokens = 2000,
        temperature = 0.7,
        description,
      } = req.body;

      if (!providerName || !modelName) {
        throw new CustomError('Provider name and model name are required', 400);
      }

      // API key is optional for Ollama (local)
      const providerNameLower = providerName.toLowerCase();
      const isOllama = providerNameLower.includes('ollama') ||
        (baseUrl && baseUrl.includes('localhost:11434'));

      if (!apiKey && !isOllama) {
        throw new CustomError('API key is required for this provider', 400);
      }

      const userId = req.user?.userId;

      // If setting as default, unset other defaults
      if (isDefault) {
        await db.query(
          'UPDATE ai_api_configs SET is_default = FALSE WHERE is_default = TRUE'
        );
      }

      // Encrypt API key only if provided (Ollama doesn't need one)
      // Store empty string for Ollama (database requires NOT NULL)
      const encryptedApiKey = (apiKey && apiKey.trim()) ? AIController.encryptApiKey(apiKey.trim()) : '';

      // Insert new configuration
      const [result] = await db.query(
        `INSERT INTO ai_api_configs 
        (provider_name, model_name, api_key_encrypted, base_url, is_active, is_default, max_tokens, temperature, description, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          providerName,
          modelName,
          encryptedApiKey || '', // Ensure we store empty string, not null
          baseUrl || null,
          isActive ? 1 : 0,
          isDefault ? 1 : 0,
          maxTokens,
          temperature,
          description || null,
          userId || null,
          userId || null,
        ]
      );

      const insertResult = result as any;
      const configId = insertResult.insertId;

      // Fetch the created configuration
      const [newConfigs] = await db.query(
        `SELECT 
          id,
          provider_name,
          model_name,
          base_url,
          is_active,
          is_default,
          max_tokens,
          temperature,
          description,
          created_by,
          updated_by,
          created_at,
          updated_at
        FROM ai_api_configs 
        WHERE id = ?`,
        [configId]
      );

      const configsArray = newConfigs as any[];
      const config = configsArray[0];

      const transformedConfig = {
        id: config.id,
        providerName: config.provider_name,
        modelName: config.model_name,
        baseUrl: config.base_url || null,
        isActive: config.is_active === 1 || config.is_active === true,
        isDefault: config.is_default === 1 || config.is_default === true,
        maxTokens: config.max_tokens || 2000,
        temperature: config.temperature ? parseFloat(config.temperature) : 0.7,
        description: config.description || null,
        createdBy: config.created_by || null,
        updatedBy: config.updated_by || null,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      };

      res.status(201).json({
        success: true,
        data: transformedConfig,
        message: 'AI API configuration created successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Update an AI API configuration
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        providerName,
        modelName,
        apiKey,
        baseUrl,
        isActive,
        isDefault,
        maxTokens,
        temperature,
        description,
      } = req.body;

      const userId = req.user?.userId;

      // Check if configuration exists
      const [existing] = await db.query(
        'SELECT * FROM ai_api_configs WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('AI API configuration not found', 404);
      }

      // If setting as default, unset other defaults
      if (isDefault !== undefined && isDefault) {
        await db.query(
          'UPDATE ai_api_configs SET is_default = FALSE WHERE is_default = TRUE AND id != ?',
          [id]
        );
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];

      if (providerName !== undefined) {
        updates.push('provider_name = ?');
        values.push(providerName);
      }
      if (modelName !== undefined) {
        updates.push('model_name = ?');
        values.push(modelName);
      }
      if (apiKey !== undefined) {
        // Only encrypt if API key is provided and not empty
        // For Ollama, we allow empty API key
        const encryptedApiKey = (apiKey && apiKey.trim()) ? AIController.encryptApiKey(apiKey.trim()) : '';
        updates.push('api_key_encrypted = ?');
        values.push(encryptedApiKey || '');
      }
      if (baseUrl !== undefined) {
        updates.push('base_url = ?');
        values.push(baseUrl || null);
      }
      if (isActive !== undefined) {
        updates.push('is_active = ?');
        values.push(isActive ? 1 : 0);
      }
      if (isDefault !== undefined) {
        updates.push('is_default = ?');
        values.push(isDefault ? 1 : 0);
      }
      if (maxTokens !== undefined) {
        updates.push('max_tokens = ?');
        values.push(maxTokens);
      }
      if (temperature !== undefined) {
        updates.push('temperature = ?');
        values.push(temperature);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description || null);
      }

      if (updates.length === 0) {
        throw new CustomError('No fields to update', 400);
      }

      updates.push('updated_by = ?');
      values.push(userId || null);
      values.push(id);

      await db.query(
        `UPDATE ai_api_configs 
        SET ${updates.join(', ')}
        WHERE id = ?`,
        values
      );

      // Fetch the updated configuration
      const [updatedConfigs] = await db.query(
        `SELECT 
          id,
          provider_name,
          model_name,
          base_url,
          is_active,
          is_default,
          max_tokens,
          temperature,
          description,
          created_by,
          updated_by,
          created_at,
          updated_at
        FROM ai_api_configs 
        WHERE id = ?`,
        [id]
      );

      const configsArray = updatedConfigs as any[];
      const config = configsArray[0];

      const transformedConfig = {
        id: config.id,
        providerName: config.provider_name,
        modelName: config.model_name,
        baseUrl: config.base_url || null,
        isActive: config.is_active === 1 || config.is_active === true,
        isDefault: config.is_default === 1 || config.is_default === true,
        maxTokens: config.max_tokens || 2000,
        temperature: config.temperature ? parseFloat(config.temperature) : 0.7,
        description: config.description || null,
        createdBy: config.created_by || null,
        updatedBy: config.updated_by || null,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
      };

      res.json({
        success: true,
        data: transformedConfig,
        message: 'AI API configuration updated successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Delete an AI API configuration
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if configuration exists
      const [existing] = await db.query(
        'SELECT * FROM ai_api_configs WHERE id = ?',
        [id]
      );

      const existingArray = existing as any[];
      if (existingArray.length === 0) {
        throw new CustomError('AI API configuration not found', 404);
      }

      await db.query('DELETE FROM ai_api_configs WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'AI API configuration deleted successfully',
      });
    } catch (error: any) {
      next(error);
    }
  }

  /**
   * Test an AI API configuration
   */
  static async test(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const response = await AIService.testConnection(parseInt(id));

      res.json({
        success: true,
        message: 'AI API test successful',
        data: {
          response,
        },
      });
    } catch (error: any) {
      // Pass error to handler, but try to provide context
      if (error.message && (error.message.includes('quota') || error.message.includes('rate limit'))) {
        // These are client errors, not server errors
        res.status(400).json({
          success: false,
          message: 'AI API test failed',
          error: error.message,
          isConnectionWorking: true, // Connection worked but provider rejected
        });
        return;
      }
      next(error);
    }
  }
}
