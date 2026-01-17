/**
 * Lead Controller Comprehensive Tests
 */

import { Request, Response, NextFunction } from 'express';
import { LeadController } from '../controllers/leadController';
import db from '../config/database';
import { CustomError } from '../middleware/errorHandler';

jest.mock('../config/database');
jest.mock('../services/notificationService');
jest.mock('../utils/logger');

describe('LeadController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: { userId: 1, email: 'test@example.com', role: 'Admin' },
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return paginated leads', async () => {
      const mockLeads = [
        {
          id: 1,
          tender_number: 'LD-001',
          title: 'Test Lead',
          status: 'Draft',
          created_at: new Date(),
        },
      ];

      (db.query as jest.Mock)
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([mockLeads])
        .mockResolvedValueOnce([[]]);

      await LeadController.getAll(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            data: expect.any(Array),
            total: 1,
          }),
        })
      );
    });

    it('should filter leads by status', async () => {
      mockRequest.query = { status: ['Draft'] };

      (db.query as jest.Mock)
        .mockResolvedValueOnce([[{ total: 1 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      await LeadController.getAll(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.any(Array)
      );
    });

    it('should handle search query', async () => {
      mockRequest.query = { search: 'test' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce([[{ total: 0 }]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      await LeadController.getAll(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('LIKE'),
        expect.arrayContaining([expect.stringContaining('%test%')])
      );
    });
  });

  describe('getById', () => {
    it('should return lead by ID', async () => {
      mockRequest.params = { id: '1' };
      const mockLead = {
        id: 1,
        tender_number: 'LD-001',
        title: 'Test Lead',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce([[mockLead]])
        .mockResolvedValueOnce([[]]);

      await LeadController.getById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        })
      );
    });

    it('should return 404 for non-existent lead', async () => {
      mockRequest.params = { id: '999' };

      (db.query as jest.Mock).mockResolvedValueOnce([[]]);

      await LeadController.getById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(CustomError)
      );
    });
  });

  describe('create', () => {
    it('should create a new lead', async () => {
      mockRequest.body = {
        leadNumber: 'LD-001',
        title: 'New Lead',
        status: 'Draft',
        leadTypeId: 1,
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      await LeadController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should require leadNumber', async () => {
      mockRequest.body = {
        title: 'New Lead',
      };

      await LeadController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize input to prevent XSS', async () => {
      mockRequest.body = {
        leadNumber: 'LD-001',
        title: '<script>alert("XSS")</script>',
        description: '<img src=x onerror=alert(1)>',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce([{ insertId: 1 }])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      await LeadController.create(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Verify sanitized data is stored
      const insertCall = (db.query as jest.Mock).mock.calls.find(
        call => call[0].includes('INSERT')
      );
      if (insertCall) {
        const params = insertCall[1];
        expect(params.some((p: string) => p && p.includes('<script>'))).toBe(false);
      }
    });
  });

  describe('update', () => {
    it('should update existing lead', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = {
        title: 'Updated Lead',
      };

      (db.query as jest.Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]])
        .mockResolvedValueOnce([[]]);

      await LeadController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should return 404 for non-existent lead', async () => {
      mockRequest.params = { id: '999' };
      mockRequest.body = { title: 'Updated' };

      (db.query as jest.Mock).mockResolvedValueOnce([[]]);

      await LeadController.update(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.any(CustomError)
      );
    });
  });

  describe('delete', () => {
    it('should soft delete lead', async () => {
      mockRequest.params = { id: '1' };

      (db.query as jest.Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[]]);

      await LeadController.delete(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe('updateStage', () => {
    it('should update lead sales stage', async () => {
      mockRequest.params = { id: '1' };
      mockRequest.body = { salesStageId: 2 };

      (db.query as jest.Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }])
        .mockResolvedValueOnce([[]]);

      await LeadController.updateStage(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});
