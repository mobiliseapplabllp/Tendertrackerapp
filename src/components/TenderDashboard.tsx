import { useState, useEffect, useCallback } from 'react';
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
import { CreateTenderDialog } from './CreateTenderDialog';
import { TenderDetailDrawer } from './TenderDetailDrawer';
import { tenderApi, authApi, leadTypeApi, documentApi, productLineApi } from '../lib/api';
import type { Tender, User as UserType, LeadType, ProductLine } from '../lib/types';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  Plus,
  Search,
  Filter,
  LogOut,
  Trash2,
  MoreHorizontal,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  User,
  DollarSign
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

interface TenderDashboardProps {
  onLogout: () => void;
  onNavigate?: (view: string) => void;
}

export function TenderDashboard({ onLogout, onNavigate }: TenderDashboardProps) {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState('active'); // Default to 'active'
  const [deletedCount, setDeletedCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set()); // Track which tabs have been loaded
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [tenderLeadTypeId, setTenderLeadTypeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [productLineFilter, setProductLineFilter] = useState('all');

  // Drawer State
  const [selectedTenderId, setSelectedTenderId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { formatCurrency, formatDate } = useSettings();

  const handleTenderClick = (tender: Tender) => {
    setSelectedTenderId(tender.id);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedTenderId(null), 300); // Wait for animation
  };

  // Fetch tender lead type ID
  const fetchTenderLeadType = async () => {
    try {
      const response = await leadTypeApi.getAll();
      if (response.success && response.data) {
        const tenderType = response.data.find((lt: LeadType) => lt.name === 'Tender');
        if (tenderType) {
          setTenderLeadTypeId(tenderType.id);
        }
      }
    } catch (err) {
      console.error('Error fetching tender lead type:', err);
    }
  };

  // Fetch status counts for all statuses (only for Tender lead type)
  // MOVED BEFORE useEffect to fix hoisting error
  const fetchStatusCounts = useCallback(async () => {
    if (!tenderLeadTypeId) return; // Wait for lead type ID

    try {
      // Remove "Under Review" as separate status - it's merged with Active
      const statuses = ['Draft', 'Submitted', 'Shortlisted', 'Won', 'Lost', 'Cancelled'];
      const counts: Record<string, number> = {};

      // Fetch count for each status (filtered by Tender lead type)
      for (const status of statuses) {
        try {
          const response = await tenderApi.getAll({
            page: 1,
            pageSize: 1,
            status: [status],
            leadTypeId: tenderLeadTypeId
          });
          if (response.success && response.data) {
            counts[status] = response.data.total || 0;
          }
        } catch (err) {
          counts[status] = 0;
        }
      }

      // Fetch "Under Review" count separately and include in active
      try {
        const underReviewResponse = await tenderApi.getAll({
          page: 1,
          pageSize: 1,
          status: ['Under Review'],
          leadTypeId: tenderLeadTypeId
        });
        if (underReviewResponse.success && underReviewResponse.data) {
          counts['Under Review'] = underReviewResponse.data.total || 0;
        }
      } catch (err) {
        counts['Under Review'] = 0;
      }

      // Calculate active count (includes Draft, Submitted, Under Review, Shortlisted)
      const activeStatuses = ['Draft', 'Submitted', 'Under Review', 'Shortlisted'];
      let activeCount = 0;
      for (const status of activeStatuses) {
        activeCount += counts[status] || 0;
      }
      counts['active'] = activeCount;

      setStatusCounts(counts);
    } catch (err) {
      console.error('Error fetching status counts:', err);
    }
  }, [tenderLeadTypeId]);

  // Fetch tenders - MOVED BEFORE useEffect to fix hoisting error
  const fetchTenders = useCallback(async () => {
    if (!tenderLeadTypeId) return; // Wait for lead type ID

    try {
      setLoading(true);
      setError(null);

      const filters: any = {
        page,
        pageSize: 10,
        leadTypeId: tenderLeadTypeId, // Always filter by Tender lead type
      };

      if (searchQuery) {
        filters.search = searchQuery;
      }

      // Determine status filter based on active tab
      if (activeTab === 'active') {
        // Active tenders: exclude Won, Lost, Cancelled
        filters.status = ['Draft', 'Submitted', 'Under Review', 'Shortlisted'];
      } else if (activeTab === 'deleted') {
        filters.includeDeleted = 'true';
      } else if (activeTab !== 'all' && activeTab !== 'deleted') {
        // Specific status tab
        filters.status = [activeTab];
      }

      if (priorityFilter !== 'all') {
        filters.priority = [priorityFilter];
      }

      const response = await tenderApi.getAll(filters);
      if (response.success && response.data) {
        const tendersData = response.data.data || [];
        setTenders(tendersData);
        setTotalPages(response.data.totalPages || 1);

        // Update deleted count when viewing deleted tab
        if (activeTab === 'deleted' && response.data.total !== undefined) {
          setDeletedCount(response.data.total);
        }
      } else {
        setError(response.error || 'Failed to load tenders');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tenders');
    } finally {
      setLoading(false);
    }
  }, [tenderLeadTypeId, page, searchQuery, activeTab, priorityFilter]);

  // Fetch deleted tenders count separately (only for Tender lead type)
  const fetchDeletedCount = useCallback(async () => {
    if (!tenderLeadTypeId) return; // Wait for lead type ID

    try {
      const response = await tenderApi.getAll({
        page: 1,
        pageSize: 1,
        includeDeleted: 'true',
        leadTypeId: tenderLeadTypeId
      });
      if (response.success && response.data) {
        setDeletedCount(response.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching deleted count:', err);
    }
  }, [tenderLeadTypeId]);

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
  }, []);

  // Fetch tender lead type ID and product lines on mount
  useEffect(() => {
    fetchTenderLeadType();
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

  // Fetch deleted count when tender lead type ID is available
  useEffect(() => {
    if (tenderLeadTypeId) {
      fetchDeletedCount();
    }
  }, [tenderLeadTypeId, fetchDeletedCount]);

  // Fetch status counts when tender lead type ID is available
  useEffect(() => {
    if (tenderLeadTypeId) {
      fetchStatusCounts();
    }
  }, [tenderLeadTypeId, fetchStatusCounts]);



  // Fetch tenders when tab changes or filters change
  useEffect(() => {
    // Only fetch if tender lead type ID is available
    if (tenderLeadTypeId) {
      // Always fetch when filters change or when switching tabs
      fetchTenders();
      // Mark tab as loaded if not already
      if (!loadedTabs.has(activeTab)) {
        setLoadedTabs(prev => new Set([...prev, activeTab]));
      }
    }
  }, [searchQuery, priorityFilter, page, activeTab, tenderLeadTypeId, fetchTenders, loadedTabs]);

  const handleCreateTender = async (newTender: Partial<Tender>, documents?: File[]) => {
    try {
      // Create the tender first
      const response = await tenderApi.create(newTender);
      if (response.success && response.data) {
        const tenderId = response.data.id;

        // Upload documents if any were selected
        if (documents && documents.length > 0 && tenderId) {
          try {
            for (const file of documents) {
              await documentApi.upload(file, {
                tenderId: tenderId,
              });
            }
          } catch (docError: any) {
            // Continue even if document upload fails - tender is already created
            setError('Tender created but some documents failed to upload');
          }
        }

        // Handle desktop notification if enabled
        const notification = (response as any).notification;
        if (notification?.desktopNotification) {
          const { showDesktopNotification } = await import('../lib/settings');
          await showDesktopNotification(
            'Tender Created',
            `Tender "${response.data.title || response.data.tenderNumber}" has been created successfully.`,
            'tender_created',
            { tag: `tender-created-${response.data.id}` }
          );
        }

        await fetchTenders(); // Refresh list
        await fetchStatusCounts(); // Update status counts
        await fetchDeletedCount(); // Update deleted count
        setIsCreateDialogOpen(false);
      } else {
        setError(response.error || 'Failed to create tender');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create tender');
    }
  };

  const handleUpdateTender = async (updatedTender: Tender) => {
    // Refresh the tenders list when a tender is updated
    await fetchTenders();
    await fetchStatusCounts(); // Update status counts as status may have changed
  };

  const handleDeleteTender = async (tenderId: number) => {
    if (!confirm('Are you sure you want to delete this tender? This will also soft delete all associated documents and activities.')) {
      return;
    }

    try {
      const response = await tenderApi.delete(tenderId);
      if (response.success) {
        await fetchTenders(); // Refresh list
        await fetchStatusCounts(); // Update status counts
        await fetchDeletedCount(); // Update deleted count
      } else {
        setError(response.error || 'Failed to delete tender');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete tender');
    }
  };

  const handleRestoreTender = async (tenderId: number) => {
    try {
      const response = await tenderApi.restore(tenderId);
      if (response.success) {
        await fetchTenders(); // Refresh list
        await fetchStatusCounts(); // Update status counts
        await fetchDeletedCount(); // Update deleted count
      } else {
        setError(response.error || 'Failed to restore tender');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to restore tender');
    }
  };

  const handlePermanentDeleteTender = async (tenderId: number) => {
    // Find the specific tender from the deleted tenders list
    const tender = filteredTenders.find(t => t.id === tenderId && t.deletedAt);

    if (!tender) {
      setError('Tender not found in deleted tenders list. Please refresh the page.');
      return;
    }

    const tenderTitle = tender.title || tender.tenderNumber || `Tender #${tenderId}`;
    const tenderNumber = tender.tenderNumber || `ID: ${tenderId}`;

    // Show detailed confirmation with tender details
    if (!confirm(`⚠️ WARNING: This will permanently delete "${tenderTitle}" (${tenderNumber}) and ALL associated data including:\n\n- All documents\n- All activities/logs\n- All tag relations\n- All other related records\n\nThis action CANNOT be undone. Are you absolutely sure?`)) {
      return;
    }

    // Double confirmation with ID verification
    if (!confirm(`FINAL CONFIRMATION: You are about to permanently delete:\n\nTender ID: ${tenderId}\nTender Number: ${tenderNumber}\nTitle: ${tenderTitle}\n\nThis cannot be reversed. Continue?`)) {
      return;
    }

    try {
      setError(null);
      const response = await tenderApi.permanentDelete(tenderId);
      if (response.success) {
        await fetchTenders(); // Refresh list
        await fetchStatusCounts(); // Update status counts
        await fetchDeletedCount(); // Update deleted count
      } else {
        setError(response.error || 'Failed to permanently delete tender');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to permanently delete tender');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      open: 'bg-green-100 text-green-800 border-green-200',
      'in-progress': 'bg-blue-100 text-blue-800 border-blue-200',
      submitted: 'bg-purple-100 text-purple-800 border-purple-200',
      won: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      lost: 'bg-red-100 text-red-800 border-red-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      <Badge variant="outline" className={`font-normal rounded-md px-2 ${variants[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
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

    // Condensed badge style
    if (days < 0) {
      return <Badge className="bg-red-500 text-white hover:bg-red-600 rounded-sm px-1.5 h-5 text-[10px]">Overdue</Badge>;
    } else if (days <= 2) {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 rounded-sm px-1.5 h-5 text-[10px]">{days}d left</Badge>;
    } else if (days <= 7) {
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200 rounded-sm px-1.5 h-5 text-[10px]">{days}d left</Badge>;
    } else if (days <= 15) {
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-200 rounded-sm px-1.5 h-5 text-[10px]">{days}d left</Badge>;
    }
    return <span className="text-xs text-muted-foreground">{days}d</span>;
  };

  // Get unique creators for filter
  const uniqueCreators = Array.from(new Set(tenders.map((t) => {
    // Handle both string (name) and number (ID) formats
    if (typeof t.createdBy === 'string') {
      return t.createdBy;
    }
    return 'Unknown';
  }).filter(Boolean)));

  // Filter tenders (client-side filtering for search and other filters)
  // Note: Status filtering is done server-side based on activeTab
  const filteredTenders = tenders.filter((tender) => {
    // If viewing deleted tab, only show tenders that are actually deleted
    if (activeTab === 'deleted') {
      if (!tender.deletedAt) {
        return false;
      }
    } else {
      // For all other tabs, exclude deleted tenders
      if (tender.deletedAt) {
        return false;
      }
    }

    // Apply search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      (tender.title || '').toLowerCase().includes(searchLower) ||
      (tender.tenderNumber || '').toLowerCase().includes(searchLower) ||
      (tender.client || '').toLowerCase().includes(searchLower)
    );

    // Apply creator filter
    const matchesCreator =
      createdByFilter === 'all' || String(tender.createdBy) === createdByFilter;

    // Apply product line filter
    const matchesProductLine =
      productLineFilter === 'all' || String(tender.productLineId) === productLineFilter;

    return matchesSearch && matchesCreator && matchesProductLine;
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
                <h1 className="text-xl font-semibold text-gray-900">Tender Master</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor all your tenders
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-10 w-10 rounded-full p-0">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-medium text-sm">
                      {currentUser?.fullName?.charAt(0) || 'U'}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{currentUser?.fullName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">{currentUser?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout} className="text-red-600 cursor-pointer text-sm">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                <p className="text-sm text-muted-foreground font-medium">Total Tenders</p>
                <p className="text-2xl font-semibold mt-1">
                  {(statusCounts.active || 0) + (statusCounts.Won || 0) + (statusCounts.Lost || 0) + (statusCounts.Cancelled || 0)}
                </p>
              </div>
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Draft</p>
                <p className="text-2xl font-semibold mt-1">{statusCounts.Draft || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Under Review</p>
                <p className="text-2xl font-semibold mt-1">{statusCounts['Under Review'] || 0}</p>
              </div>
              <User className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Won</p>
                <p className="text-2xl font-semibold mt-1">{statusCounts.Won || 0}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Filters and Actions Box */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 flex items-center gap-3">
          <div className="flex-1 max-w-sm relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>

          <Select value={priorityFilter} onValueChange={(value) => {
            setPriorityFilter(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-[150px] h-10">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <SelectValue placeholder="Priority" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={productLineFilter} onValueChange={(value) => {
            setProductLineFilter(value);
            setPage(1);
          }}>
            <SelectTrigger className="w-[170px] h-10">
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
          <Button onClick={() => setIsCreateDialogOpen(true)} size="default" className="h-10 ml-auto">
            <Plus className="w-4 h-4 mr-2" />
            New Tender
          </Button>
        </div>

        {/* Table and Tabs Container */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
          {/* Status Tabs */}
          <div className="px-6 pt-4 border-b border-gray-200 flex-shrink-0">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                setPage(1); // Reset to first page
              }}
              className="w-full"
            >
              <TabsList className="h-10 p-0 bg-transparent flex gap-6 w-full justify-start overflow-x-auto no-scrollbar">
                {[
                  { id: 'active', label: 'Active', count: statusCounts.active },
                  { id: 'Draft', label: 'Draft', count: statusCounts.Draft },
                  { id: 'Submitted', label: 'Submitted', count: statusCounts.Submitted },
                  { id: 'Shortlisted', label: 'Shortlisted', count: statusCounts.Shortlisted },
                  { id: 'Won', label: 'Won', count: statusCounts.Won },
                  { id: 'Lost', label: 'Lost', count: statusCounts.Lost },
                  { id: 'deleted', label: 'Trash', count: deletedCount, icon: Trash2 },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 px-0 bg-transparent shadow-none text-sm font-medium"
                  >
                    <span className="flex items-center gap-2">
                      {tab.icon && <tab.icon className="w-4 h-4" />}
                      {tab.label}
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[11px]">
                        {tab.count || 0}
                      </span>
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Data Grid Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="border-b border-gray-200 hover:bg-gray-50">
                  <TableHead className="w-[60px] text-xs font-semibold uppercase tracking-wider text-gray-500">S.No.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Tender ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 w-[30%]">Title / Client</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Product Line</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Created By</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500">Deadline</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Value</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                    </TableCell>
                  </TableRow>
                ) : filteredTenders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-sm">
                      No tenders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTenders.map((tender, index) => (
                    <TableRow
                      key={tender.id}
                      className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedTenderId === tender.id ? 'bg-indigo-50/50' : ''}`}
                      onClick={() => handleTenderClick(tender)}
                    >
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {(page - 1) * 10 + index + 1}
                      </TableCell>
                      <TableCell className="py-3 font-medium text-sm text-indigo-600 hover:underline">
                        #{tender.id.toString().padStart(4, '0')}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{tender.title}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[300px]">{tender.client}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1">
                          {tender.productLineId ? (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                              {productLines.find(pl => pl.id === tender.productLineId)?.name || `PL-${tender.productLineId}`}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                          {tender.subCategory && (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                              {tender.subCategory}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {getStatusBadge(tender.status)}
                      </TableCell>

                      <TableCell className="py-3 text-sm text-gray-600">
                        {tender.createdByUser?.fullName || tender.createdBy || '-'}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {tender.submissionDeadline ? formatDate(tender.submissionDeadline) : '-'}
                          </span>
                          {getDueDateBadge(tender.submissionDeadline)}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-right text-sm font-medium">
                        {tender.estimatedValue ? formatCurrency(tender.estimatedValue, tender.currency) : '-'}
                      </TableCell>
                      <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTenderClick(tender)} className="text-sm">
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteTender(tender.id)} className="text-red-600 text-sm">
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer / Pagination */}
          <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between mt-auto">
            <p className="text-sm text-muted-foreground">
              Showing {filteredTenders.length} of {activeTab === 'deleted' ? deletedCount : statusCounts[activeTab === 'active' ? 'active' : activeTab] || 0} tenders
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main >

      <CreateTenderDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateTender}
      />

      <TenderDetailDrawer
        tenderId={selectedTenderId}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        onUpdate={handleUpdateTender}
      />
    </div >
  );
}