// API Client for TenderTrack Pro
// This file will be used to connect to the MySQL backend

import type {
  User,
  Company,
  Contact,
  Tender,
  Document,
  TenderActivity,
  DashboardStats,
  ApiResponse,
  PaginatedResponse,
  FilterOptions,
  SystemConfig,
} from './types';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

// Helper function to get auth token
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return { success: true, data: data.data || data };
  } catch (error) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================
// Authentication APIs
// ============================================

export const authApi = {
  login: async (email: string, password: string) => {
    return apiCall<{ requiresOTP: boolean; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  verifyOTP: async (email: string, otp: string) => {
    return apiCall<{ token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  },

  resendOTP: async (email: string) => {
    return apiCall<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  logout: async () => {
    return apiCall('/auth/logout', { method: 'POST' });
  },

  getCurrentUser: async () => {
    return apiCall<User>('/users/me');
  },
};

// ============================================
// Tender APIs
// ============================================

export const tenderApi = {
  getAll: async (filters?: FilterOptions) => {
    const params = new URLSearchParams(filters as any);
    return apiCall<PaginatedResponse<Tender>>(`/tenders?${params}`);
  },

  getById: async (id: number) => {
    return apiCall<Tender>(`/tenders/${id}`);
  },

  create: async (data: Partial<Tender>) => {
    return apiCall<Tender>('/tenders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Tender>) => {
    return apiCall<Tender>(`/tenders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiCall(`/tenders/${id}`, { method: 'DELETE' });
  },

  getActivities: async (id: number) => {
    return apiCall<TenderActivity[]>(`/tenders/${id}/activities`);
  },

  addActivity: async (id: number, data: Partial<TenderActivity>) => {
    return apiCall<TenderActivity>(`/tenders/${id}/activities`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// Company APIs
// ============================================

export const companyApi = {
  getAll: async (filters?: FilterOptions) => {
    const params = new URLSearchParams(filters as any);
    return apiCall<PaginatedResponse<Company>>(`/companies?${params}`);
  },

  getById: async (id: number) => {
    return apiCall<Company>(`/companies/${id}`);
  },

  create: async (data: Partial<Company>) => {
    return apiCall<Company>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<Company>) => {
    return apiCall<Company>(`/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiCall(`/companies/${id}`, { method: 'DELETE' });
  },

  getContacts: async (id: number) => {
    return apiCall<Contact[]>(`/companies/${id}/contacts`);
  },

  addContact: async (id: number, data: Partial<Contact>) => {
    return apiCall<Contact>(`/companies/${id}/contacts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// User APIs
// ============================================

export const userApi = {
  getAll: async (filters?: FilterOptions) => {
    const params = new URLSearchParams(filters as any);
    return apiCall<PaginatedResponse<User>>(`/users?${params}`);
  },

  getById: async (id: number) => {
    return apiCall<User>(`/users/${id}`);
  },

  create: async (data: Partial<User> & { password: string }) => {
    return apiCall<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<User>) => {
    return apiCall<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiCall(`/users/${id}`, { method: 'DELETE' });
  },
};

// ============================================
// Document APIs
// ============================================

export const documentApi = {
  getAll: async (filters?: FilterOptions) => {
    const params = new URLSearchParams(filters as any);
    return apiCall<PaginatedResponse<Document>>(`/documents?${params}`);
  },

  getById: async (id: number) => {
    return apiCall<Document>(`/documents/${id}`);
  },

  upload: async (file: File, data: Partial<Document>) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('data', JSON.stringify(data));

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const result = await response.json();
    return { success: response.ok, data: result.data, error: result.error };
  },

  delete: async (id: number) => {
    return apiCall(`/documents/${id}`, { method: 'DELETE' });
  },

  toggleFavorite: async (id: number) => {
    return apiCall<Document>(`/documents/${id}/favorite`, { method: 'PUT' });
  },

  getCategories: async () => {
    return apiCall<any[]>('/documents/categories');
  },
};

// ============================================
// Dashboard APIs
// ============================================

export const dashboardApi = {
  getStats: async () => {
    return apiCall<DashboardStats>('/reports/dashboard');
  },
};

// ============================================
// Admin APIs
// ============================================

export const adminApi = {
  getConfig: async () => {
    return apiCall<SystemConfig[]>('/admin/config');
  },

  updateConfig: async (configKey: string, configValue: string) => {
    return apiCall<SystemConfig>('/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ configKey, configValue }),
    });
  },

  testEmail: async (email: string) => {
    return apiCall<{ success: boolean; message: string }>('/admin/email/test', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  testSMS: async (phoneNumber: string) => {
    return apiCall<{ success: boolean; message: string }>('/admin/sms/test', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  },

  getAuditLogs: async (filters?: FilterOptions) => {
    const params = new URLSearchParams(filters as any);
    return apiCall<PaginatedResponse<any>>(`/admin/audit-logs?${params}`);
  },
};

// ============================================
// Helper to store/retrieve auth token
// ============================================

export const tokenManager = {
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
  },

  getToken: () => {
    return localStorage.getItem('auth_token');
  },

  removeToken: () => {
    localStorage.removeItem('auth_token');
  },
};
