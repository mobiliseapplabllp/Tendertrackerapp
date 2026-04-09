import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { QuickDocumentAccess } from './QuickDocumentAccess';
import type { Tender, TenderActivity, Document, Company, WorkLogReminder } from '../lib/types';
import { documentApi, tenderApi, companyApi, reminderApi, userApi } from '../lib/api';
import {
  X,
  FileText,
  Upload,
  Download,
  Trash2,
  Save,
  Clock,
  User,
  Calendar,
  Pencil,
  Bell,
  CheckCircle2,
  AlertCircle,
  Plus,
  Mail,
  Phone,
  DollarSign,
  Building2,
  Loader2,
  Folder,
  List,
  ListTodo,
  CheckSquare,
  LayoutDashboard,
  CreditCard,
} from 'lucide-react';

interface TenderDrawerProps {
  tender: Tender | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (tender: Tender) => void;
}

export function TenderDrawer({ tender, isOpen, onClose, onUpdate }: TenderDrawerProps) {
  // Initialize editedTender immediately from tender prop to avoid race condition
  const [editedTender, setEditedTender] = useState<Tender | null>(() => {
    if (tender) {
      return {
        ...tender,
        dueDate: tender.submissionDeadline || tender.dueDate,
      };
    }
    return null;
  });
  const [newWorkLog, setNewWorkLog] = useState('');
  const [workLogForm, setWorkLogForm] = useState({
    description: '',
    workType: 'General' as 'General' | 'Research' | 'Documentation' | 'Communication' | 'Analysis' | 'Preparation' | 'Review' | 'Other',
    hoursSpent: '',
    workDate: new Date().toISOString().split('T')[0], // Today's date as default
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [technicalDocuments, setTechnicalDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<TenderActivity[]>([]);
  const [workLogs, setWorkLogs] = useState<TenderActivity[]>([]);
  const [auditLogs, setAuditLogs] = useState<TenderActivity[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [technicalCategoryId, setTechnicalCategoryId] = useState<number | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [editingWorkLog, setEditingWorkLog] = useState<TenderActivity | null>(null);
  const [editWorkLogForm, setEditWorkLogForm] = useState({
    description: '',
    workType: 'General' as 'General' | 'Research' | 'Documentation' | 'Communication' | 'Analysis' | 'Preparation' | 'Review' | 'Other',
    hoursSpent: '',
    workDate: new Date().toISOString().split('T')[0],
  });
  const [reminders, setReminders] = useState<Record<number, WorkLogReminder[]>>({}); // activityId -> reminders
  const [showReminderForm, setShowReminderForm] = useState<number | null>(null);
  const [reminderForm, setReminderForm] = useState({
    actionRequired: '',
    dueDate: '',
    recipients: [] as Array<{ email?: string; phoneNumber?: string; userId?: number }>,
  });
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [newTaskForm, setNewTaskForm] = useState({
    description: '',
    dueDate: '',
    assignedTo: undefined as number | undefined,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };
  const technicalFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch companies when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen]);

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const response = await companyApi.getAll();
      if (response.success && response.data) {
        const companiesData = response.data.data || response.data || [];
        const transformed = companiesData.map((company: any) => ({
          id: company.id,
          companyName: company.company_name || company.companyName,
          industry: company.industry,
          website: company.website,
          phone: company.phone,
          email: company.email,
          address: company.address,
          city: company.city,
          state: company.state,
          country: company.country,
          postalCode: company.postal_code || company.postalCode,
          taxId: company.tax_id || company.taxId,
          status: company.status || 'Active',
          createdAt: company.created_at || company.createdAt,
          updatedAt: company.updated_at || company.updatedAt,
        }));
        setCompanies(transformed);
      }
    } catch (err: any) {
      // Error handled silently
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Fetch document categories to find Technical Documents category
  useEffect(() => {
    const fetchCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await documentApi.getCategories();
        if (response.success && response.data) {
          const techCategory = response.data.find((cat: any) => cat.name === 'Technical Documents');
          if (techCategory) {
            setTechnicalCategoryId(techCategory.id);
          } else {
            // Category might not exist yet - this is not a critical error
            // The upload button will be disabled if category is not found
            console.debug('Technical Documents category not found. Upload will be disabled until category is created.');
          }
        }
      } catch (error) {
        // Error is handled silently - upload button will be disabled
      } finally {
        setCategoriesLoading(false);
      }
    };
    if (isOpen) {
      fetchCategories();
    } else {
      // Reset when drawer closes
      setTechnicalCategoryId(null);
    }
  }, [isOpen]);

  // Update editedTender immediately when tender changes and fetch data
  useEffect(() => {
    if (tender && isOpen) {
      // Update editedTender immediately to avoid null reference errors
      setEditedTender({
        ...tender,
        dueDate: tender.submissionDeadline || tender.dueDate,
      });
      fetchDocuments();
      fetchActivities();
    } else if (!tender) {
      // Clear editedTender when tender is null
      setEditedTender(null);
    }
  }, [tender, isOpen, technicalCategoryId]);

  const fetchDocuments = async () => {
    if (!tender?.id) return;

    setLoadingDocuments(true);
    try {
      const response = await documentApi.getAll({ tenderId: tender.id });
      if (response.success && response.data) {
        const allDocs = response.data.data || [];

        // Separate documents by category
        const techDocs: Document[] = [];
        const regularDocs: Document[] = [];

        allDocs.forEach((doc: any) => {
          // Transform snake_case to camelCase
          const transformedDoc: Document = {
            id: doc.id,
            tenderId: doc.tender_id,
            categoryId: doc.category_id,
            fileName: doc.file_name,
            originalName: doc.original_name,
            filePath: doc.file_path,
            fileSize: doc.file_size,
            mimeType: doc.mime_type,
            fileHash: doc.file_hash,
            expirationDate: doc.expiration_date,
            isFavorite: doc.is_favorite === 1 || doc.is_favorite === true,
            uploadedBy: doc.uploaded_by,
            uploadedAt: doc.uploaded_at,
            uploadedByName: doc.uploaded_by_name, // Store user name for display
          } as any;

          // Check if this is a technical document
          if (technicalCategoryId && doc.category_id === technicalCategoryId) {
            techDocs.push(transformedDoc);
          } else {
            regularDocs.push(transformedDoc);
          }
        });

        setDocuments(regularDocs);
        setTechnicalDocuments(techDocs);
      }
    } catch (error) {
      // Error fetching documents - will be handled by UI state
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchReminders = async (activityId: number) => {
    try {
      const response = await reminderApi.getByActivity(activityId);
      if (response.success && response.data) {
        setReminders(prev => ({
          ...prev,
          [activityId]: response.data || [],
        }));
      }
    } catch (error) {
      // Error fetching reminders - will be handled silently
    }
  };

  const fetchActivities = async () => {
    if (!tender?.id) return;

    try {
      const response = await tenderApi.getActivities(tender.id);
      if (response.success && response.data) {
        // Transform snake_case to camelCase
        const transformedActivities = (response.data || []).map((activity: any) => ({
          id: activity.id,
          tenderId: activity.tender_id,
          userId: activity.user_id,
          user: activity.user_name ? {
            id: activity.user_id,
            fullName: activity.user_name,
            email: activity.user_email,
          } : undefined,
          activityType: activity.activity_type,
          description: activity.description,
          oldValue: activity.old_value,
          newValue: activity.new_value,
          createdAt: activity.created_at,
        }));
        setActivities(transformedActivities);

        // Split into work logs (Commented) and audit logs (all others)
        const workLogsList = transformedActivities.filter(a => a.activityType === 'Commented');
        const auditLogsList = transformedActivities.filter(a => a.activityType !== 'Commented');
        setWorkLogs(workLogsList);
        setAuditLogs(auditLogsList);

        // Fetch reminders for each work log and task
        const logsWithReminders = transformedActivities.filter(a =>
          ['Commented', 'Task', 'Meeting', 'Call'].includes(a.activityType)
        );
        for (const log of logsWithReminders) {
          await fetchReminders(log.id);
        }
      }
    } catch (error) {
      // Error fetching activities - will be handled by UI state
    }
  };

  // Handle ESC key to close drawer
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  // Early return - don't render anything if drawer is closed or tender is not ready
  if (!isOpen || !tender) {
    return null;
  }

  // Use editedTender if available, otherwise fall back to tender for display
  // But ensure editedTender is set before rendering form fields
  const displayTender = editedTender || tender;

  // If editedTender is not set yet, don't render the form (wait for useEffect to set it)
  if (!editedTender) {
    return null;
  }

  const handleSave = async () => {
    if (!editedTender || !tender?.id) return;

    // Clear previous messages
    setSaveSuccess(null);
    setSaveError(null);
    setSaving(true);

    try {
      // Only send fields that the backend validation allows
      const updatePayload: any = {};

      if (editedTender.title !== undefined) updatePayload.title = editedTender.title;
      if (editedTender.description !== undefined) updatePayload.description = editedTender.description || '';
      if (editedTender.companyId !== undefined) updatePayload.companyId = editedTender.companyId;
      if (editedTender.categoryId !== undefined) updatePayload.categoryId = editedTender.categoryId;
      if (editedTender.status !== undefined) updatePayload.status = editedTender.status;
      if (editedTender.priority !== undefined) updatePayload.priority = editedTender.priority;
      if (editedTender.estimatedValue !== undefined) updatePayload.estimatedValue = editedTender.estimatedValue;
      if (editedTender.currency !== undefined) updatePayload.currency = editedTender.currency;
      if (editedTender.dueDate !== undefined || editedTender.submissionDeadline !== undefined) {
        updatePayload.submissionDeadline = editedTender.dueDate || editedTender.submissionDeadline;
      }
      if (editedTender.expectedAwardDate !== undefined) updatePayload.expectedAwardDate = editedTender.expectedAwardDate;
      if (editedTender.contractDurationMonths !== undefined) updatePayload.contractDurationMonths = editedTender.contractDurationMonths;
      if (editedTender.assignedTo !== undefined) updatePayload.assignedTo = editedTender.assignedTo;
      if (editedTender.emdAmount !== undefined) updatePayload.emdAmount = editedTender.emdAmount;
      if (editedTender.tenderFees !== undefined) updatePayload.tenderFees = editedTender.tenderFees;

      // Call the API directly instead of using onUpdate to avoid sending invalid fields
      const response = await tenderApi.update(tender.id, updatePayload);

      if (response.success && response.data) {
        // Update the local state with the response
        onUpdate(response.data);
        setSaveSuccess('Tender updated successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(null), 3000);
      } else {
        setSaveError(response.error || 'Failed to update tender. Please try again.');
      }
    } catch (error: any) {
      setSaveError(error.message || 'Failed to update tender. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddWorkLog = async () => {
    if (!workLogForm.description.trim() || !tender?.id) return;

    try {
      // Build description with work details
      let description = workLogForm.description;
      if (workLogForm.workType !== 'General') {
        description = `[${workLogForm.workType}] ${description}`;
      }
      if (workLogForm.hoursSpent) {
        description += ` (${workLogForm.hoursSpent} hour${parseFloat(workLogForm.hoursSpent) !== 1 ? 's' : ''})`;
      }
      if (workLogForm.workDate && workLogForm.workDate !== new Date().toISOString().split('T')[0]) {
        const workDate = new Date(workLogForm.workDate);
        description += ` - Work Date: ${workDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }

      const response = await tenderApi.addActivity(tender.id, {
        activityType: 'Commented',
        description: description,
      });

      if (response.success && response.data) {
        // Refresh activities to get the latest with user info
        await fetchActivities();
        // Reset form
        setWorkLogForm({
          description: '',
          workType: 'General',
          hoursSpent: '',
          workDate: new Date().toISOString().split('T')[0],
        });
        setNewWorkLog(''); // Keep for backward compatibility
      } else {
        alert(`Failed to add work log: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to add work log: ${error.message || 'Unknown error'}`);
    }
  };

  // Parse work log description to extract work type, hours, and date
  const parseWorkLogDescription = (description: string) => {
    let workType: 'General' | 'Research' | 'Documentation' | 'Communication' | 'Analysis' | 'Preparation' | 'Review' | 'Other' = 'General';
    let hoursSpent = '';
    let workDate = new Date().toISOString().split('T')[0];
    let cleanDescription = description;

    // Extract work type from [Type] prefix
    const workTypeMatch = description.match(/^\[([^\]]+)\]\s*(.+)/);
    if (workTypeMatch) {
      const type = workTypeMatch[1];
      if (['General', 'Research', 'Documentation', 'Communication', 'Analysis', 'Preparation', 'Review', 'Other'].includes(type)) {
        workType = type as any;
      }
      cleanDescription = workTypeMatch[2];
    }

    // Extract hours from (X hour(s)) pattern
    const hoursMatch = cleanDescription.match(/\(([\d.]+)\s*hour[s]?\)/);
    if (hoursMatch) {
      hoursSpent = hoursMatch[1];
      cleanDescription = cleanDescription.replace(/\([\d.]+\s*hour[s]?\)/, '').trim();
    }

    // Extract work date from - Work Date: pattern
    const dateMatch = cleanDescription.match(/-\s*Work Date:\s*([A-Za-z]+\s+\d+,\s+\d+)/);
    if (dateMatch) {
      try {
        const dateStr = dateMatch[1];
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          workDate = date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Ignore date parsing errors
      }
      cleanDescription = cleanDescription.replace(/-\s*Work Date:\s*[A-Za-z]+\s+\d+,\s+\d+/, '').trim();
    }

    return { workType, hoursSpent, workDate, cleanDescription };
  };

  const handleEditWorkLog = (entry: TenderActivity) => {
    const parsed = parseWorkLogDescription(entry.description || '');
    setEditWorkLogForm({
      description: parsed.cleanDescription,
      workType: parsed.workType,
      hoursSpent: parsed.hoursSpent,
      workDate: parsed.workDate,
    });
    setEditingWorkLog(entry);
  };

  const handleCancelEdit = () => {
    setEditingWorkLog(null);
    setEditWorkLogForm({
      description: '',
      workType: 'General',
      hoursSpent: '',
      workDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleUpdateWorkLog = async () => {
    if (!editingWorkLog || !tender?.id || !editWorkLogForm.description.trim()) return;

    try {
      // Build description with work details (same format as add)
      let description = editWorkLogForm.description;
      if (editWorkLogForm.workType !== 'General') {
        description = `[${editWorkLogForm.workType}] ${description}`;
      }
      if (editWorkLogForm.hoursSpent) {
        description += ` (${editWorkLogForm.hoursSpent} hour${parseFloat(editWorkLogForm.hoursSpent) !== 1 ? 's' : ''})`;
      }
      if (editWorkLogForm.workDate && editWorkLogForm.workDate !== new Date().toISOString().split('T')[0]) {
        const workDate = new Date(editWorkLogForm.workDate);
        description += ` - Work Date: ${workDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }

      const response = await tenderApi.updateActivity(tender.id, editingWorkLog.id, {
        description: description,
      });

      if (response.success && response.data) {
        // Refresh activities
        await fetchActivities();
        // Reset edit form
        handleCancelEdit();
      } else {
        alert(`Failed to update work log: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to update work log: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteWorkLog = async (activityId: number) => {
    if (!tender?.id) return;

    if (!confirm('Are you sure you want to delete this work log entry? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await tenderApi.deleteActivity(tender.id, activityId);
      if (response.success) {
        // Refresh activities
        await fetchActivities();
      } else {
        alert(`Failed to delete work log: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to delete work log: ${error.message || 'Unknown error'}`);
    }
  };

  const handleAddReminderRecipient = () => {
    if (!newRecipientEmail && !newRecipientPhone) {
      alert('Please enter either an email or phone number');
      return;
    }

    if (newRecipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRecipientEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setReminderForm(prev => ({
      ...prev,
      recipients: [...prev.recipients, {
        email: newRecipientEmail || undefined,
        phoneNumber: newRecipientPhone || undefined,
      }],
    }));

    setNewRecipientEmail('');
    setNewRecipientPhone('');
  };

  const handleRemoveReminderRecipient = (index: number) => {
    setReminderForm(prev => ({
      ...prev,
      recipients: prev.recipients.filter((_, i) => i !== index),
    }));
  };

  const handleAddUserRecipient = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    setReminderForm(prev => ({
      ...prev,
      recipients: [...prev.recipients, {
        userId: user.id,
        email: user.email,
        phoneNumber: user.phone,
      }],
    }));
  };

  const handleCreateReminder = async (activityId: number) => {
    if (!reminderForm.actionRequired.trim()) {
      alert('Action required is mandatory');
      return;
    }

    if (reminderForm.recipients.length === 0) {
      alert('At least one recipient is required');
      return;
    }

    try {
      const response = await reminderApi.create(activityId, {
        actionRequired: reminderForm.actionRequired.trim(),
        dueDate: reminderForm.dueDate || undefined,
        recipients: reminderForm.recipients,
      });

      if (response.success && response.data) {
        // Refresh reminders
        await fetchReminders(activityId);
        // Reset form
        setReminderForm({
          actionRequired: '',
          dueDate: '',
          recipients: [],
        });
        setShowReminderForm(null);
        setNewRecipientEmail('');
        setNewRecipientPhone('');
      } else {
        alert(`Failed to create reminder: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to create reminder: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMarkReminderComplete = async (reminderId: number, activityId: number) => {
    try {
      const response = await reminderApi.markComplete(reminderId);
      if (response.success) {
        // Refresh reminders
        await fetchReminders(activityId);
      } else {
        alert(`Failed to mark reminder as complete: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to mark reminder as complete: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteReminder = async (reminderId: number, activityId: number) => {
    if (!confirm('Are you sure you want to delete this reminder?')) {
      return;
    }

    try {
      const response = await reminderApi.delete(reminderId);
      if (response.success) {
        // Refresh reminders
        await fetchReminders(activityId);
      } else {
        alert(`Failed to delete reminder: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to delete reminder: ${error.message || 'Unknown error'}`);
    }
  };

  const handleFileSelect = (type: 'documents' | 'technicalDocuments') => {
    if (type === 'documents') {
      fileInputRef.current?.click();
    } else {
      technicalFileInputRef.current?.click();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'documents' | 'technicalDocuments') => {
    if (!e.target.files || !e.target.files.length || !tender?.id) return;

    const file = e.target.files[0];

    // For technical documents, ensure category is loaded
    if (type === 'technicalDocuments') {
      if (categoriesLoading) {
        alert('Please wait, categories are still loading...');
        e.target.value = '';
        return;
      }
      if (!technicalCategoryId) {
        alert('Technical Documents category not found. Please ensure the category exists in the database.');
        e.target.value = '';
        return;
      }
    }

    // Client-side validation (backend also validates)
    const maxSizeMB = 10;
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`File size exceeds ${maxSizeMB}MB limit.`);
      e.target.value = '';
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('File type not allowed. Only PDF, DOC, DOCX, XLS, XLSX, JPG, PNG are permitted.');
      e.target.value = '';
      return;
    }

    setUploadingDocument(true);

    try {
      // Determine category ID based on document type
      let categoryId: number | undefined = undefined;
      if (type === 'technicalDocuments') {
        if (!technicalCategoryId) {
          throw new Error('Technical Documents category ID is missing. Please ensure the category exists in the database.');
        }
        categoryId = technicalCategoryId;
      }

      const response = await documentApi.upload(file, {
        tenderId: tender.id,
        categoryId: categoryId,
      });

      if (response.success) {
        // Refresh documents list
        await fetchDocuments();
        // Refresh activities to show the new document activity
        await fetchActivities();
      } else {
        alert(`Failed to upload document: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to upload document: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingDocument(false);
      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await documentApi.delete(docId);
      if (response.success) {
        // Refresh documents list
        await fetchDocuments();
        // Refresh activities
        await fetchActivities();
      } else {
        alert(`Failed to delete document: ${response.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      alert(`Failed to delete document: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDownloadDocument = async (docId: number, fileName: string) => {
    try {
      const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api/v1';
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/documents/${docId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to download document: ${errorData.error || response.statusText}`);
      }
    } catch (error: any) {
      alert(`Failed to download document: ${error.message || 'Unknown error'}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getAllReminders = () => {
    const all = Object.values(reminders).flat();
    return all.sort((a, b) => {
      // Pending first
      if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
      // Then by due date
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  };

  const handleCreateTask = async () => {
    if (!tender || !newTaskForm.description) return;
    try {
      // 1. Create generic "Task" activity
      const activityRes = await tenderApi.addActivity(tender.id, {
        activityType: 'Task',
        description: newTaskForm.description,
        hoursSpent: 0,
        workDate: new Date().toISOString()
      });

      if (activityRes.success && activityRes.data) {
        const activityId = activityRes.data.id;

        // 2. Create Reminder
        await reminderApi.create(activityId, {
          actionRequired: newTaskForm.description,
          dueDate: newTaskForm.dueDate,
          recipients: newTaskForm.assignedTo ? [{ userId: newTaskForm.assignedTo }] : []
        });

        // 3. Reset and Refresh
        setNewTaskForm({ description: '', dueDate: '', assignedTo: undefined });
        fetchActivities();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to create task');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-gray-100 text-gray-800',
      'Submitted': 'bg-blue-100 text-blue-800',
      'Under Review': 'bg-purple-100 text-purple-800',
      'Shortlisted': 'bg-yellow-100 text-yellow-800',
      'Won': 'bg-emerald-100 text-emerald-800',
      'Lost': 'bg-red-100 text-red-800',
      'Cancelled': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[80%] bg-white z-[50] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg">{displayTender.tenderNumber}</h2>
              <p className="text-sm text-muted-foreground">{displayTender.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {saveSuccess && (
          <div
            className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
            role="alert"
            aria-live="polite"
          >
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-green-800">{saveSuccess}</p>
          </div>
        )}
        {saveError && (
          <div
            className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-800">{saveError}</p>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 w-6 p-0"
              onClick={() => setSaveError(null)}
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-0 pt-4">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-6 p-1 bg-slate-100/50 rounded-xl mb-4">
                <TabsTrigger value="details" className="text-xs">Details</TabsTrigger>
                <TabsTrigger value="tasks" className="text-xs flex items-center gap-1.5"><ListTodo className="w-3.5 h-3.5" />Tasks</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs">Docs</TabsTrigger>
                <TabsTrigger value="technical" className="text-xs">Tech</TabsTrigger>
                <TabsTrigger value="worklog" className="text-xs">Log</TabsTrigger>
                <TabsTrigger value="auditlog" className="text-xs">Audit</TabsTrigger>
              </TabsList>

              {/* Details Tab - Condensed Card Layout */}
              <TabsContent value="details" className="space-y-4 px-1">
                {/* Top Row: Classification & Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Classification Card */}
                  <div className="bg-gradient-to-br from-indigo-50/40 to-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" />
                      Classification
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Type</Label>
                        <Select value="Tender" disabled>
                          <SelectTrigger className="h-8 text-xs bg-white/50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tender">Tender</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Status</Label>
                        <Select
                          value={editedTender.status}
                          onValueChange={(value) => setEditedTender({ ...editedTender, status: value as Tender['status'] })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white/50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Submitted">Submitted</SelectItem>
                            <SelectItem value="Under Review">Under Review</SelectItem>
                            <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                            <SelectItem value="Won">Won</SelectItem>
                            <SelectItem value="Lost">Lost</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Priority</Label>
                        <Select
                          value={editedTender.priority || 'Medium'}
                          onValueChange={(value) => setEditedTender({ ...editedTender, priority: value as Tender['priority'] })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white/50 border-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Basic Info Card */}
                  <div className="bg-gradient-to-br from-blue-50/40 to-white p-3 rounded-xl border border-blue-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Basic Information
                    </h3>
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Title</Label>
                        <Input
                          value={editedTender.title}
                          onChange={(e) => setEditedTender({ ...editedTender, title: e.target.value })}
                          className="h-8 text-xs bg-white/50 border-slate-200"
                          placeholder="Tender Title"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Client</Label>
                        <Select
                          value={editedTender.companyId?.toString() || 'none'}
                          onValueChange={(value) => setEditedTender({
                            ...editedTender,
                            companyId: value && value !== 'none' ? parseInt(value) : undefined,
                          })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white/50 border-slate-200">
                            <SelectValue placeholder="Select Client" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {companies.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Second Row: Financials & Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Description - Spans 2 cols */}
                  <div className="md:col-span-2 bg-gradient-to-br from-slate-50/60 to-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <List className="w-3.5 h-3.5 text-slate-600" />
                      Description
                    </h3>
                    <Textarea
                      value={editedTender.description}
                      onChange={(e) => setEditedTender({ ...editedTender, description: e.target.value })}
                      className="min-h-[80px] text-xs bg-white/50 border-slate-200 resize-none"
                      placeholder="Detailed description of the tender..."
                    />
                  </div>

                  {/* Financials - Spans 1 col */}
                  <div className="md:col-span-1 bg-gradient-to-br from-emerald-50/40 to-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      Financials
                    </h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Est. Value</Label>
                          <Input
                            type="number"
                            value={editedTender.estimatedValue || ''}
                            onChange={(e) => setEditedTender({ ...editedTender, estimatedValue: parseFloat(e.target.value) })}
                            className="h-8 text-xs bg-white/50"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Due Date</Label>
                          <Input
                            type="date"
                            value={editedTender.dueDate ? new Date(editedTender.dueDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => setEditedTender({ ...editedTender, dueDate: e.target.value })}
                            className="h-8 text-xs bg-white/50"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">EMD</Label>
                          <Input
                            type="number"
                            value={editedTender.emdAmount || ''}
                            onChange={(e) => setEditedTender({ ...editedTender, emdAmount: parseFloat(e.target.value) })}
                            className="h-8 text-xs bg-white/50"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Fees</Label>
                          <Input
                            type="number"
                            value={editedTender.tenderFees || ''}
                            onChange={(e) => setEditedTender({ ...editedTender, tenderFees: parseFloat(e.target.value) })}
                            className="h-8 text-xs bg-white/50"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="grid grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">Created By</p>
                    <p className="text-[11px] font-medium text-slate-700 truncate">{editedTender.createdBy}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">Created At</p>
                    <p className="text-[11px] font-medium text-slate-700">{safeDate(editedTender.createdAt)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">Updated By</p>
                    <p className="text-[11px] font-medium text-slate-700 truncate">{editedTender.updatedBy}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs uppercase tracking-wide text-slate-400 font-bold">Updated At</p>
                    <p className="text-[11px] font-medium text-slate-700">{safeDate(editedTender.updatedAt)}</p>
                  </div>
                </div>
              </TabsContent>

              {/* TASKS TAB (RESTORED) */}
              <TabsContent value="tasks" className="space-y-4 px-1">
                {/* Create Task Form */}
                <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <List className="w-3.5 h-3.5 text-indigo-600" />
                    New Task
                  </h3>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Description</Label>
                      <Input
                        value={newTaskForm.description}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                        placeholder="What needs to be done?"
                        className="h-9 text-xs"
                        aria-label="Task Description"
                      />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Due Date</Label>
                      <Input
                        type="date"
                        value={newTaskForm.dueDate}
                        onChange={(e) => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                        className="h-9 text-xs"
                        aria-label="Task Due Date"
                      />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Assign To</Label>
                      <Select
                        value={newTaskForm.assignedTo?.toString()}
                        onValueChange={(val) => setNewTaskForm({ ...newTaskForm, assignedTo: val ? parseInt(val) : undefined })}
                      >
                        <SelectTrigger className="h-9 text-xs" aria-label="Assign To">
                          <SelectValue placeholder="Me" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleCreateTask} size="sm" className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold shadow-sm" aria-label="Add Task">
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-2">
                  {getAllReminders().length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">No tasks found. Create one above!</p>
                    </div>
                  ) : (
                    getAllReminders().map((reminder) => (
                      <div key={reminder.id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${reminder.isCompleted ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm'}`}>
                        <div className="flex items-start gap-3">
                          <button
                            onClick={async () => {
                              try {
                                // Optimistic update
                                const newStatus = !reminder.isCompleted;
                                const logId = Object.keys(reminders).find(key => reminders[parseInt(key)].find(r => r.id === reminder.id));
                                if (logId) {
                                  await reminderApi.markComplete(reminder.id, newStatus);
                                  fetchReminders(parseInt(logId));
                                }
                              } catch (e) { console.error(e); }
                            }}
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${reminder.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 hover:border-indigo-400 text-transparent'}`}
                            aria-label={reminder.isCompleted ? "Mark incomplete" : "Mark complete"}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                          </button>
                          <div>
                            <p className={`text-xs font-medium ${reminder.isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{reminder.actionRequired}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${reminder.isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {reminder.isCompleted ? 'Completed' : 'Pending'}
                              </span>
                              {reminder.dueDate && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {safeDate(reminder.dueDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600" onClick={async () => {
                          if (confirm('Delete task?')) {
                            try {
                              await reminderApi.delete(reminder.id);
                              fetchActivities();
                            } catch (e) { }
                          }
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Tender Documents Tab */}
              <TabsContent value="documents" className="space-y-4 mt-6 px-6">
                <div className="flex items-center justify-between">
                  <h3>Tender Documents</h3>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'documents')}
                      aria-label="Select tender document to upload"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleFileSelect('documents')}
                      disabled={uploadingDocument || loadingDocuments}
                      aria-label="Upload tender document"
                      aria-busy={uploadingDocument}
                    >
                      {uploadingDocument ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                      )}
                      <span aria-live="polite">{uploadingDocument ? 'Uploading...' : 'Upload Document'}</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {loadingDocuments ? (
                    <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" aria-hidden="true" />
                      <p>Loading documents...</p>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg" role="status">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
                      <p>No tender documents uploaded yet</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleFileSelect('documents')}
                        disabled={uploadingDocument}
                        aria-label="Upload your first tender document"
                      >
                        Upload your first document
                      </Button>
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.originalName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(doc.fileSize)} • {(doc as any).uploadedByName || 'Unknown'} • {safeDate(doc.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadDocument(doc.id, doc.originalName)}
                            aria-label={`Download ${doc.originalName}`}
                            title="Download document"
                          >
                            <Download className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument(doc.id)}
                            aria-label={`Delete ${doc.originalName}`}
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Technical Documents Tab */}
              <TabsContent value="technical" className="space-y-4 mt-6 px-6">
                <div className="flex items-center justify-between">
                  <h3>Technical Documents</h3>
                  <div className="flex items-center gap-2">
                    <input
                      ref={technicalFileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(e, 'technicalDocuments')}
                      aria-label="Select technical document to upload"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleFileSelect('technicalDocuments')}
                      disabled={uploadingDocument || loadingDocuments || categoriesLoading || !technicalCategoryId}
                      aria-label="Upload technical document"
                      aria-busy={uploadingDocument || categoriesLoading}
                      title={!technicalCategoryId ? 'Technical Documents category not available' : ''}
                    >
                      {uploadingDocument || categoriesLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                      )}
                      <span aria-live="polite">
                        {categoriesLoading ? 'Loading...' : uploadingDocument ? 'Uploading...' : 'Upload Document'}
                      </span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {loadingDocuments ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Loading documents...</p>
                    </div>
                  ) : technicalDocuments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg" role="status">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" aria-hidden="true" />
                      <p>No technical documents uploaded yet</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleFileSelect('technicalDocuments')}
                        disabled={uploadingDocument}
                        aria-label="Upload your first technical document"
                      >
                        Upload your first document
                      </Button>
                    </div>
                  ) : (
                    technicalDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{doc.originalName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(doc.fileSize)} • {(doc as any).uploadedByName || 'Unknown'} • {safeDate(doc.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadDocument(doc.id, doc.originalName)}
                            aria-label={`Download ${doc.originalName}`}
                            title="Download document"
                          >
                            <Download className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteDocument(doc.id)}
                            aria-label={`Delete ${doc.originalName}`}
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Work Log Tab */}
              <TabsContent value="worklog" className="space-y-6 mt-6 px-6">
                {/* Add Work Log Entry Form */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Add Work Log Entry</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="workType">Work Type</Label>
                        <Select
                          value={workLogForm.workType}
                          onValueChange={(value) =>
                            setWorkLogForm({ ...workLogForm, workType: value as any })
                          }
                        >
                          <SelectTrigger id="workType">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Research">Research</SelectItem>
                            <SelectItem value="Documentation">Documentation</SelectItem>
                            <SelectItem value="Communication">Communication</SelectItem>
                            <SelectItem value="Analysis">Analysis</SelectItem>
                            <SelectItem value="Preparation">Preparation</SelectItem>
                            <SelectItem value="Review">Review</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="workDate">Work Date</Label>
                        <Input
                          id="workDate"
                          type="date"
                          value={workLogForm.workDate}
                          onChange={(e) =>
                            setWorkLogForm({ ...workLogForm, workDate: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hoursSpent">Hours Spent (Optional)</Label>
                        <Input
                          id="hoursSpent"
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="e.g., 2.5"
                          value={workLogForm.hoursSpent}
                          onChange={(e) =>
                            setWorkLogForm({ ...workLogForm, hoursSpent: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <div className="text-xs text-muted-foreground mt-1">
                          Describe the work done on this tender
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        id="description"
                        placeholder="Describe the work done, updates made, or progress achieved..."
                        value={workLogForm.description}
                        onChange={(e) =>
                          setWorkLogForm({ ...workLogForm, description: e.target.value })
                        }
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setWorkLogForm({
                            description: '',
                            workType: 'General',
                            hoursSpent: '',
                            workDate: new Date().toISOString().split('T')[0],
                          });
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        onClick={handleAddWorkLog}
                        disabled={!workLogForm.description.trim()}
                        className="min-w-[120px]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Add Entry
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Work Timeline */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Work Timeline
                  </h3>
                  {workLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-gray-200">
                      <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-base font-medium">No work log entries yet</p>
                      <p className="text-sm mt-1">Start tracking work by adding your first entry above</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-300 to-indigo-200" />

                      <div className="space-y-6">
                        {workLogs.map((entry, index) => {
                          const entryDate = new Date(entry.createdAt);
                          const isToday = entryDate.toDateString() === new Date().toDateString();
                          const isYesterday = entryDate.toDateString() === new Date(Date.now() - 86400000).toDateString();

                          return (
                            <div key={entry.id} className="relative pl-14">
                              {/* Timeline dot */}
                              <div className="absolute left-4 top-2 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-md z-10" />

                              {/* Entry card */}
                              <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-4">
                                  {/* Header */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <Badge className={`${getStatusColor(entry.activityType)} text-xs font-semibold`}>
                                        {entry.activityType}
                                      </Badge>
                                      <div className="flex items-center gap-2 text-sm">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                                          <User className="w-3.5 h-3.5 text-indigo-600" />
                                        </div>
                                        <span className="font-semibold text-gray-900">
                                          {entry.user?.fullName || 'System User'}
                                        </span>
                                        {entry.user?.email && (
                                          <span className="text-xs text-muted-foreground">
                                            ({entry.user.email})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span className="font-medium">
                                          {isToday
                                            ? 'Today'
                                            : isYesterday
                                              ? 'Yesterday'
                                              : entryDate.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: entryDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                              })
                                          }
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {entryDate.toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Description or Edit Form */}
                                  {editingWorkLog?.id === entry.id ? (
                                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="editWorkType">Work Type</Label>
                                          <Select
                                            value={editWorkLogForm.workType}
                                            onValueChange={(value) =>
                                              setEditWorkLogForm({ ...editWorkLogForm, workType: value as any })
                                            }
                                          >
                                            <SelectTrigger id="editWorkType">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="General">General</SelectItem>
                                              <SelectItem value="Research">Research</SelectItem>
                                              <SelectItem value="Documentation">Documentation</SelectItem>
                                              <SelectItem value="Communication">Communication</SelectItem>
                                              <SelectItem value="Analysis">Analysis</SelectItem>
                                              <SelectItem value="Preparation">Preparation</SelectItem>
                                              <SelectItem value="Review">Review</SelectItem>
                                              <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="editWorkDate">Work Date</Label>
                                          <Input
                                            id="editWorkDate"
                                            type="date"
                                            value={editWorkLogForm.workDate}
                                            onChange={(e) =>
                                              setEditWorkLogForm({ ...editWorkLogForm, workDate: e.target.value })
                                            }
                                          />
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="editHoursSpent">Hours Spent (Optional)</Label>
                                        <Input
                                          id="editHoursSpent"
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          placeholder="e.g., 2.5"
                                          value={editWorkLogForm.hoursSpent}
                                          onChange={(e) =>
                                            setEditWorkLogForm({ ...editWorkLogForm, hoursSpent: e.target.value })
                                          }
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="editDescription">Description *</Label>
                                        <Textarea
                                          id="editDescription"
                                          placeholder="Describe the work done, updates made, or progress achieved..."
                                          value={editWorkLogForm.description}
                                          onChange={(e) =>
                                            setEditWorkLogForm({ ...editWorkLogForm, description: e.target.value })
                                          }
                                          rows={4}
                                          className="resize-none"
                                        />
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={handleCancelEdit}
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={handleUpdateWorkLog}
                                          disabled={!editWorkLogForm.description.trim()}
                                        >
                                          <Save className="w-4 h-4 mr-2" />
                                          Save Changes
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      {entry.description && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {entry.description}
                                          </p>
                                        </div>
                                      )}

                                      {/* Reminders Section */}
                                      {reminders[entry.id] && reminders[entry.id].length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-amber-600" />
                                            Reminders ({reminders[entry.id].filter(r => !r.isCompleted).length} pending)
                                          </h4>
                                          <div className="space-y-2">
                                            {reminders[entry.id].map((reminder) => (
                                              <div
                                                key={reminder.id}
                                                className={`p-3 rounded-lg border ${reminder.isCompleted
                                                  ? 'bg-green-50 border-green-200'
                                                  : 'bg-amber-50 border-amber-200'
                                                  }`}
                                              >
                                                <div className="flex items-start justify-between">
                                                  <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      {reminder.isCompleted ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                      ) : (
                                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                                      )}
                                                      <span className={`text-sm font-medium ${reminder.isCompleted ? 'text-green-800 line-through' : 'text-amber-800'
                                                        }`}>
                                                        {reminder.actionRequired}
                                                      </span>
                                                    </div>
                                                    {reminder.dueDate && (
                                                      <p className="text-xs text-muted-foreground">
                                                        Due: {new Date(reminder.dueDate).toLocaleDateString('en-US', {
                                                          month: 'short',
                                                          day: 'numeric',
                                                          year: 'numeric',
                                                        })}
                                                      </p>
                                                    )}
                                                    {reminder.recipients && reminder.recipients.length > 0 && (
                                                      <div className="mt-1 flex flex-wrap gap-1">
                                                        {reminder.recipients.map((rec, idx) => (
                                                          <Badge key={idx} variant="outline" className="text-xs">
                                                            {rec.user?.fullName || rec.email || rec.phoneNumber}
                                                          </Badge>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                  {!reminder.isCompleted && (
                                                    <div className="flex gap-1">
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleMarkReminderComplete(reminder.id, entry.id)}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-100"
                                                        title="Mark as complete"
                                                      >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                      </Button>
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteReminder(reminder.id, entry.id)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                                        title="Delete reminder"
                                                      >
                                                        <Trash2 className="w-4 h-4" />
                                                      </Button>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Edit, Delete, and Add Reminder Buttons for Work Logs */}
                                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setShowReminderForm(entry.id);
                                            setReminderForm({
                                              actionRequired: '',
                                              dueDate: '',
                                              recipients: [],
                                            });
                                          }}
                                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                          title="Add Reminder"
                                        >
                                          <Bell className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditWorkLog(entry)}
                                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                        >
                                          <Pencil className="w-4 h-4 mr-2" />
                                          Edit
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteWorkLog(entry.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        >
                                          <Trash2 className="w-4 h-4 mr-2" />
                                          Delete
                                        </Button>
                                      </div>

                                      {/* Reminder Form Modal */}
                                      {showReminderForm === entry.id && (
                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                          <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className="space-y-2">
                                              <Label htmlFor="actionRequired">Action Required *</Label>
                                              <Textarea
                                                id="actionRequired"
                                                placeholder="Describe the action that needs to be completed..."
                                                value={reminderForm.actionRequired}
                                                onChange={(e) =>
                                                  setReminderForm({ ...reminderForm, actionRequired: e.target.value })
                                                }
                                                rows={2}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor="dueDate">Due Date (Optional)</Label>
                                              <Input
                                                id="dueDate"
                                                type="date"
                                                value={reminderForm.dueDate}
                                                onChange={(e) =>
                                                  setReminderForm({ ...reminderForm, dueDate: e.target.value })
                                                }
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label>Recipients *</Label>
                                              <div className="space-y-2">
                                                {reminderForm.recipients.map((recipient, index) => (
                                                  <div
                                                    key={index}
                                                    className="flex items-center gap-2 p-2 bg-white rounded border"
                                                  >
                                                    {recipient.user?.fullName && (
                                                      <Badge variant="outline">{recipient.user.fullName}</Badge>
                                                    )}
                                                    {recipient.email && (
                                                      <Badge variant="outline" className="flex items-center gap-1">
                                                        <Mail className="w-3 h-3" />
                                                        {recipient.email}
                                                      </Badge>
                                                    )}
                                                    {recipient.phoneNumber && (
                                                      <Badge variant="outline" className="flex items-center gap-1">
                                                        <Phone className="w-3 h-3" />
                                                        {recipient.phoneNumber}
                                                      </Badge>
                                                    )}
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      onClick={() => handleRemoveReminderRecipient(index)}
                                                      className="ml-auto h-6 w-6 p-0"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </Button>
                                                  </div>
                                                ))}
                                              </div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <Input
                                                  type="email"
                                                  placeholder="Email address"
                                                  value={newRecipientEmail}
                                                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                                                  onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      handleAddReminderRecipient();
                                                    }
                                                  }}
                                                />
                                                <Input
                                                  type="tel"
                                                  placeholder="Phone number"
                                                  value={newRecipientPhone}
                                                  onChange={(e) => setNewRecipientPhone(e.target.value)}
                                                  onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      handleAddReminderRecipient();
                                                    }
                                                  }}
                                                />
                                              </div>
                                              <div className="flex gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={handleAddReminderRecipient}
                                                  className="flex-1"
                                                >
                                                  <Plus className="w-4 h-4 mr-2" />
                                                  Add Email/Phone
                                                </Button>
                                                <Select
                                                  onValueChange={(value) => handleAddUserRecipient(parseInt(value))}
                                                >
                                                  <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Add User" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {users.map((user) => (
                                                      <SelectItem key={user.id} value={user.id.toString()}>
                                                        {user.fullName} ({user.email})
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            </div>
                                            <div className="flex justify-end gap-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setShowReminderForm(null);
                                                  setReminderForm({
                                                    actionRequired: '',
                                                    dueDate: '',
                                                    recipients: [],
                                                  });
                                                  setNewRecipientEmail('');
                                                  setNewRecipientPhone('');
                                                }}
                                              >
                                                Cancel
                                              </Button>
                                              <Button
                                                size="sm"
                                                onClick={() => handleCreateReminder(entry.id)}
                                                disabled={!reminderForm.actionRequired.trim() || reminderForm.recipients.length === 0}
                                              >
                                                <Bell className="w-4 h-4 mr-2" />
                                                Create Reminder
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Audit Log Tab */}
              <TabsContent value="auditlog" className="space-y-6 mt-6 px-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Audit Log
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    System-generated logs showing all changes and activities on this tender. These logs are permanent and cannot be deleted.
                  </p>
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                      <p className="text-base font-medium">No audit log entries yet</p>
                      <p className="text-sm mt-1">System activities will appear here automatically</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-blue-300 to-blue-200" />

                      <div className="space-y-6">
                        {auditLogs.map((entry, index) => {
                          const entryDate = new Date(entry.createdAt);
                          const isToday = entryDate.toDateString() === new Date().toDateString();
                          const isYesterday = entryDate.toDateString() === new Date(Date.now() - 86400000).toDateString();

                          return (
                            <div key={entry.id} className="relative pl-14">
                              {/* Timeline dot */}
                              <div className="absolute left-4 top-2 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md z-10" />

                              {/* Entry card */}
                              <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-4">
                                  {/* Header */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3 flex-1">
                                      <Badge className={`${getStatusColor(entry.activityType)} text-xs font-semibold`}>
                                        {entry.activityType}
                                      </Badge>
                                      <div className="flex items-center gap-2 text-sm">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                          <User className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <span className="font-semibold text-gray-900">
                                          {entry.user?.fullName || 'System User'}
                                        </span>
                                        {entry.user?.email && (
                                          <span className="text-xs text-muted-foreground">
                                            ({entry.user.email})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="w-3 h-3" />
                                        <span className="font-medium">
                                          {isToday
                                            ? 'Today'
                                            : isYesterday
                                              ? 'Yesterday'
                                              : entryDate.toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: entryDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                                              })
                                          }
                                        </span>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {entryDate.toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Description */}
                                  {entry.description && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                        {entry.description}
                                      </p>
                                    </div>
                                  )}

                                  {/* Value Changes - Always show for audit logs */}
                                  {(entry.oldValue || entry.newValue) && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                      <div className="grid grid-cols-2 gap-3">
                                        {entry.oldValue && (
                                          <div>
                                            <span className="text-xs font-semibold text-red-700 mb-1 block">Previous Value:</span>
                                            <p className="text-xs text-gray-700 bg-red-50 px-2 py-1.5 rounded border border-red-100">
                                              {entry.oldValue}
                                            </p>
                                          </div>
                                        )}
                                        {entry.newValue && (
                                          <div>
                                            <span className="text-xs font-semibold text-green-700 mb-1 block">New Value:</span>
                                            <p className="text-xs text-gray-700 bg-green-50 px-2 py-1.5 rounded border border-green-100">
                                              {entry.newValue}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

    </>
  );
}