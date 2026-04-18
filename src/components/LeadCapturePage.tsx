import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
  FileText,
  Plus,
  Search,
  Loader2,
  Edit2,
  Trash2,
  Copy,
  Power,
  PowerOff,
  ChevronUp,
  ChevronDown,
  X,
  Inbox,
  ClipboardList,
  ExternalLink,
  Check,
  ArrowRightLeft,
  Code2,
  AlertCircle,
} from 'lucide-react';
import { leadCaptureApi } from '../lib/api';

// --------------- Types ---------------
interface FormField {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox' | 'number';
  required: boolean;
  options?: string;
}

interface CaptureForm {
  id: number;
  name: string;
  title: string;
  description?: string;
  fields: FormField[];
  thank_you_message?: string;
  redirect_url?: string;
  is_active: boolean;
  submission_count: number;
  token: string;
  created_at: string;
}

interface Submission {
  id: number;
  form_id: number;
  form_name?: string;
  submitted_data: Record<string, any>;
  source_url?: string;
  status: 'new' | 'converted';
  lead_id?: number;
  created_at: string;
}

// --------------- Helpers ---------------
function generateFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 40);
}

function makeId(): string {
  return 'f_' + Math.random().toString(36).substring(2, 9);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Extract common contact fields from submission data
function extractContactFields(data: Record<string, any>): { name: string; email: string; phone: string } {
  const nameKeys = ['name', 'full_name', 'fullname', 'contact_name'];
  const emailKeys = ['email', 'email_address', 'contact_email'];
  const phoneKeys = ['phone', 'phone_number', 'mobile', 'contact_phone'];

  const find = (keys: string[]) => {
    for (const k of keys) {
      if (data[k]) return String(data[k]);
    }
    return '-';
  };

  return { name: find(nameKeys), email: find(emailKeys), phone: find(phoneKeys) };
}

// ========================================
// Component
// ========================================
export function LeadCapturePage() {
  // --------------- State ---------------
  const [activeTab, setActiveTab] = useState('forms');
  const [forms, setForms] = useState<CaptureForm[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Form builder dialog
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [editingForm, setEditingForm] = useState<CaptureForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    thank_you_message: 'Thank you for your submission!',
    redirect_url: '',
  });
  const [fields, setFields] = useState<FormField[]>([
    { id: makeId(), label: 'Full Name', name: 'full_name', type: 'text', required: true },
    { id: makeId(), label: 'Email', name: 'email', type: 'email', required: true },
    { id: makeId(), label: 'Phone', name: 'phone', type: 'phone', required: false },
  ]);

  // Embed code dialog
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedForm, setEmbedForm] = useState<CaptureForm | null>(null);
  const [copied, setCopied] = useState(false);

  // Submissions filter
  const [formFilter, setFormFilter] = useState('all');
  const [converting, setConverting] = useState<number | null>(null);

  // Deleting
  const [deleting, setDeleting] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  // --------------- Data loading ---------------
  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leadCaptureApi.getForms();
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.forms || [];
        setForms(data);
      } else {
        setError(res.error || 'Failed to load forms');
      }
    } catch {
      setError('Failed to load forms');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    setSubmissionsLoading(true);
    try {
      const params: any = {};
      if (formFilter && formFilter !== 'all') params.formId = formFilter;
      const res = await leadCaptureApi.getSubmissions(params);
      if (res.success) {
        const data = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.submissions || [];
        setSubmissions(data);
      }
    } catch (err) {
      console.error('Failed to load submissions', err);
    } finally {
      setSubmissionsLoading(false);
    }
  }, [formFilter]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  useEffect(() => {
    if (activeTab === 'submissions') {
      fetchSubmissions();
    }
  }, [activeTab, fetchSubmissions]);

  // --------------- Form builder handlers ---------------
  const openCreateForm = () => {
    setEditingForm(null);
    setFormData({
      name: '',
      title: '',
      description: '',
      thank_you_message: 'Thank you for your submission!',
      redirect_url: '',
    });
    setFields([
      { id: makeId(), label: 'Full Name', name: 'full_name', type: 'text', required: true },
      { id: makeId(), label: 'Email', name: 'email', type: 'email', required: true },
      { id: makeId(), label: 'Phone', name: 'phone', type: 'phone', required: false },
    ]);
    setShowFormBuilder(true);
  };

  const openEditForm = (form: CaptureForm) => {
    setEditingForm(form);
    setFormData({
      name: form.name || '',
      title: form.title || '',
      description: form.description || '',
      thank_you_message: form.thank_you_message || 'Thank you for your submission!',
      redirect_url: form.redirect_url || '',
    });
    setFields(
      Array.isArray(form.fields) && form.fields.length > 0
        ? form.fields.map((f) => ({ ...f, id: f.id || makeId() }))
        : [{ id: makeId(), label: 'Full Name', name: 'full_name', type: 'text', required: true }]
    );
    setShowFormBuilder(true);
  };

  const addField = () => {
    setFields((prev) => [
      ...prev,
      { id: makeId(), label: '', name: '', type: 'text', required: false },
    ]);
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };
        // Auto-generate name from label
        if (updates.label !== undefined) {
          updated.name = generateFieldName(updates.label);
        }
        return updated;
      })
    );
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  const handleSaveForm = async () => {
    if (!formData.name.trim() || !formData.title.trim()) return;
    if (fields.length === 0) return;

    setSaving(true);
    try {
      const payload = {
        ...formData,
        fields: fields.map(({ id, ...rest }) => rest),
      };

      let res;
      if (editingForm) {
        res = await leadCaptureApi.updateForm(editingForm.id, payload);
      } else {
        res = await leadCaptureApi.createForm(payload);
      }

      if (res.success) {
        setShowFormBuilder(false);
        fetchForms();
      } else {
        setError(res.error || 'Failed to save form');
      }
    } catch {
      setError('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  // --------------- Form actions ---------------
  const handleToggleActive = async (form: CaptureForm) => {
    setToggling(form.id);
    try {
      const res = await leadCaptureApi.updateForm(form.id, { is_active: !form.is_active });
      if (res.success) {
        fetchForms();
      }
    } catch (err) {
      console.error('Toggle failed', err);
    } finally {
      setToggling(null);
    }
  };

  const handleDeleteForm = async (id: number) => {
    if (!confirm('Delete this form? All submissions will also be deleted.')) return;
    setDeleting(id);
    try {
      const res = await leadCaptureApi.deleteForm(id);
      if (res.success) {
        fetchForms();
      }
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setDeleting(null);
    }
  };

  const openEmbedCode = (form: CaptureForm) => {
    setEmbedForm(form);
    setCopied(false);
    setShowEmbed(true);
  };

  const publicFormUrl = embedForm
    ? `https://tendertracker.mobilisepro.com/api/v1/public/forms/${embedForm.token}`
    : '';

  const iframeSnippet = embedForm
    ? `<iframe src="${publicFormUrl}" width="100%" height="600" frameborder="0" style="border:none;max-width:600px;"></iframe>`
    : '';

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // --------------- Submission actions ---------------
  const handleConvertToLead = async (submissionId: number) => {
    setConverting(submissionId);
    try {
      const res = await leadCaptureApi.convertToLead(submissionId);
      if (res.success) {
        fetchSubmissions();
      }
    } catch (err) {
      console.error('Conversion failed', err);
    } finally {
      setConverting(null);
    }
  };

  // --------------- Filter ---------------
  const filteredForms = forms.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      f.name?.toLowerCase().includes(q) ||
      f.title?.toLowerCase().includes(q)
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
          <div className="p-2.5 bg-pink-50 rounded-xl">
            <ClipboardList className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Capture</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create forms, view submissions, and convert visitors to leads</p>
          </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="forms" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Forms
          </TabsTrigger>
          <TabsTrigger value="submissions" className="gap-2">
            <Inbox className="h-4 w-4" />
            Submissions
          </TabsTrigger>
        </TabsList>

        {/* ==================== FORMS TAB ==================== */}
        <TabsContent value="forms">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search forms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={openCreateForm} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Form
            </Button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Loading forms...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FileText className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-base font-medium text-gray-500">No forms found</p>
              <p className="text-sm mt-1">Create your first lead capture form to start collecting submissions</p>
              <Button onClick={openCreateForm} variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Form
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredForms.map((form) => (
                <Card key={form.id} className="hover:border-gray-300 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold truncate">{form.name}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1 truncate">{form.title}</p>
                      </div>
                      <Badge
                        variant={form.is_active ? 'default' : 'secondary'}
                        className={form.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500'}
                      >
                        {form.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Inbox className="h-3.5 w-3.5" />
                        {form.submission_count || 0} submissions
                      </span>
                      <span>Created {formatDate(form.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => openEditForm(form)} className="gap-1.5 text-xs">
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(form)}
                        disabled={toggling === form.id}
                        className="gap-1.5 text-xs"
                      >
                        {toggling === form.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : form.is_active ? (
                          <PowerOff className="h-3.5 w-3.5" />
                        ) : (
                          <Power className="h-3.5 w-3.5" />
                        )}
                        {form.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEmbedCode(form)} className="gap-1.5 text-xs">
                        <Code2 className="h-3.5 w-3.5" />
                        Embed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteForm(form.id)}
                        disabled={deleting === form.id}
                        className="gap-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        {deleting === form.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ==================== SUBMISSIONS TAB ==================== */}
        <TabsContent value="submissions">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-64">
              <Select value={formFilter} onValueChange={setFormFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  {forms.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSubmissions} className="gap-2">
              <Loader2 className={`h-4 w-4 ${submissionsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {submissionsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Inbox className="h-12 w-12 mb-3 opacity-50" />
              <p className="text-base font-medium text-gray-500">No submissions yet</p>
              <p className="text-sm mt-1">Submissions will appear here once visitors fill out your forms</p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Form</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map((sub) => {
                      const contact = extractContactFields(sub.submitted_data || {});
                      const isConverted = sub.status === 'converted';
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(sub.created_at)}</td>
                          <td className="px-4 py-3 font-medium">{sub.form_name || '-'}</td>
                          <td className="px-4 py-3">{contact.name}</td>
                          <td className="px-4 py-3 text-blue-600">{contact.email}</td>
                          <td className="px-4 py-3">{contact.phone}</td>
                          <td className="px-4 py-3 max-w-[160px] truncate text-gray-500" title={sub.source_url || ''}>
                            {sub.source_url || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {isConverted ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                                <Check className="h-3 w-3" />
                                Converted
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100">
                                New
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isConverted ? (
                              sub.lead_id ? (
                                <Button size="sm" variant="ghost" className="gap-1 text-xs text-green-600 hover:text-green-700">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  View Lead
                                </Button>
                              ) : (
                                <span className="text-xs text-gray-400">Converted</span>
                              )
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleConvertToLead(sub.id)}
                                disabled={converting === sub.id}
                                className="gap-1.5 text-xs"
                              >
                                {converting === sub.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                )}
                                Convert to Lead
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ==================== FORM BUILDER DIALOG ==================== */}
      <Dialog open={showFormBuilder} onOpenChange={setShowFormBuilder}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingForm ? 'Edit Form' : 'Create Lead Capture Form'}</DialogTitle>
            <DialogDescription>
              {editingForm ? 'Update your form fields and settings' : 'Build a form to capture leads from your website'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Form Name *</Label>
                <Input
                  placeholder="e.g. Contact Us Form"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Form Title *</Label>
                <Input
                  placeholder="e.g. Get in Touch"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this form is for..."
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Form Fields</Label>
                <Button size="sm" variant="outline" onClick={addField} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </Button>
              </div>

              {fields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Add fields to build your form. Click '+ Add Field' below to get started.</p>
              )}

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-start gap-3">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5 pt-1">
                        <button
                          onClick={() => moveField(index, 'up')}
                          disabled={index === 0}
                          className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                          aria-label="Move field up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => moveField(index, 'down')}
                          disabled={index === fields.length - 1}
                          className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-30"
                          aria-label="Move field down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Field config */}
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Label</Label>
                          <Input
                            placeholder="e.g., Full Name"
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Name</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(field.id, { name: e.target.value })}
                            className="text-sm bg-gray-100"
                            placeholder="auto-generated"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500">Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(val) => updateField(field.id, { type: val as FormField['type'] })}
                          >
                            <SelectTrigger className="text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="select">Select</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Required toggle and remove */}
                      <div className="flex items-center gap-3 pt-5">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                          />
                          <span className="text-xs text-gray-500">Required</span>
                        </div>
                        <button
                          onClick={() => removeField(field.id)}
                          className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                          aria-label="Remove field"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Options for select type */}
                    {field.type === 'select' && (
                      <div className="mt-2 ml-8">
                        <Label className="text-xs text-gray-500">Options (comma-separated)</Label>
                        <Input
                          placeholder="Option 1, Option 2, Option 3"
                          value={field.options || ''}
                          onChange={(e) => updateField(field.id, { options: e.target.value })}
                          className="text-sm mt-1"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Thank you and redirect */}
            <div className="space-y-2">
              <Label>Thank You Message</Label>
              <Textarea
                placeholder="Message shown after form submission"
                value={formData.thank_you_message}
                onChange={(e) => setFormData((p) => ({ ...p, thank_you_message: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Redirect URL (optional)</Label>
              <Input
                placeholder="https://yoursite.com/thank-you"
                value={formData.redirect_url}
                onChange={(e) => setFormData((p) => ({ ...p, redirect_url: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormBuilder(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveForm}
              disabled={saving || !formData.name.trim() || !formData.title.trim() || fields.length === 0}
              className="gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingForm ? 'Update Form' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== EMBED CODE DIALOG ==================== */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Embed Code</DialogTitle>
            <DialogDescription>
              Use the URL or iframe snippet to embed "{embedForm?.name}" on your website
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Public Form URL</Label>
              <div className="flex gap-2">
                <Input value={publicFormUrl} readOnly className="text-xs font-mono bg-gray-50" />
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(publicFormUrl)} className="shrink-0 gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">HTML Iframe Snippet</Label>
              <div className="relative">
                <Textarea
                  value={iframeSnippet}
                  readOnly
                  rows={3}
                  className="text-xs font-mono bg-gray-50 resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(iframeSnippet)}
                  className="absolute top-2 right-2 gap-1.5 text-xs"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmbed(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
