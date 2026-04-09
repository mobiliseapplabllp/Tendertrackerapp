import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { useSettings } from '../hooks/useSettings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

import { CreateLeadDialog } from './CreateLeadDialog';
import { leadApi, authApi, documentApi, productLineApi } from '../lib/api';
import type { Lead, User as UserType, ProductLine } from '../lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  DollarSign,
  Settings,
  LogOut,
  Trash2,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react';

interface LeadDashboardProps {
  onLogout: () => void;
  onNavigate?: (view: string) => void;
}

export function LeadDashboard({ onLogout, onNavigate }: LeadDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleted, setShowDeleted] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [productLineFilter, setProductLineFilter] = useState('all');
  const { formatCurrency, formatDate } = useSettings();

  const handleLeadClick = (lead: Lead) => {
    if (onNavigate) {
      onNavigate(`lead-details:${lead.id}`);
    }
  };

  // Fetch deleted leads count separately
  const fetchDeletedCount = async () => {
    try {
      const response = await leadApi.getAll({
        page: 1,
        pageSize: 1,
        includeDeleted: 'true'
      });
      if (response.success && response.data) {
        setDeletedCount(response.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching deleted count:', err);
    }
  };

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await authApi.getCurrentUser();
        if (response.success && response.data) {
          setCurrentUser(response.data);
        }
      } catch (err) {
        console.error('Error fetching current user:', err);
      }
    };
    fetchCurrentUser();
    fetchProductLines();
  }, []);

  const fetchProductLines = async () => {
    try {
      const response = await productLineApi.getAll();
      if (response.success && response.data) {
        setProductLines(Array.isArray(response.data) ? response.data : response.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to load product lines:', err.message);
    }
  };

  // Fetch leads from API
  useEffect(() => {
    fetchLeads();
    // Fetch deleted count when not viewing deleted tab
    if (!showDeleted) {
      fetchDeletedCount();
    }
  }, [searchQuery, statusFilter, priorityFilter, page, showDeleted]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const filters: any = {
        page,
        pageSize: 25,
        leadTypeId: 2, // Strictly filter for Leads
      };

      if (searchQuery) {
        filters.search = searchQuery;
      }

      if (statusFilter !== 'all') {
        filters.status = [statusFilter];
      }

      if (priorityFilter !== 'all') {
        filters.priority = [priorityFilter];
      }

      // Include deleted leads if viewing deleted tab
      if (showDeleted) {
        filters.includeDeleted = 'true';
      }

      const response = await leadApi.getAll(filters);
      if (response.success && response.data) {
        const leadsData = response.data.data || [];
        setLeads(leadsData);
        setTotalPages(response.data.totalPages || 1);
        // Update deleted count when viewing deleted tab
        if (showDeleted && response.data.total !== undefined) {
          setDeletedCount(response.data.total);
        }
      } else {
        setError(response.error || 'Failed to load leads');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (newLead: Partial<Lead>, documents?: File[]) => {
    try {
      // Create the lead first
      const response = await leadApi.create(newLead);
      if (response.success && response.data) {
        const leadId = response.data.id;

        // Upload documents if any were selected
        if (documents && documents.length > 0 && leadId) {
          try {
            for (const file of documents) {
              await documentApi.upload(file, {
                tenderId: leadId, // API still uses tenderId for now
              });
            }
          } catch (docError: any) {
            // Continue even if document upload fails - lead is already created
            setError('Lead created but some documents failed to upload');
          }
        }

        // Handle desktop notification if enabled
        const notification = (response as any).notification;
        if (notification?.desktopNotification) {
          const { showDesktopNotification } = await import('../lib/settings');
          await showDesktopNotification(
            'Lead Created',
            `Lead "${response.data.title || response.data.leadNumber}" has been created successfully.`,
            'lead_created',
            { tag: `lead-created-${response.data.id}` }
          );
        }

        await fetchLeads(); // Refresh list
        await fetchDeletedCount(); // Update deleted count
        setIsCreateDialogOpen(false);
        // Show success message
        setError(null);
        alert(`Lead "${response.data.title}" created successfully! (${response.data.tenderNumber || response.data.tender_number || 'ID: ' + response.data.id})`);
      } else {
        setError(response.error || 'Failed to create lead');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create lead');
    }
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    // Refresh the leads list when a lead is updated
    await fetchLeads();
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm('Are you sure you want to delete this lead? This will also soft delete all associated documents and activities.')) {
      return;
    }

    try {
      const response = await leadApi.delete(leadId);
      if (response.success) {
        await fetchLeads(); // Refresh list
        await fetchDeletedCount(); // Update deleted count
      } else {
        setError(response.error || 'Failed to delete lead');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete lead');
    }
  };

  const handleRestoreLead = async (leadId: number) => {
    try {
      const response = await leadApi.restore(leadId);
      if (response.success) {
        await fetchLeads(); // Refresh list
        await fetchDeletedCount(); // Update deleted count
      } else {
        setError(response.error || 'Failed to restore lead');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to restore lead');
    }
  };

  const handlePermanentDeleteLead = async (leadId: number) => {
    // Find the specific lead from the deleted leads list
    const lead = filteredLeads.find(l => l.id === leadId && l.deletedAt);

    if (!lead) {
      setError('Lead not found in deleted leads list. Please refresh the page.');
      return;
    }

    const leadTitle = lead.title || lead.leadNumber || `Lead #${leadId}`;
    const leadNumber = lead.leadNumber || lead.tenderNumber || `ID: ${leadId}`;

    // Show detailed confirmation with lead details
    if (!confirm(`⚠️ WARNING: This will permanently delete "${leadTitle}" (${leadNumber}) and ALL associated data including:\n\n- All documents\n- All activities/logs\n- All tag relations\n- All other related records\n\nThis action CANNOT be undone. Are you absolutely sure?`)) {
      return;
    }

    // Double confirmation with ID verification
    if (!confirm(`FINAL CONFIRMATION: You are about to permanently delete:\n\nLead ID: ${leadId}\nLead Number: ${leadNumber}\nTitle: ${leadTitle}\n\nThis cannot be reversed. Continue?`)) {
      return;
    }

    try {
      setError(null);
      const response = await leadApi.permanentDelete(leadId);
      if (response.success) {
        await fetchLeads(); // Refresh list
        await fetchDeletedCount(); // Update deleted count
      } else {
        setError(response.error || 'Failed to permanently delete lead');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to permanently delete lead');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      submitted: 'bg-purple-100 text-purple-800',
      won: 'bg-emerald-100 text-emerald-800',
      lost: 'bg-red-100 text-red-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const getDaysUntilDue = (dueDate: string | undefined) => {
    if (!dueDate) return NaN;
    const today = new Date();
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) return NaN;
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateBadge = (dueDate: string | undefined) => {
    if (!dueDate) return null;
    const days = getDaysUntilDue(dueDate);
    if (isNaN(days)) return null;
    if (days < 0) {
      return <Badge className="bg-red-500 text-white">Overdue</Badge>;
    } else if (days <= 2) {
      return <Badge className="bg-red-100 text-red-800">{days}d left</Badge>;
    } else if (days <= 7) {
      return <Badge className="bg-orange-100 text-orange-800">{days}d left</Badge>;
    } else if (days <= 15) {
      return <Badge className="bg-yellow-100 text-yellow-800">{days}d left</Badge>;
    } else if (days <= 30) {
      return <Badge className="bg-blue-100 text-blue-800">{days}d left</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800">{days}d left</Badge>;
  };

  // Get unique creators for filter
  const uniqueCreators = Array.from(new Set(leads.map((l) => {
    // Handle both string (name) and number (ID) formats
    if (typeof l.createdBy === 'string') {
      return l.createdBy;
    }
    return 'Unknown';
  }).filter(Boolean)));

  // Filter leads
  // When viewing deleted leads, show only deleted leads (only apply search filter)
  // When viewing active leads, show only active leads and apply all filters
  const filteredLeads = leads.filter((lead) => {
    // If viewing deleted tab, only show leads that are actually deleted
    if (showDeleted) {
      // Must have deletedAt set to be shown in deleted tab
      if (!lead.deletedAt) {
        return false;
      }
      // Apply search filter if provided
      if (!searchQuery) return true; // Show all deleted if no search
      const searchLower = searchQuery.toLowerCase();
      return (
        (lead.title || '').toLowerCase().includes(searchLower) ||
        (lead.leadNumber || lead.tenderNumber || '').toLowerCase().includes(searchLower) ||
        (lead.client || '').toLowerCase().includes(searchLower)
      );
    }

    // For active leads, exclude deleted leads and apply all filters
    // Must NOT have deletedAt set to be shown in active tab
    if (lead.deletedAt) {
      return false;
    }

    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      (lead.title || '').toLowerCase().includes(searchLower) ||
      (lead.leadNumber || lead.tenderNumber || '').toLowerCase().includes(searchLower) ||
      (lead.client || '').toLowerCase().includes(searchLower)
    );
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesCreator =
      createdByFilter === 'all' || String(lead.createdBy) === createdByFilter;
    const matchesProductLine =
      productLineFilter === 'all' || String(lead.productLineId) === productLineFilter;
    return matchesSearch && matchesStatus && matchesCreator && matchesProductLine;
  });

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl">Lead Management System</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor all your leads
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Profile Dropdown */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                      {currentUser?.fullName || 'User'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                </Button>

                {isProfileDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsProfileDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                      <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {currentUser?.fullName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {currentUser?.email || ''}
                        </p>
                      </div>
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl mt-1">{leads.filter(l => !l.deletedAt).length}</p>
              </div>
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl mt-1">
                  {leads.filter((l) => l.status === 'Draft' && !l.deletedAt).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl mt-1">
                  {leads.filter((l) => l.status === 'Under Review' && !l.deletedAt).length}
                </p>
              </div>
              <User className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Won</p>
                <p className="text-2xl mt-1">
                  {leads.filter((l) => l.status === 'Won' && !l.deletedAt).length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search by lead number, title, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="Search leads"
                aria-describedby="search-description"
              />
              <span id="search-description" className="sr-only">
                Search leads by number, title, or client name
              </span>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="Won">Won</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                <SelectTrigger className="w-[160px]">
                  <User className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Creator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Creators</SelectItem>
                  {uniqueCreators.map((creator) => (
                    <SelectItem key={creator} value={creator}>
                      {creator}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={productLineFilter} onValueChange={setProductLineFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Product Line" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Product Lines</SelectItem>
                  {productLines.map((pl) => (
                    <SelectItem key={pl.id} value={pl.id.toString()}>
                      {pl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                aria-label="Create new lead"
              >
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
                New Lead
              </Button>
            </div>
          </div>
        </div>

        {/* Leads Table with Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 flex flex-col min-h-0">
          <Tabs defaultValue="active" className="w-full flex flex-col min-h-0" onValueChange={(value) => setShowDeleted(value === 'deleted')}>
            <div className="px-6 pt-4 border-b border-gray-200 flex-shrink-0">
              <TabsList>
                <TabsTrigger value="active">
                  <FileText className="w-4 h-4" />
                  Active Leads ({leads.filter(l => !l.deletedAt).length})
                </TabsTrigger>
                <TabsTrigger value="deleted">
                  <Trash2 className="w-4 h-4" />
                  Deleted Leads ({deletedCount})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Active Leads Tab */}
            <TabsContent value="active" className="mt-0 flex-1 min-h-0 overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">S.No.</TableHead>
                      <TableHead>Lead ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Product Line</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Updated By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          No active leads found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead, index) => (
                        <TableRow
                          key={lead.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleLeadClick(lead)}
                        >
                          <TableCell>
                            {(page - 1) * 10 + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="text-indigo-600 hover:underline">
                              {lead.leadNumber || lead.tenderNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{lead.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {lead.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{lead.client}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {lead.productLineId ? (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  {productLines.find(pl => pl.id === lead.productLineId)?.name || `PL-${lead.productLineId}`}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                              {lead.subCategory && (
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                                  {lead.subCategory}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(lead.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              {lead.submissionDeadline ? (
                                <>
                                  <span className="text-sm">
                                    {formatDate(lead.submissionDeadline)}
                                  </span>
                                  {getDueDateBadge(lead.submissionDeadline)}
                                </>
                              ) : (
                                <span className="text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {lead.estimatedValue || lead.dealValue
                              ? formatCurrency(lead.dealValue || lead.estimatedValue || 0, lead.currency)
                              : 'N/A'}
                          </TableCell>
                          <TableCell>{lead.createdBy || 'N/A'}</TableCell>
                          <TableCell>{lead.updatedBy || 'N/A'}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteLead(lead.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Deleted Leads Tab */}
            <TabsContent value="deleted" className="mt-0 flex-1 min-h-0 overflow-y-auto">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">S.No.</TableHead>
                      <TableHead>Lead ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deleted By</TableHead>
                      <TableHead>Deleted At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No deleted leads found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((lead, index) => (
                        <TableRow
                          key={lead.id}
                          className="opacity-60 hover:opacity-100"
                        >
                          <TableCell>
                            {(page - 1) * 10 + index + 1}
                          </TableCell>
                          <TableCell>
                            <span className="text-indigo-600">
                              {lead.leadNumber || lead.tenderNumber}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{lead.title}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {lead.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{lead.client}</TableCell>
                          <TableCell>{getStatusBadge(lead.status)}</TableCell>
                          <TableCell>{lead.deleterName || 'Unknown'}</TableCell>
                          <TableCell>
                            {lead.deletedAt
                              ? new Date(lead.deletedAt).toLocaleString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreLead(lead.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePermanentDeleteLead(lead.id)}
                                className="text-red-600 hover:text-red-700 border-red-300"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Delete Forever
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>


      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t bg-white">
          <span className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next<ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            // Export leads to CSV
            const headers = ['Lead ID', 'Title', 'Client', 'Status', 'Priority', 'Product Line', 'Value', 'Created By', 'Created At'];
            const rows = leads.map(l => [
              l.leadNumber || l.tenderNumber || '', l.title || '', l.client || '',
              l.status || '', l.priority || '', (l as any).productLineName || '',
              l.estimatedValue || '', (l as any).createdByName || '', l.createdAt || ''
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click(); URL.revokeObjectURL(url);
          }}>
            <Download className="w-4 h-4 mr-1" />Export CSV
          </Button>
        </div>
      )}

      {/* Single page export (when no pagination) */}
      {totalPages <= 1 && leads.length > 0 && (
        <div className="flex justify-end px-6 py-3 border-t bg-white">
          <Button variant="outline" size="sm" onClick={() => {
            const headers = ['Lead ID', 'Title', 'Client', 'Status', 'Priority', 'Value', 'Created By'];
            const rows = leads.map(l => [
              l.leadNumber || l.tenderNumber || '', l.title || '', l.client || '',
              l.status || '', l.priority || '', l.estimatedValue || '', (l as any).createdByName || ''
            ]);
            const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click(); URL.revokeObjectURL(url);
          }}>
            <Download className="w-4 h-4 mr-1" />Export CSV
          </Button>
        </div>
      )}

      {/* Create Lead Dialog */}
      <CreateLeadDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateLead}
      />
    </div>
  );
}

