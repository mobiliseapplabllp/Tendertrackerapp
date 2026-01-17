import { describe, it, expect, vi, beforeEach } from 'vitest';
import { categoryApi, tagApi, tenderApi, companyApi, userApi } from '../lib/api';

// Mock fetch
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Category API', () => {
    it('should fetch all categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Infrastructure', color: '#3b82f6', tenderCount: 5 },
        { id: 2, name: 'Healthcare', color: '#10b981', tenderCount: 3 },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCategories }),
      });

      const response = await categoryApi.getAll();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCategories);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/categories'),
        expect.any(Object)
      );
    });

    it('should create a category', async () => {
      const newCategory = { name: 'Technology', color: '#8b5cf6', description: 'IT projects' };
      const createdCategory = { id: 3, ...newCategory, tenderCount: 0 };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: createdCategory }),
      });

      const response = await categoryApi.create(newCategory);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdCategory);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/categories'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newCategory),
        })
      );
    });

    it('should update a category', async () => {
      const updates = { name: 'Updated Category', color: '#ef4444' };
      const updatedCategory = { id: 1, ...updates, tenderCount: 5 };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: updatedCategory }),
      });

      const response = await categoryApi.update(1, updates);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(updatedCategory);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/categories/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      );
    });

    it('should delete a category', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Category deleted' }),
      });

      const response = await categoryApi.delete(1);

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/categories/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Tag API', () => {
    it('should fetch all tags', async () => {
      const mockTags = [
        { id: 1, name: 'Urgent', usageCount: 10 },
        { id: 2, name: 'High Value', usageCount: 5 },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTags }),
      });

      const response = await tagApi.getAll();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockTags);
    });

    it('should create a tag', async () => {
      const newTag = { name: 'Recurring' };
      const createdTag = { id: 3, ...newTag, usageCount: 0 };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: createdTag }),
      });

      const response = await tagApi.create(newTag);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdTag);
    });
  });

  describe('Tender API', () => {
    it('should create a tender with correct field mapping', async () => {
      const tenderData = {
        tenderNumber: 'TND-2025-001',
        title: 'Test Tender',
        description: 'Test description',
        status: 'Draft' as const,
        submissionDeadline: '2025-12-31',
        estimatedValue: 50000,
        currency: 'INR',
      };

      const createdTender = { id: 1, ...tenderData };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: createdTender }),
      });

      const response = await tenderApi.create(tenderData);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdTender);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenders'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(tenderData),
        })
      );
    });

    it('should handle API errors correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Validation failed' }),
      });

      const response = await tenderApi.create({ tenderNumber: '', title: '' });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Validation failed');
    });
  });

  describe('Authentication', () => {
    it('should include auth token in requests when available', async () => {
      localStorage.setItem('auth_token', 'test-token-123');

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      await categoryApi.getAll();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });
  });
});


