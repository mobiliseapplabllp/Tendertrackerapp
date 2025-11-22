// TypeScript Types and Interfaces for TenderTrack Pro

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'Admin' | 'Manager' | 'User' | 'Viewer';
  department?: string;
  phone?: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: number;
  companyName: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxId?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: number;
  companyId?: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  position?: string;
  department?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenderCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
}

export interface TenderTag {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
}

export interface Tender {
  id: number;
  tenderNumber: string;
  title: string;
  description?: string;
  companyId?: number;
  company?: Company;
  categoryId?: number;
  category?: TenderCategory;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Shortlisted' | 'Won' | 'Lost' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedValue?: number;
  currency: string;
  submissionDeadline?: string;
  expectedAwardDate?: string;
  contractDurationMonths?: number;
  assignedTo?: number;
  assignedUser?: User;
  tags?: TenderTag[];
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  isSystem: boolean;
  createdAt: string;
}

export interface Document {
  id: number;
  tenderId?: number;
  categoryId?: number;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  expirationDate?: string;
  isFavorite: boolean;
  uploadedBy: number;
  uploadedAt: string;
}

export interface TenderActivity {
  id: number;
  tenderId: number;
  userId: number;
  user?: User;
  activityType: 'Created' | 'Updated' | 'Commented' | 'Status Changed' | 'Document Added' | 'Assigned' | 'Deadline Changed';
  description?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface EmailNotification {
  id: number;
  userId: number;
  tenderId?: number;
  notificationType: 'Deadline Reminder' | 'Status Change' | 'Assignment' | 'Document Expiry' | 'Daily Digest';
  subject: string;
  body: string;
  status: 'Pending' | 'Sent' | 'Failed';
  scheduledFor?: string;
  sentAt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface SystemConfig {
  id: number;
  configKey: string;
  configValue: string;
  configType: 'string' | 'number' | 'boolean' | 'json';
  isEncrypted: boolean;
  description?: string;
  updatedBy?: number;
  updatedAt: string;
}

export interface DashboardStats {
  totalTenders: number;
  activeTenders: number;
  wonTenders: number;
  lostTenders: number;
  totalValue: number;
  wonValue: number;
  avgWinRate: number;
  upcomingDeadlines: number;
  recentActivities: TenderActivity[];
  tendersByStatus: {
    status: string;
    count: number;
  }[];
  tendersByCategory: {
    category: string;
    count: number;
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterOptions {
  search?: string;
  status?: string[];
  priority?: string[];
  categoryId?: number;
  assignedTo?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
