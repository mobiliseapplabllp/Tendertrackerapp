import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Globe,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  CheckCircle2,
  SkipForward,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Clock,
} from 'lucide-react';
import { apolloApi, emailMarketingApi } from '../lib/api';

// ==================== Types ====================

interface ApolloPersonResult {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  city: string;
  country: string;
  email: string;
  email_status: string;
  linkedin_url: string;
  seniority: string;
}

interface SearchCriteria {
  person_titles: string;
  person_seniorities: string[];
  q_organization_keyword_tags: string;
  person_locations: string;
  organization_num_employees_ranges: string;
  q_keywords: string;
}

interface ImportHistoryItem {
  id: number;
  import_date: string;
  import_type: string;
  search_criteria: string;
  total_results: number;
  imported: number;
  skipped: number;
  created_at: string;
}

interface EmailList {
  id: number;
  name: string;
  contact_count?: number;
  member_count?: number;
}

// ==================== Seniority Options ====================

const SENIORITY_OPTIONS = [
  { value: 'c_suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior', label: 'Senior' },
];

const COMPANY_SIZE_OPTIONS = [
  { value: '', label: 'Any size' },
  { value: '1,10', label: '1-10' },
  { value: '11,50', label: '11-50' },
  { value: '51,200', label: '51-200' },
  { value: '201,500', label: '201-500' },
  { value: '501,1000', label: '501-1,000' },
  { value: '1001,5000', label: '1,001-5,000' },
  { value: '5001,100000', label: '5,000+' },
];

// ==================== Helper ====================

