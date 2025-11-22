import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
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
import { TenderDrawer } from './TenderDrawer';
import { CreateTenderDialog } from './CreateTenderDialog';
import { mockTenders, Tender } from '../lib/mockData';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  DollarSign,
} from 'lucide-react';

interface TenderDashboardProps {
  onLogout: () => void;
}

export function TenderDashboard({ onLogout }: TenderDashboardProps) {
  const [tenders, setTenders] = useState<Tender[]>(mockTenders);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('all');

  const handleTenderClick = (tender: Tender) => {
    setSelectedTender(tender);
    setIsDrawerOpen(true);
  };

  const handleCreateTender = (newTender: Tender) => {
    setTenders([newTender, ...tenders]);
  };

  const handleUpdateTender = (updatedTender: Tender) => {
    setTenders(
      tenders.map((t) => (t.id === updatedTender.id ? updatedTender : t))
    );
    setSelectedTender(updatedTender);
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

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateBadge = (dueDate: string) => {
    const days = getDaysUntilDue(dueDate);
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
  const uniqueCreators = Array.from(new Set(tenders.map((t) => t.createdBy)));

  // Filter tenders
  const filteredTenders = tenders.filter((tender) => {
    const matchesSearch =
      tender.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tender.tenderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tender.client.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tender.status === statusFilter;
    const matchesCreator =
      createdByFilter === 'all' || tender.createdBy === createdByFilter;
    return matchesSearch && matchesStatus && matchesCreator;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl">Tender Tracking System</h1>
                <p className="text-sm text-muted-foreground">
                  Manage and monitor all your tenders
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailConfigOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Email Alerts
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Tenders</p>
                <p className="text-2xl mt-1">{tenders.length}</p>
              </div>
              <FileText className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl mt-1">
                  {tenders.filter((t) => t.status === 'open').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl mt-1">
                  {tenders.filter((t) => t.status === 'in-progress').length}
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
                  {tenders.filter((t) => t.status === 'won').length}
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by tender number, title, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
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
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Tender
              </Button>
            </div>
          </div>
        </div>

        {/* Tenders Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tender ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Updated By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No tenders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenders.map((tender) => (
                  <TableRow
                    key={tender.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleTenderClick(tender)}
                  >
                    <TableCell>
                      <span className="text-indigo-600 hover:underline">
                        {tender.tenderNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{tender.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1">
                          {tender.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{tender.client}</TableCell>
                    <TableCell>{getStatusBadge(tender.status)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm">
                          {new Date(tender.dueDate).toLocaleDateString()}
                        </span>
                        {getDueDateBadge(tender.dueDate)}
                      </div>
                    </TableCell>
                    <TableCell>{tender.estimatedValue}</TableCell>
                    <TableCell>{tender.createdBy}</TableCell>
                    <TableCell>{tender.updatedBy}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Tender Drawer */}
      <TenderDrawer
        tender={selectedTender}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onUpdate={handleUpdateTender}
      />

      {/* Create Tender Dialog */}
      <CreateTenderDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onCreate={handleCreateTender}
      />
    </div>
  );
}