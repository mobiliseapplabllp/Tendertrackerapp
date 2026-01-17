import { describe, it, expect, vi, beforeEach } from 'vitest';
import { documentApi } from '../lib/api';

// Mock fetch
global.fetch = vi.fn();

describe('Document API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getAll', () => {
    it('should fetch all documents with filters', async () => {
      const mockDocuments = {
        data: [
          {
            id: 1,
            tender_id: 1,
            category_id: null,
            file_name: 'test.pdf',
            original_name: 'test.pdf',
            file_path: '/uploads/test.pdf',
            file_size: 1024,
            mime_type: 'application/pdf',
            uploaded_by: 1,
            uploaded_at: '2025-01-01T00:00:00Z',
            uploaded_by_name: 'Test User',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDocuments }),
      });

      const response = await documentApi.getAll({ tenderId: 1 });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockDocuments);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents?tenderId=1'),
        expect.any(Object)
      );
    });

    it('should handle API errors correctly', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Unauthorized' }),
      });

      const response = await documentApi.getAll();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unauthorized');
    });
  });

  describe('upload', () => {
    it('should upload a document with tenderId', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockDocument = {
        id: 1,
        tender_id: 1,
        file_name: 'test.pdf',
        original_name: 'test.pdf',
        file_size: 1024,
        mime_type: 'application/pdf',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDocument }),
      });

      const response = await documentApi.upload(file, { tenderId: 1 });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockDocument);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );
    });

    it('should upload a document with categoryId for technical documents', async () => {
      const file = new File(['test content'], 'spec.pdf', { type: 'application/pdf' });
      const mockDocument = {
        id: 2,
        tender_id: 1,
        category_id: 5, // Technical Documents category
        file_name: 'spec.pdf',
        original_name: 'spec.pdf',
        file_size: 2048,
        mime_type: 'application/pdf',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockDocument }),
      });

      const response = await documentApi.upload(file, { tenderId: 1, categoryId: 5 });

      expect(response.success).toBe(true);
      expect(response.data.category_id).toBe(5);
    });

    it('should include auth token in upload request', async () => {
      localStorage.setItem('auth_token', 'test-token-123');
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
      });

      await documentApi.upload(file, { tenderId: 1 });

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

  describe('delete', () => {
    it('should delete a document', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Document deleted' }),
      });

      const response = await documentApi.delete(1);

      expect(response.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should handle delete errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Document not found' }),
      });

      const response = await documentApi.delete(999);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Document not found');
    });
  });

  describe('getCategories', () => {
    it('should fetch document categories', async () => {
      const mockCategories = [
        { id: 1, name: 'Tax Documents', is_system: true },
        { id: 5, name: 'Technical Documents', is_system: true },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCategories }),
      });

      const response = await documentApi.getCategories();

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockCategories);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents/categories'),
        expect.any(Object)
      );
    });
  });
});

