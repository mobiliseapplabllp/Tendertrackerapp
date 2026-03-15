// TypeScript Types and Interfaces for LeadTrack Pro

export interface ProductLine {
  id: number;
  name: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
  leadCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

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
  productLines?: ProductLine[];
  productLineIds?: number[];
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

// Legacy types (for backward compatibility)
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

// New CRM types
export interface LeadCategory {
  id: number;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
}

export interface LeadTag {
  id: number;
  name: string;
  color?: string;
  createdAt: string;
}

export interface LeadType {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SalesStage {
  id: number;
  name: string;
  description?: string;
  probability: number;
  isActive: boolean;
  stageOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Lead interface (replaces Tender)
export interface Lead {
  id: number;
  leadNumber: string;
  tenderNumber?: string; // Legacy alias
  title: string;
  description?: string;
  companyId?: number;
  company?: Company;
  categoryId?: number;
  category?: LeadCategory | TenderCategory; // Support both
  leadTypeId?: number;
  leadType?: LeadType;
  salesStageId?: number;
  salesStage?: SalesStage;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Shortlisted' | 'Won' | 'Lost' | 'Cancelled';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  estimatedValue?: number;
  dealValue?: number;
  probability?: number;
  currency: string;
  emdAmount?: number; // Earnest Money Deposit
  tenderFees?: number; // Tender Fees
  submissionDeadline?: string;
  dueDate?: string; // Alias for submissionDeadline
  expectedAwardDate?: string;
  expectedCloseDate?: string;
  contractDurationMonths?: number;
  assignedTo?: number;
  assignedUser?: User;
  tags?: LeadTag[] | TenderTag[]; // Support both
  source?: string;
  convertedFrom?: number;
  productLineId?: number;
  productLine?: ProductLine;
  subCategory?: 'Software' | 'Hardware';
  createdBy: number | string; // Can be user ID (number) or user name (string)
  updatedBy?: string; // User name who last updated
  client?: string; // Company name
  deletedAt?: string; // Soft delete timestamp
  deletedBy?: number; // User ID who deleted
  deleterName?: string; // User name who deleted
  createdAt: string;
  updatedAt: string;
  // Computed fields
  formattedValue?: string;
  formattedDealValue?: string;
}

// Legacy Tender interface (alias for Lead for backward compatibility)
export interface Tender extends Lead {
  tenderNumber: string;
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
  documentName?: string;
  description?: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileHash?: string;
  expirationDate?: string;
  isFavorite: boolean;
  uploadedBy: number;
  uploadedAt: string;
}

// Activity interfaces
export interface LeadActivity {
  id: number;
  leadId: number;
  tenderId?: number; // Legacy alias
  userId: number;
  user?: User;
  activityType: 'Created' | 'Updated' | 'Commented' | 'Status Changed' | 'Document Added' | 'Assigned' | 'Deadline Changed';
  description?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

// Legacy alias
export interface TenderActivity extends LeadActivity {
  tenderId: number;
}

export interface AIApiConfig {
  id: number;
  providerName: string;
  modelName: string;
  baseUrl?: string | null;
  isActive: boolean;
  isDefault: boolean;
  maxTokens: number;
  temperature: number;
  description?: string | null;
  createdBy?: number;
  updatedBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLogReminder {
  id: number;
  activityId: number;
  tenderId: number;
  actionRequired: string;
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: number;
  completedByUser?: User;
  createdBy: number;
  createdByUser?: User;
  createdAt: string;
  updatedAt?: string;
  recipients?: WorkLogReminderRecipient[];
}

export interface WorkLogReminderRecipient {
  id: number;
  reminderId: number;
  email?: string;
  phoneNumber?: string;
  userId?: number;
  user?: User;
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
  totalEMD: number;
  totalFees: number;
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
  isConnectionWorking?: boolean;
  errorType?: string;
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
  offset?: number;
}

// Tender Scout Types
export interface TenderScoutSource {
  id: number;
  name: string;
  sourceType: 'website' | 'api' | 'rss' | 'google_search';
  url: string;
  isActive: boolean;
  scrapingConfig?: any;
  lastScrapedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenderScoutInterest {
  id: number;
  userId?: number;
  name: string;
  description?: string;
  keywords: string[];
  categories?: string[];
  minValue?: number;
  maxValue?: number;
  regions?: string[];
  isActive: boolean;
  autoImportThreshold?: number;
  minRelevance?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenderScoutResult {
  id: number;
  sourceId: number;
  interestId: number;
  externalId?: string;
  title: string;
  description?: string;
  url?: string;
  organization?: string;
  estimatedValue?: number;
  currency?: string;
  deadline?: string;
  location?: string;
  category?: string;
  rawData?: any;
  aiSummary?: string;
  relevanceScore: number;
  status: 'new' | 'reviewed' | 'imported' | 'ignored';
  importedTenderId?: number;
  discoveredAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
  sourceName?: string;
  interestName?: string;
  matchedKeywords?: string[];
}

export interface TenderScoutLog {
  id: number;
  sourceId: number;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  tendersFound: number;
  tendersNew: number;
  errorMessage?: string;
  executionTimeMs?: number;
  sourceName?: string;
}

export interface AISearchResult {
  title: string;
  summary: string;
  url?: string;
  confidence?: number;
  fileLinks?: string[];
  matchedKeywords?: string[];
}

// ============================================
// Configuration System Types
// ============================================

export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  settingType: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  category?: string;
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DropdownOption {
  id: number;
  optionType: string;
  optionValue: string;
  optionLabel: string;
  displayOrder: number;
  colorClass?: string;
  icon?: string;
  isActive: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