function maskEmail(email: string | null | undefined): string {
  if (!email) return '--';
  if (email.includes('@')) {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`;
  }
  return email;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ==================== Import Dialog ====================

function ImportDialog({
  isOpen,
  onClose,
  selectedPeople,
  onImportComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedPeople: ApolloPersonResult[];
  onImportComplete: () => void;
}) {
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [selectedListId, setSelectedListId] = useState('none');
  const [addToList, setAddToList] = useState(true);
  const [creatingNewList, setCreatingNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setResults(null);
      setProgress(0);
      setImporting(false);
      setError('');
      setCreatingNewList(false);
      setNewListName('');
      setSelectedListId('none');
      setAddToList(true);
      emailMarketingApi.getLists().then(res => {
        if (res.success) setEmailLists(res.data || []);
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleImport = async () => {
    setImporting(true);
    setError('');
    setProgress(10);

    try {
      let listId: number | undefined;

      // Create new list if needed
      if (addToList && creatingNewList && newListName.trim()) {
        setProgress(20);
        const listRes = await emailMarketingApi.createList({ name: newListName.trim() });
        if (listRes.success && listRes.data) {
          listId = listRes.data.id;
        }
      } else if (addToList && selectedListId !== 'none') {
        listId = parseInt(selectedListId);
      }

      setProgress(40);

      const res = await apolloApi.importContacts({
        people: selectedPeople,
        listId: listId || undefined,
      });

      setProgress(90);

      if (res.success) {
        const data = res.data || {};
        setResults({
          imported: data.imported || 0,
          skipped: data.skipped || 0,
          errors: data.errors || 0,
        });
        setProgress(100);
        onImportComplete();
      } else {
        setError(res.error || 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen && !importing) onClose(); };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, importing, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {results ? 'Import Complete' : `Importing ${selectedPeople.length} contacts to CRM`}
          </h2>
          {!importing && (
            <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
          )}
        </div>

        <div className="p-4 space-y-4">
          {results ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">{results.imported} imported</span>
              </div>
              {results.skipped > 0 && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
                  <SkipForward className="h-5 w-5" />
                  <span className="font-medium">{results.skipped} skipped (already exists)</span>
                </div>
              )}
              {results.errors > 0 && (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{results.errors} errors</span>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button onClick={onClose}>Done</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Add to email list toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="add-to-list"
                  checked={addToList}
                  onChange={e => setAddToList(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="add-to-list">Add to email marketing list</Label>
              </div>

              {addToList && (
                <div className="space-y-3 pl-6">
                  {!creatingNewList ? (
                    <div>
                      <Label>Select Email List</Label>
                      <Select value={selectedListId} onValueChange={setSelectedListId}>
                        <SelectTrigger><SelectValue placeholder="Select an email list" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Select List --</SelectItem>
                          {emailLists.map(list => (
                            <SelectItem key={list.id} value={String(list.id)}>
                              {list.name} ({list.contact_count || list.member_count || 0} members)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <button
                        type="button"
                        className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 underline"
                        onClick={() => setCreatingNewList(true)}
                      >
                        + Create New List
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Label>New List Name</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newListName}
                          onChange={e => setNewListName(e.target.value)}
                          placeholder="e.g., Apollo Import - Apr 2026"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setCreatingNewList(false); setNewListName(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress bar */}
              {importing && (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">Importing contacts...</p>
                </div>
              )}

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={onClose} disabled={importing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || (addToList && !creatingNewList && selectedListId === 'none' && emailLists.length > 0)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {importing ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Import</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Main Page ====================

export function ApolloSearchPage() {
  // Search criteria
  const [criteria, setCriteria] = useState<SearchCriteria>({
    person_titles: '',
    person_seniorities: [],
    q_organization_keyword_tags: '',
    person_locations: '',
    organization_num_employees_ranges: '',
    q_keywords: '',
  });

  // Results
  const [results, setResults] = useState<ApolloPersonResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Import
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Import History
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await apolloApi.getImportHistory();
      if (res.success) setHistory(res.data || []);
    } catch (_e) {
      // Silent fail
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleSearch = async (page: number = 1) => {
    setSearching(true);
    setSearchError('');
    setHasSearched(true);
    setSelectedIds(new Set());
    setCurrentPage(page);

    try {
      const payload: any = { page, per_page: perPage };

      if (criteria.person_titles.trim()) {
        payload.person_titles = criteria.person_titles.split(',').map(t => t.trim()).filter(Boolean);
      }
      if (criteria.person_seniorities.length > 0) {
        payload.person_seniorities = criteria.person_seniorities;
      }
      if (criteria.q_organization_keyword_tags.trim()) {
        payload.q_organization_keyword_tags = criteria.q_organization_keyword_tags.split(',').map(t => t.trim()).filter(Boolean);
      }
      if (criteria.person_locations.trim()) {
        payload.person_locations = criteria.person_locations.split(',').map(t => t.trim()).filter(Boolean);
      }
      if (criteria.organization_num_employees_ranges) {
        payload.organization_num_employees_ranges = [criteria.organization_num_employees_ranges];
      }
      if (criteria.q_keywords.trim()) {
        payload.q_keywords = criteria.q_keywords.trim();
      }

      const res = await apolloApi.searchPeople(payload);
      if (res.success) {
        const data = res.data || {};
        setResults(data.people || data.results || []);
        setTotalResults(data.pagination?.total_entries || data.total || data.people?.length || 0);
      } else {
        setSearchError(res.error || 'Search failed');
        setResults([]);
        setTotalResults(0);
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setTotalResults(0);
    } finally {
      setSearching(false);
    }
  };

  const toggleSeniority = (value: string) => {
    setCriteria(prev => ({
      ...prev,
      person_seniorities: prev.person_seniorities.includes(value)
        ? prev.person_seniorities.filter(s => s !== value)
        : [...prev.person_seniorities, value],
    }));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  const selectedPeople = results.filter(r => selectedIds.has(r.id));
  const totalPages = Math.ceil(totalResults / perPage);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Globe className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Apollo Search</h1>
          <p className="text-sm text-gray-500">Find and import contacts from Apollo into your CRM</p>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-6">
        {/* Left Panel - Search Form */}
        <div className="w-[350px] flex-shrink-0">
          <Card className="p-4 space-y-4 sticky top-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Search Filters</h3>

            <div>
              <Label htmlFor="job-titles">Job Titles</Label>
              <Input
                id="job-titles"
                value={criteria.person_titles}
                onChange={e => setCriteria(prev => ({ ...prev, person_titles: e.target.value }))}
                placeholder="CIO, CTO, IT Head"
              />
              <p className="text-xs text-gray-400 mt-0.5">Comma-separated</p>
            </div>

            <div>
              <Label>Seniority</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SENIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleSeniority(opt.value)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      criteria.person_seniorities.includes(opt.value)
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="industries">Industries</Label>
              <Input
                id="industries"
                value={criteria.q_organization_keyword_tags}
                onChange={e => setCriteria(prev => ({ ...prev, q_organization_keyword_tags: e.target.value }))}
                placeholder="IT, Education, Healthcare"
              />
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={criteria.person_locations}
                onChange={e => setCriteria(prev => ({ ...prev, person_locations: e.target.value }))}
                placeholder="India, United States"
              />
            </div>

            <div>
              <Label htmlFor="company-size">Company Size</Label>
              <Select
                value={criteria.organization_num_employees_ranges}
                onValueChange={val => setCriteria(prev => ({ ...prev, organization_num_employees_ranges: val }))}
              >
                <SelectTrigger id="company-size"><SelectValue placeholder="Any size" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value || 'any'} value={opt.value || 'any'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={criteria.q_keywords}
                onChange={e => setCriteria(prev => ({ ...prev, q_keywords: e.target.value }))}
                placeholder="General search terms"
              />
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => handleSearch(1)}
              disabled={searching}
            >
              {searching ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...</>
              ) : (
                <><Search className="h-4 w-4 mr-2" /> Search Apollo</>
              )}
            </Button>
          </Card>
        </div>

        {/* Right Panel - Results */}
        <div className="flex-1 min-w-0">
          {!hasSearched ? (
            <Card className="p-12 text-center">
              <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-500">Search Apollo Database</h3>
              <p className="text-sm text-gray-400 mt-1">Use the filters on the left to find contacts</p>
            </Card>
          ) : searching ? (
            <Card className="p-12 text-center">
              <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Searching Apollo database...</p>
            </Card>
          ) : searchError ? (
            <Card className="p-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Search Error</span>
              </div>
              <p className="text-sm text-red-500 mt-1">{searchError}</p>
            </Card>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {totalResults.toLocaleString()} results found
                  </h3>
                  {selectedIds.size > 0 && (
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                      {selectedIds.size} selected
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {/* Page size selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-500">Show:</span>
                    <Select value={String(perPage)} onValueChange={(v) => { setPerPage(parseInt(v)); setTimeout(() => handleSearch(1), 0); }}>
                      <SelectTrigger className="h-8 w-[75px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-gray-500">per page</span>
                  </div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage - 1)}
                        disabled={currentPage <= 1 || searching}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-gray-500 px-2 whitespace-nowrap">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearch(currentPage + 1)}
                        disabled={currentPage >= totalPages || searching}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Table */}
              {results.length > 0 ? (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-3 py-2.5 text-left w-10">
                            <input
                              type="checkbox"
                              checked={results.length > 0 && selectedIds.size === results.length}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              title="Select all"
                            />
                          </th>
                          <th className="px-3 py-2.5 text-left font-medium text-gray-600">Name</th>
                          <th className="px-3 py-2.5 text-left font-medium text-gray-600">Title</th>
                          <th className="px-3 py-2.5 text-left font-medium text-gray-600">Company</th>
                          <th className="px-3 py-2.5 text-left font-medium text-gray-600">Industry</th>
                          <th className="px-3 py-2.5 text-left font-medium text-gray-600">Location</th>
                          <th className="px-3 py-2.5 text-left font-medium text-gray-600">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map(person => (
                          <tr
                            key={person.id}
                            className={`border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                              selectedIds.has(person.id) ? 'bg-indigo-50/50' : ''
                            }`}
                          >
                            <td className="px-3 py-2.5">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(person.id)}
                                onChange={() => toggleSelection(person.id)}
                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="px-3 py-2.5 font-medium text-gray-900">
                              {person.name || `${person.first_name || ''} ${person.last_name || ''}`.trim() || '--'}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 max-w-[180px] truncate" title={person.title}>
                              {person.title || '--'}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600">
                              {person.company || '--'}
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs">
                              {person.industry || '--'}
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs">
                              {[person.city, person.country].filter(Boolean).join(', ') || '--'}
                            </td>
                            <td className="px-3 py-2.5">
                              {person.email && person.email_status === 'verified' ? (
                                <span className="text-xs text-gray-700">{person.email}</span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  {person.email ? maskEmail(person.email) : '--'}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
                    <span className="text-sm text-gray-500">
                      {selectedIds.size > 0
                        ? `${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''} selected`
                        : 'No contacts selected'}
                    </span>
                    <Button
                      onClick={() => setImportDialogOpen(true)}
                      disabled={selectedIds.size === 0}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Import Selected ({selectedIds.size})
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No results found. Try adjusting your search criteria.</p>
                </Card>
              )}

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(currentPage - 1)}
                    disabled={currentPage <= 1 || searching}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-sm text-gray-500 px-3">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSearch(currentPage + 1)}
                    disabled={currentPage >= totalPages || searching}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Import History */}
      <div className="mt-8">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-2"
          onClick={() => {
            setHistoryOpen(!historyOpen);
            if (!historyOpen) loadHistory();
          }}
        >
          {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          <Clock className="h-4 w-4" />
          Import History
        </button>

        {historyOpen && (
          <Card className="overflow-hidden">
            {loadingHistory ? (
              <div className="p-6 text-center">
                <Loader2 className="h-5 w-5 text-gray-400 animate-spin mx-auto" />
              </div>
            ) : history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Type</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Search Criteria</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Results</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Imported</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => (
                      <tr key={item.id} className="border-b last:border-b-0 hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600">{formatDate(item.import_date || item.created_at)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary" className="text-xs">{item.import_type || 'Apollo'}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 text-xs max-w-[300px] truncate" title={item.search_criteria}>
                          {item.search_criteria || '--'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{item.total_results || '--'}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-green-600 font-medium">{item.imported || 0}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-amber-600">{item.skipped || 0}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-400">
                No import history yet
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        selectedPeople={selectedPeople}
        onImportComplete={() => {
          setSelectedIds(new Set());
          loadHistory();
        }}
      />
    </div>
  );
}
