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
  TenderCategory,
  TenderTag,
  WorkLogReminder,
  AIApiConfig,
  TenderScoutSource,
  TenderScoutInterest,
  TenderScoutResult,
  TenderScoutLog,
  AISearchResult,
} from './types';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

// Helper function to get auth token
function getAuthToken(): string | null {
  const token = localStorage.getItem('auth_token');

  // If no token, return null
  if (!token) {
    return null;
  }

  // Check if token is expired (basic check)
  try {
    // Decode JWT token (without verification, just to check expiration)
    const parts = token.split('.');
    if (parts.length !== 3) {
      // Invalid token format, remove it
      localStorage.removeItem('auth_token');
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;

    if (exp && exp * 1000 < Date.now()) {
      // Token expired, remove it
      localStorage.removeItem('auth_token');
      return null;
    }
  } catch (e) {
    // Invalid token format, but don't remove it - might be a server-side issue
    // Just return null for this request
    if (import.meta.env.DEV) {
      console.warn('Token decode error:', e);
    }
    return null;
  }

  return token;
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

    // Handle 401 Unauthorized - token might be missing or expired
    if (response.status === 401) {
      // Remove invalid token
      localStorage.removeItem('auth_token');
      const data = await response.json().catch(() => ({ error: 'Unauthorized' }));
      throw new Error(data.error || data.message || 'Authentication required. Please login again.');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }

    // Backend returns { success: true, data: {...} } or just { data: {...} }
    // Return the data directly if success is true, otherwise return the whole response
    if (data.success !== false) {
      return { success: true, data: data.data || data };
    }

    // Preserve additional error metadata (isConnectionWorking, errorType) for better error handling
    return {
      success: false,
      error: data.error || data.message || 'Unknown error',
      isConnectionWorking: data.isConnectionWorking,
      errorType: data.errorType,
    };
  } catch (error) {
    // Only log errors in development mode to reduce console noise
    if (import.meta.env.DEV) {
      console.error('API Error:', error);
    }
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
    return apiCall<{
      requiresOTP: boolean;
      message?: string;
      userId?: number;
      token?: string;
      user?: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  verifyOTP: async (email: string, otp: string, userId: number) => {
    return apiCall<{ token: string; user: User }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, userId }),
    });
  },

  resendOTP: async (email: string, userId: number) => {
    return apiCall<{ message: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email, userId }),
    });
  },

  logout: async () => {
    return apiCall('/auth/logout', { method: 'POST' });
  },

  getCurrentUser: async () => {
    return apiCall<User>('/users/me');
  },

  forgotPassword: async (email: string) => {
    return apiCall<{ message: string; userId: number | null }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyForgotPasswordOTP: async (email: string, otp: string, userId: number) => {
    return apiCall<{ message: string; userId: number }>('/auth/verify-forgot-password-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, userId }),
    });
  },

  resetPassword: async (email: string, otp: string, userId: number, newPassword: string) => {
    return apiCall<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, userId, newPassword }),
    });
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

  restore: async (id: number) => {
    return apiCall(`/tenders/${id}/restore`, { method: 'POST' });
  },

  permanentDelete: async (id: number) => {
    return apiCall(`/tenders/${id}/permanent`, { method: 'DELETE' });
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

  updateActivity: async (id: number, activityId: number, data: { description: string }) => {
    return apiCall<TenderActivity>(`/tenders/${id}/activities/${activityId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteActivity: async (id: number, activityId: number) => {
    return apiCall(`/tenders/${id}/activities/${activityId}`, {
      method: 'DELETE',
    });
  },

  generateSummary: async (id: number) => {
    return apiCall<{ summary: string }>(`/tenders/${id}/summary`, {
      method: 'POST',
    });
  },

  sendSummaryEmail: async (id: number, email: string) => {
    return apiCall<{ message: string }>(`/tenders/${id}/summary/email`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  chat: async (id: number, question: string, chatHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []) => {
    return apiCall<{ answer: string }>(`/tenders/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ question, chatHistory }),
    });
  },
};

// ============================================
// Reminder APIs
// ============================================

