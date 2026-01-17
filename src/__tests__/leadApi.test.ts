/**
 * Lead API Client Tests
 * 
 * Tests for the leadApi client functions
 */

import { leadApi, leadTypeApi, pipelineApi, activityApi, dealApi } from '../lib/api';

// Mock fetch
global.fetch = jest.fn();

describe('Lead API', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    localStorage.setItem('auth_token', 'test-token');
  });

  afterEach(() => {
    localStorage.removeItem('auth_token');
  });

  describe('leadApi', () => {
    it('should fetch all leads', async () => {
      const mockResponse = {
        success: true,
        data: {
          data: [{ id: 1, title: 'Test Lead' }],
          total: 1,
          page: 1,
          pageSize: 10,
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await leadApi.getAll();

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/leads'),
        expect.any(Object)
      );
    });

    it('should create a lead', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, title: 'New Lead' },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await leadApi.create({
        leadNumber: 'LD-001',
        title: 'New Lead',
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/leads'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('pipelineApi', () => {
    it('should fetch pipeline view', async () => {
      const mockResponse = {
        success: true,
        data: {
          New: {
            stage: { id: 1, name: 'New' },
            leads: [],
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await pipelineApi.getPipeline();

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/pipeline'),
        expect.any(Object)
      );
    });
  });

  describe('activityApi', () => {
    it('should create a call', async () => {
      const mockResponse = {
        success: true,
        data: { id: 1, subject: 'Test Call' },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await activityApi.createCall(1, {
        subject: 'Test Call',
        callDate: '2025-01-27T10:00:00Z',
      });

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/leads/1/calls'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('dealApi', () => {
    it('should fetch sales forecast', async () => {
      const mockResponse = {
        success: true,
        data: {
          period: 'month',
          metrics: {
            totalDeals: 10,
            weightedValue: 50000,
          },
        },
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await dealApi.getForecast('month');

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/deals/forecast'),
        expect.any(Object)
      );
    });
  });
});


