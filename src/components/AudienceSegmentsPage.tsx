import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Users,
  Plus,
  Search,
  Loader2,
  Edit2,
  Trash2,
  RefreshCw,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Zap,
  Target,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { audienceSegmentApi } from '../lib/api';

// --------------- Types ---------------
interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Segment {
  id: number;
  name: string;
  description?: string;
  is_dynamic: boolean;
  criteria: { conditions: Condition[] };
  contact_count: number;
  created_at: string;
  updated_at?: string;
}

interface AISuggestion {
  name: string;
  description: string;
  criteria: { conditions: Condition[] };
}

// --------------- Constants ---------------
const FIELD_OPTIONS = [
  { value: 'industry', label: 'Industry' },
  { value: 'location', label: 'Location' },
  { value: 'company_size', label: 'Company Size' },
  { value: 'lead_status', label: 'Lead Status' },
  { value: 'product_line', label: 'Product Line' },
  { value: 'source', label: 'Source' },
  { value: 'designation', label: 'Designation' },
  { value: 'revenue_range', label: 'Revenue Range' },
  { value: 'last_activity', label: 'Last Activity' },
  { value: 'engagement_score', label: 'Engagement Score' },
];

const OPERATOR_OPTIONS = [
  { value: 'is', label: 'is' },
  { value: 'is_not', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
];

// --------------- Helpers ---------------
function makeId(): string {
  return 'c_' + Math.random().toString(36).substring(2, 9);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getFieldLabel(value: string): string {
  return FIELD_OPTIONS.find((f) => f.value === value)?.label || value;
}

function getOperatorLabel(value: string): string {
  return OPERATOR_OPTIONS.find((o) => o.value === value)?.label || value;
}

// ========================================
// Component
// ========================================
export function AudienceSegmentsPage() {
  // --------------- State ---------------
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Create/Edit dialog
  const [showDialog, setShowDialog] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isDynamic, setIsDynamic] = useState(true);
  const [conditions, setConditions] = useState<Condition[]>([
    { id: makeId(), field: 'industry', operator: 'is', value: '' },
  ]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // AI suggestions
  const [showAI, setShowAI] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiCreating, setAiCreating] = useState<number | null>(null);

  // Delete & refresh
  const [deleting, setDeleting] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<number | null>(null);

  // --------------- Data loading ---------------
  const fetchSegments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await audienceSegmentApi.getAll();
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.segments || [];
        setSegments(data);
      } else {
        setError(res.error || 'Failed to load segments');
      }
    } catch {
      setError('Failed to load segments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // --------------- Segment actions ---------------
  const handleRefreshCount = async (id: number) => {
    setRefreshing(id);
    try {
      const res = await audienceSegmentApi.refreshCount(id);
      if (res.success) {
        fetchSegments();
      }
    } catch (err) {
      console.error('Refresh failed', err);
    } finally {
      setRefreshing(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this segment?')) return;
    setDeleting(id);
    try {
      const res = await audienceSegmentApi.delete(id);
      if (res.success) {
        fetchSegments();
      }
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleting(null);
    }
  };

  // --------------- Dialog handlers ---------------
  const openCreate = () => {
    setEditingSegment(null);
    setFormData({ name: '', description: '' });
    setIsDynamic(true);
    setConditions([{ id: makeId(), field: 'industry', operator: 'is', value: '' }]);
    setPreviewCount(null);
    setShowDialog(true);
  };

  const openEdit = (segment: Segment) => {
    setEditingSegment(segment);
    setFormData({ name: segment.name || '', description: segment.description || '' });
    setIsDynamic(segment.is_dynamic ?? true);
    const existingConditions = segment.criteria?.conditions;
    if (Array.isArray(existingConditions) && existingConditions.length > 0) {
      setConditions(existingConditions.map((c) => ({ ...c, id: c.id || makeId() })));
    } else {
      setConditions([{ id: makeId(), field: 'industry', operator: 'is', value: '' }]);
    }
    setPreviewCount(segment.contact_count ?? null);
    setShowDialog(true);
  };

  const addCondition = () => {
    setConditions((prev) => [
      ...prev,
      { id: makeId(), field: 'industry', operator: 'is', value: '' },
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<Condition>) => {
    setConditions((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handlePreviewCount = async () => {
    if (conditions.length === 0) return;
    setPreviewLoading(true);
    try {
      // Use a temporary save + refresh approach, or if editing use the refresh endpoint
      // For preview we create/update and then check
      const payload = {
        name: formData.name || 'Preview Segment',
        description: formData.description,
        is_dynamic: isDynamic,
        criteria: { conditions: conditions.map(({ id, ...rest }) => rest) },
      };

      if (editingSegment) {
        await audienceSegmentApi.update(editingSegment.id, payload);
        const res = await audienceSegmentApi.refreshCount(editingSegment.id);
        if (res.success) {
          const count = res.data?.contact_count ?? res.data?.count ?? 0;
          setPreviewCount(count);
        }
      } else {
        // For new segments, we show a preview by calling refresh after creating
        // We'll use a simple approach - show estimated count
        setPreviewCount(null);
        // Create temporarily is too destructive; just indicate preview isn't available for new segments
        setPreviewCount(-1); // indicates "save first to see count"
      }
    } catch (err) {
      console.error('Preview failed', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        is_dynamic: isDynamic,
        criteria: { conditions: conditions.map(({ id, ...rest }) => rest) },
      };

      let res;
      if (editingSegment) {
        res = await audienceSegmentApi.update(editingSegment.id, payload);
      } else {
        res = await audienceSegmentApi.create(payload);
      }

      if (res.success) {
        setShowDialog(false);
        fetchSegments();
      } else {
        setError(res.error || 'Failed to save segment');
      }
    } catch {
      setError('Failed to save segment');
    } finally {
      setSaving(false);
    }
  };

  // --------------- AI Suggest ---------------
  const handleAISuggest = async () => {
    setShowAI(true);
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      const res = await audienceSegmentApi.aiSuggest();
      if (res.success) {
        const suggestions = Array.isArray(res.data) ? res.data : res.data?.suggestions || res.data?.data || [];
        setAiSuggestions(suggestions);
      } else {
        setError(res.error || 'AI suggestion failed');
      }
    } catch {
      setError('AI suggestion failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateFromSuggestion = async (suggestion: AISuggestion, index: number) => {
    setAiCreating(index);
    try {
      const payload = {
        name: suggestion.name,
        description: suggestion.description,
        is_dynamic: true,
        criteria: suggestion.criteria || { conditions: [] },
      };
      const res = await audienceSegmentApi.create(payload);
      if (res.success) {
        fetchSegments();
        // Remove the suggestion from list after creating
        setAiSuggestions((prev) => prev.filter((_, i) => i !== index));
      }
    } catch (err) {
      console.error('Create from suggestion failed', err);
    } finally {
      setAiCreating(null);
    }
  };

  // --------------- Filter ---------------
  const filteredSegments = segments.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  });

  // ========================================
  // Render
  // ========================================
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl">
            <Users className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audience Segments</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create dynamic audience segments with criteria-based filtering and AI suggestions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleAISuggest} className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Suggest
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Segment
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto" aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search segments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Segment List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="h-8 w-8 animate-spin mb-3" />
          <p className="text-sm">Loading segments...</p>
        </div>
      ) : filteredSegments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Target className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-base font-medium text-gray-500">No segments found</p>
          <p className="text-sm mt-1">Create audience segments to target specific groups of contacts</p>
          <div className="flex gap-2 mt-4">
            <Button onClick={openCreate} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Segment
            </Button>
            <Button variant="outline" onClick={handleAISuggest} className="gap-2">
              <Sparkles className="h-4 w-4" />
              AI Suggest
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSegments.map((segment) => {
            const isExpanded = expandedId === segment.id;
            const conditionsList = segment.criteria?.conditions || [];

            return (
              <Card key={segment.id} className="hover:border-gray-300 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isExpanded ? null : segment.id); } }}
                      onClick={() => setExpandedId(isExpanded ? null : segment.id)}
                    >
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold">{segment.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={segment.is_dynamic ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-gray-100 text-gray-500'}
                        >
                          {segment.is_dynamic ? 'Dynamic' : 'Static'}
                        </Badge>
                      </div>
                      {segment.description && (
                        <p className="text-sm text-gray-500 mt-1">{segment.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <div className="text-lg font-bold text-gray-900">{segment.contact_count ?? 0}</div>
                        <div className="text-xs text-gray-400">contacts</div>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : segment.id)}
                        className="p-1 rounded hover:bg-gray-100"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? 'Collapse segment' : 'Expand segment'}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Summary row */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                    <span>Created {formatDate(segment.created_at)}</span>
                    {conditionsList.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Filter className="h-3 w-3" />
                        {conditionsList.length} condition{conditionsList.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Expanded: criteria & actions */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {/* Criteria display */}
                      {conditionsList.length > 0 ? (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Criteria</p>
                          <div className="flex flex-wrap gap-2">
                            {conditionsList.map((cond, i) => (
                              <div
                                key={i}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs"
                              >
                                <span className="font-medium text-gray-700">{getFieldLabel(cond.field)}</span>
                                <span className="text-gray-400">{getOperatorLabel(cond.operator)}</span>
                                <span className="font-medium text-blue-600">"{cond.value}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 mb-4">Add conditions to define who belongs to this segment</p>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(segment)} className="gap-1.5 text-xs">
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRefreshCount(segment.id)}
                          disabled={refreshing === segment.id}
                          className="gap-1.5 text-xs"
                        >
                          {refreshing === segment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Refresh Count
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(segment.id)}
                          disabled={deleting === segment.id}
                          className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {deleting === segment.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ==================== CREATE/EDIT DIALOG ==================== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSegment ? 'Edit Segment' : 'Create Audience Segment'}</DialogTitle>
            <DialogDescription>
              Define criteria to dynamically group contacts into targeted segments
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name & Description */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Segment Name *</Label>
                <Input
                  placeholder="e.g. Enterprise Leads"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>

            {/* Dynamic toggle */}
            <div className="flex items-center gap-3">
              <Switch checked={isDynamic} onCheckedChange={setIsDynamic} />
              <div>
                <Label className="font-medium">Dynamic Segment</Label>
                <p className="text-xs text-gray-400">
                  {isDynamic
                    ? 'Contacts are automatically updated based on criteria'
                    : 'Contacts are manually added and remain fixed'}
                </p>
              </div>
            </div>

            {/* Criteria Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Criteria</Label>
                <Button size="sm" variant="outline" onClick={addCondition} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Condition
                </Button>
              </div>

              {conditions.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Add conditions to define who belongs to this segment
                </p>
              )}

              <div className="space-y-2">
                {conditions.map((cond, index) => (
                  <div key={cond.id} className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    {index > 0 && (
                      <span className="text-xs font-medium text-gray-400 w-8 text-center">AND</span>
                    )}
                    <div className={`flex-1 grid grid-cols-3 gap-2 ${index === 0 ? '' : ''}`}>
                      {/* Field */}
                      <Select
                        value={cond.field}
                        onValueChange={(val) => updateCondition(cond.id, { field: val })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Operator */}
                      <Select
                        value={cond.operator}
                        onValueChange={(val) => updateCondition(cond.id, { operator: val })}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATOR_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Value */}
                      <Input
                        placeholder="Value..."
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                        className="text-sm"
                      />
                    </div>

                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 shrink-0"
                      aria-label="Remove condition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Preview Count */}
              {conditions.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePreviewCount}
                    disabled={previewLoading}
                    className="gap-1.5"
                  >
                    {previewLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Users className="h-3.5 w-3.5" />
                    )}
                    Preview Count
                  </Button>
                  {previewCount !== null && previewCount >= 0 && (
                    <span className="text-sm text-gray-600">
                      <span className="font-bold text-gray-900">{previewCount}</span> matching contacts
                    </span>
                  )}
                  {previewCount === -1 && (
                    <span className="text-sm text-gray-400">Create the segment, then click 'Refresh Count' to see matching contacts</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingSegment ? 'Update Segment' : 'Create Segment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== AI SUGGEST DIALOG ==================== */}
      <Dialog open={showAI} onOpenChange={setShowAI}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI-Suggested Segments
            </DialogTitle>
            <DialogDescription>
              AI has analyzed your contact data and suggests the following audience segments
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                  <Sparkles className="h-4 w-4 text-purple-400 absolute -top-1 -right-1" />
                </div>
                <p className="text-sm mt-3">Analyzing your contact data...</p>
                <p className="text-xs mt-1 text-gray-300">This may take a few seconds</p>
              </div>
            ) : aiSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Zap className="h-10 w-10 mb-3 opacity-50" />
                <p className="text-sm">No suggestions available at the moment</p>
                <p className="text-xs mt-1">Try again later when you have more contact data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, index) => (
                  <Card key={index} className="border-purple-100 bg-purple-50/30">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{suggestion.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">{suggestion.description}</p>

                          {/* Suggested criteria */}
                          {suggestion.criteria?.conditions && suggestion.criteria.conditions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {suggestion.criteria.conditions.map((cond, ci) => (
                                <span
                                  key={ci}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-purple-200 rounded text-xs"
                                >
                                  <span className="text-gray-600">{getFieldLabel(cond.field)}</span>
                                  <span className="text-gray-400">{getOperatorLabel(cond.operator)}</span>
                                  <span className="text-purple-600 font-medium">"{cond.value}"</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleCreateFromSuggestion(suggestion, index)}
                          disabled={aiCreating === index}
                          className="gap-1.5 ml-4 shrink-0"
                        >
                          {aiCreating === index ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Create
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAI(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