export const reminderApi = {
  create: async (activityId: number, data: {
    actionRequired: string;
    dueDate?: string;
    recipients: Array<{ email?: string; phoneNumber?: string; userId?: number }>;
  }) => {
    return apiCall<WorkLogReminder>(`/reminders/activities/${activityId}/reminders`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getByActivity: async (activityId: number) => {
    return apiCall<WorkLogReminder[]>(`/reminders/activities/${activityId}/reminders`);
  },

  markComplete: async (reminderId: number) => {
    return apiCall<WorkLogReminder>(`/reminders/reminders/${reminderId}/complete`, {
      method: 'POST',
    });
  },

  delete: async (reminderId: number) => {
    return apiCall(`/reminders/reminders/${reminderId}`, {
      method: 'DELETE',
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

  updateContact: async (companyId: number, contactId: number, data: Partial<Contact>) => {
    return apiCall<Contact>(`/companies/${companyId}/contacts/${contactId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteContact: async (companyId: number, contactId: number) => {
    return apiCall(`/companies/${companyId}/contacts/${contactId}`, {
      method: 'DELETE',
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

  view: async (docId: number) => {
    const token = getAuthToken();
    const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

    if (token) {
      // Fetch the document as a blob and open it in a new window
      try {
        const response = await fetch(`${API_BASE_URL}/documents/${docId}/view`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          // Revoke URL after a delay to allow the browser to load it
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } else {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || response.statusText);
        }
      } catch (error: any) {
        throw new Error(error.message || 'Failed to view document');
      }
    } else {
      throw new Error('Not authenticated');
    }
  },

  upload: async (file: File, data: Partial<Document>) => {
    const formData = new FormData();
    formData.append('file', file);

    // Append data fields directly to FormData (not as JSON)
    if (data.tenderId) {
      formData.append('tenderId', data.tenderId.toString());
    }
    if (data.categoryId) {
      formData.append('categoryId', data.categoryId.toString());
    }
    if (data.expirationDate) {
      formData.append('expirationDate', data.expirationDate);
    }

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Don't set Content-Type - let browser set it with boundary for multipart/form-data

    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const result = await response.json();
    return { success: response.ok, data: result.data, error: result.error };
  },

  update: async (id: number, data: { name?: string; description?: string; categoryId?: number; expirationDate?: string }) => {
    return apiCall<Document>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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

  createCategory: async (data: { name: string; description?: string; icon?: string }) => {
    return apiCall<any>('/documents/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateCategory: async (id: number, data: { name?: string; description?: string; icon?: string }) => {
    return apiCall<any>(`/documents/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteCategory: async (id: number) => {
    return apiCall(`/documents/categories/${id}`, { method: 'DELETE' });
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
// Reports APIs
// ============================================

export const reportApi = {
  getTenderReports: async (filters?: FilterOptions) => {
    const params = new URLSearchParams(filters as any);
    return apiCall<any>(`/reports/tenders?${params}`);
  },

  getPerformance: async (filters?: FilterOptions) => {
    const params = new URLSearchParams(filters as any);
    return apiCall<any>(`/reports/performance?${params}`);
  },

  exportData: async (format: 'csv' | 'json', filters?: FilterOptions) => {
    const params = new URLSearchParams(filters as any);
    const token = getAuthToken();

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/reports/export?format=${format}&${params}`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob();
      return { success: true, data: blob };
    } catch (error) {
      // Only log errors in development mode to reduce console noise
      if (import.meta.env.DEV) {
        console.error('Export Error:', error);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
};

// ============================================
// Category APIs
// ============================================

export const categoryApi = {
  getAll: async () => {
    return apiCall<TenderCategory[]>('/categories');
  },

  getById: async (id: number) => {
    return apiCall<TenderCategory>(`/categories/${id}`);
  },

  create: async (data: { name: string; description?: string; color?: string; icon?: string }) => {
    return apiCall<TenderCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<TenderCategory>) => {
    return apiCall<TenderCategory>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiCall(`/categories/${id}`, { method: 'DELETE' });
  },
};

// ============================================
// Tag APIs
// ============================================

export const tagApi = {
  getAll: async () => {
    return apiCall<TenderTag[]>('/tags');
  },

  getById: async (id: number) => {
    return apiCall<TenderTag>(`/tags/${id}`);
  },

  create: async (data: { name: string; color?: string }) => {
    return apiCall<TenderTag>('/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id: number, data: Partial<TenderTag>) => {
    return apiCall<TenderTag>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: number) => {
    return apiCall(`/tags/${id}`, { method: 'DELETE' });
  },
};

// ============================================
// Admin APIs
// ============================================

export const adminApi = {
  getConfig: async () => {
    return apiCall<SystemConfig[]>('/admin/config');
  },

  updateConfig: async (configKey: string, configValue: string, configType: string = 'string') => {
    return apiCall<SystemConfig>('/admin/config', {
      method: 'PUT',
      body: JSON.stringify({ configKey, configValue, configType }),
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

  getEmailAlerts: async () => {
    return apiCall<{ recipients: string[]; schedule: any }>('/admin/email-alerts');
  },

  updateEmailAlerts: async (recipients: string[], schedule: any) => {
    return apiCall<{ message: string }>('/admin/email-alerts', {
      method: 'PUT',
      body: JSON.stringify({ recipients, schedule }),
    });
  },

  sendTestNotifications: async () => {
    return apiCall<{ message: string; recipients: string[]; results: any[] }>('/admin/email-alerts/test', {
      method: 'POST',
    });
  },

  sendCustomAlert: async (data: {
    subject: string;
    message: string;
    categoryId?: number | null;
    daysUntilDeadline?: number | null;
  }) => {
    return apiCall<{ message: string; recipients: string[] }>('/admin/email-alerts/custom', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  runNotificationSchedule: async (alertType: string) => {
    return apiCall<{ message: string; alertType: string; recipients: string[]; sent: number; failed: number; tendersCount: number; tenders: any[] }>('/admin/email-alerts/run', {
      method: 'POST',
      body: JSON.stringify({ alertType }),
    });
  },
};

// ============================================
// AI APIs
// ============================================

export const aiApi = {
  getAll: async () => {
    return apiCall<AIApiConfig[]>('/ai');
  },

  getById: async (id: number) => {
    return apiCall<AIApiConfig>(`/ai/${id}`);
  },

  create: async (config: {
    providerName: string;
    apiKey: string;
    modelName: string;
    baseUrl?: string;
    isActive?: boolean;
    isDefault?: boolean;
    maxTokens?: number;
    temperature?: number;
    description?: string;
  }) => {
    return apiCall<AIApiConfig>('/ai', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  update: async (id: number, config: {
    providerName?: string;
    apiKey?: string;
    modelName?: string;
    baseUrl?: string;
    isActive?: boolean;
    isDefault?: boolean;
    maxTokens?: number;
    temperature?: number;
    description?: string;
  }) => {
    return apiCall<AIApiConfig>(`/ai/${id}`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  },

  delete: async (id: number) => {
    return apiCall(`/ai/${id}`, { method: 'DELETE' });
  },

  test: async (id: number) => {
    return apiCall<{ message: string; data?: { response: string } }>(`/ai/${id}/test`, {
      method: 'POST',
    });
  },
};

// ============================================
// Tender Scout API
// ============================================

export const tenderScoutApi = {
  // Sources
  getSources: async () => {
    return apiCall<TenderScoutSource[]>('/tender-scout/sources');
  },

  createSource: async (data: Partial<TenderScoutSource>) => {
    return apiCall<{ id: number }>('/tender-scout/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateSource: async (id: number, data: Partial<TenderScoutSource>) => {
    return apiCall('/tender-scout/sources/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteSource: async (id: number) => {
    return apiCall('/tender-scout/sources/' + id, { method: 'DELETE' });
  },

  // Interests
  getInterests: async () => {
    return apiCall<TenderScoutInterest[]>('/tender-scout/interests');
  },

  createInterest: async (data: Partial<TenderScoutInterest>) => {
    return apiCall<{ id: number }>('/tender-scout/interests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateInterest: async (id: number, data: Partial<TenderScoutInterest>) => {
    return apiCall('/tender-scout/interests/' + id, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteInterest: async (id: number) => {
    return apiCall('/tender-scout/interests/' + id, { method: 'DELETE' });
  },

  // Results
  getResults: async (filters?: { status?: string; minRelevance?: number; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.minRelevance) params.append('minRelevance', filters.minRelevance.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    return apiCall<TenderScoutResult[]>('/tender-scout/results?' + params.toString());
  },

  getResultById: async (id: number) => {
    return apiCall<TenderScoutResult>('/tender-scout/results/' + id);
  },

  updateResultStatus: async (id: number, status: string) => {
    return apiCall('/tender-scout/results/' + id + '/status', {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  importResult: async (id: number) => {
    return apiCall<{ tenderId: number }>('/tender-scout/results/' + id + '/import', {
      method: 'POST',
    });
  },

  deleteResult: async (id: number) => {
    return apiCall('/tender-scout/results/' + id, { method: 'DELETE' });
  },

  deleteResultsBulk: async (ids: number[]) => {
    return apiCall('/tender-scout/results/delete-bulk', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },

  aiSearch: async (interestId: number) => {
    return apiCall<AISearchResult[]>('/tender-scout/ai-search', {
      method: 'POST',
      body: JSON.stringify({ interestId }),
    });
  },

  // Scout execution
  runScout: async (sourceId?: number, interestId?: number) => {
    return apiCall<any[]>('/tender-scout/run', {
      method: 'POST',
      body: JSON.stringify({ sourceId, interestId }),
    });
  },

  getLogs: async (limit = 50, offset = 0) => {
    return apiCall<TenderScoutLog[]>(`/tender-scout/logs?limit=${limit}&offset=${offset}`);
  },

  getStats: async () => {
    return apiCall<{
      newTenders: number;
      totalDiscovered: number;
      imported: number;
      avgRelevance: number;
    }>('/tender-scout/stats');
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
