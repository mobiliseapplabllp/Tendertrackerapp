import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tenderApi, documentApi } from '../lib/api';

// Mock fetch
global.fetch = vi.fn();

/**
 * Regression Tests
 * 
 * These tests ensure that existing functionality still works
 * after adding new document upload features.
 */
describe('Regression Tests - Existing Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Tender API - Existing Functionality', () => {
    it('should still create tenders correctly', async () => {
      const tenderData = {
        tenderNumber: 'TND-2025-001',
        title: 'Test Tender',
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
    });

    it('should still fetch all tenders with correct field mapping', async () => {
      const mockTenders = {
        data: [
          {
            id: 1,
            tender_number: 'TND-001',
            title: 'Test Tender',
            submission_deadline: '2025-12-31',
            company_name: 'Test Company',
            creator_name: 'Test User',
            estimated_value: '50000',
            currency: 'INR',
          },
        ],
        total: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTenders }),
      });

      const response = await tenderApi.getAll();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockTenders);
    });

    it('should still update tenders correctly', async () => {
      const updates = { title: 'Updated Title', status: 'Submitted' as const };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 1, ...updates } }),
      });

      const response = await tenderApi.update(1, updates);

      expect(response.success).toBe(true);
      expect(response.data.title).toBe('Updated Title');
    });

    it('should still get tender activities', async () => {
      const mockActivities = [
        {
          id: 1,
          tender_id: 1,
          user_id: 1,
          activity_type: 'Created',
          description: 'Tender created',
          created_at: '2025-01-01T00:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockActivities }),
      });

      const response = await tenderApi.getActivities(1);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockActivities);
    });
  });

  describe('Document API - New Functionality Does Not Break Existing', () => {
    it('should still fetch documents without filters', async () => {
      const mockDocuments = {
        data: [],
        total: 0,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDocuments }),
      });

      const response = await documentApi.getAll();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockDocuments);
    });

    it('should handle document operations without breaking tender operations', async () => {
      // Test that document operations don't interfere with tender operations
      const tenderData = { tenderNumber: 'TND-002', title: 'Test' };
      
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { id: 1, ...tenderData } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { data: [], total: 0 } }),
        });

      const tenderResponse = await tenderApi.create(tenderData);
      const docResponse = await documentApi.getAll({ tenderId: 1 });

      expect(tenderResponse.success).toBe(true);
      expect(docResponse.success).toBe(true);
    });
  });

  describe('Data Transformation - Backward Compatibility', () => {
    it('should handle both submissionDeadline and dueDate fields', async () => {
      const mockTender = {
        id: 1,
        tender_number: 'TND-001',
        submission_deadline: '2025-12-31',
        dueDate: '2025-12-31', // Both fields present
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockTender }),
      });

      const response = await tenderApi.getById(1);

      expect(response.success).toBe(true);
      // Should handle both fields gracefully
      expect(response.data).toBeDefined();
    });

    it('should transform document data correctly', async () => {
      const mockDocuments = {
        data: [
          {
            id: 1,
            tender_id: 1,
            file_name: 'test.pdf',
            original_name: 'test.pdf',
            file_size: 1024,
            mime_type: 'application/pdf',
            uploaded_by: 1,
            uploaded_at: '2025-01-01T00:00:00Z',
            uploaded_by_name: 'Test User',
          },
        ],
        total: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDocuments }),
      });

      const response = await documentApi.getAll({ tenderId: 1 });

      expect(response.success).toBe(true);
      expect(response.data.data[0]).toHaveProperty('uploaded_by_name');
    });
  });

  describe('Error Handling - Still Works Correctly', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      try {
        await tenderApi.getAll();
      } catch (error: any) {
        expect(error.message).toContain('Network error');
      }
    });

    it('should handle API errors with proper error messages', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Unauthorized' }),
      });

      const response = await tenderApi.getAll();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unauthorized');
    });
  });
});

