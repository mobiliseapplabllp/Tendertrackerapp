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
import type { Tender, TenderActivity, Document, Company, WorkLogReminder, User as UserType, ProductLine } from '../lib/types';
import { documentApi, tenderApi, companyApi, reminderApi, userApi, productLineApi } from '../lib/api';
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
  ArrowLeft,
  Eye,
  Sparkles,
  MessageCircle,
  Send,
} from 'lucide-react';

interface TenderDetailsPageProps {
  tenderId: number;
  onBack: () => void;
  onUpdate: (tender: Tender) => void;
}

export function TenderDetailsPage({ tenderId, onBack, onUpdate }: TenderDetailsPageProps) {
  const [tender, setTender] = useState<Tender | null>(null);
  const [editedTender, setEditedTender] = useState<Tender | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
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
  const [users, setUsers] = useState<UserType[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const technicalFileInputRef = useRef<HTMLInputElement>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Fetch tender data when component mounts or tenderId changes
  useEffect(() => {
    fetchTender();
  }, [tenderId]);

  // Fetch companies and product lines on mount
  useEffect(() => {
    fetchCompanies();
    fetchUsers();
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

  const fetchTender = async () => {
    try {
      setLoading(true);
      const response = await tenderApi.getById(tenderId);
      if (response.success && response.data) {
        const tenderData = response.data;
        setTender(tenderData);
        setEditedTender({
          ...tenderData,
          dueDate: tenderData.submissionDeadline || tenderData.dueDate,
        });
        // Load AI summary from database if available
        if (tenderData.aiSummary) {
          setAiSummary(tenderData.aiSummary);
        }
      } else {
        console.error('Failed to fetch tender:', response.error);
        setTender(null);
        setEditedTender(null);
      }
    } catch (error: any) {
      console.error('Error fetching tender:', error);
      setTender(null);
      setEditedTender(null);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchUsers = async () => {
    try {
      const response = await userApi.getAll();
      if (response.success && response.data) {
        const usersData = response.data.data || response.data || [];
        setUsers(usersData);
      }
    } catch (err: any) {
      // Error handled silently
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
    fetchCategories();
  }, []);

  // Fetch documents and activities when tender is loaded
  useEffect(() => {
    if (tender && tender.id) {
      fetchDocuments();
      fetchActivities();
    }
  }, [tender, technicalCategoryId]);

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

        // Fetch reminders for each work log
        for (const workLog of workLogsList) {
          await fetchReminders(workLog.id);
        }
      }
    } catch (error) {
      // Error fetching activities - will be handled by UI state
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!tender || !editedTender) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Tender not found</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tenders
          </Button>
        </div>
      </div>
    );
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
      if (editedTender.productLineId !== undefined) updatePayload.productLineId = editedTender.productLineId;
      if (editedTender.subCategory !== undefined) updatePayload.subCategory = editedTender.subCategory;

      // Call the API directly instead of using onUpdate to avoid sending invalid fields
      const response = await tenderApi.update(tender.id, updatePayload);

      if (response.success && response.data) {
        // Update the local state with the response
        onUpdate(response.data);
        setSaveSuccess('Tender updated successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(null), 3000);

        // Handle desktop notification if enabled
        const notification = (response as any).notification;
        if (notification?.desktopNotification) {
          const { showDesktopNotification } = await import('../lib/settings');
          await showDesktopNotification(
            'Tender Updated',
            `Tender "${response.data.title || response.data.tenderNumber}" has been updated successfully.`,
            'tender_updated',
            { tag: `tender-update-${response.data.id}` }
          );
        }
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

        // Handle desktop notification if enabled
        const notification = (response as any).notification;
        if (notification?.desktopNotification) {
          const { showDesktopNotification } = await import('../lib/settings');
          await showDesktopNotification(
            'Work Log Added',
            `A new work log entry has been added to tender "${tender.title || tender.tenderNumber}".`,
            'worklog_created',
            { tag: `worklog-${response.data.id}` }
          );
        }
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

    if (newRecipientEmail && !new RegExp('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$').test(newRecipientEmail)) {
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

  const handleViewDocument = async (docId: number) => {
    try {
      await documentApi.view(docId);
    } catch (error: any) {
      alert(`Failed to view document: ${error.message || 'Unknown error'}`);
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
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Format AI summary text for better readability
  const formatSummaryText = (text: string): string => {
    if (!text) return '';

    // Remove markdown formatting
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/#{1,6}\s*(.*)/g, '$1') // Remove headers
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
      .replace(/\*\s+/g, '- ') // Convert asterisk bullets to dashes
      .replace(/^\d+\.\s+/gm, '') // Keep numbered lists but clean them
      .trim();

    // Ensure proper spacing around section headers (ALL CAPS with optional colon)
    formatted = formatted.replace(/([A-Z][A-Z\s&]+:?)\s*\n/g, '\n\n$1\n\n');

    // Clean up multiple consecutive newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Ensure bullet points start on new lines
    formatted = formatted.replace(/\n\s*[-•]\s+/g, '\n- ');

    return formatted;
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
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{editedTender.tenderNumber}</h1>
            <p className="text-sm text-muted-foreground">{editedTender.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              if (confirm('Convert this Tender to a Lead? It will move to the Lead Dashboard.')) {
                try {
                  // 2 = Lead
                  const response = await tenderApi.update(tenderId, { leadTypeId: 2 });
                  if (response.success) {
                    alert('Converted to Lead successfully');
                    onBack();
                  }
                } catch (e) {
                  alert('Failed to convert');
                }
              }
            }}
          >
            Convert to Lead
          </Button>
          <Button onClick={() => setEditingTender(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Tender
          </Button>
          {saveSuccess && (
            <div className="px-4 py-2 bg-green-50 text-green-800 rounded-lg text-sm">
              {saveSuccess}
            </div>
          )}
          {saveError && (
            <div className="px-4 py-2 bg-red-50 text-red-800 rounded-lg text-sm">
              {saveError}
            </div>
          )}
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
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList>
              <TabsTrigger value="details">
                <FileText className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="aisummary">
                <Sparkles className="w-4 h-4" />
                AI Summary
              </TabsTrigger>
              <TabsTrigger value="documents">
                <Folder className="w-4 h-4" />
                Tender Documents
              </TabsTrigger>
              <TabsTrigger value="technical">
                <FileText className="w-4 h-4" />
                Technical Docs
              </TabsTrigger>
              <TabsTrigger value="worklog">
                <List className="w-4 h-4" />
                Work Log
              </TabsTrigger>
              <TabsTrigger value="auditlog">
                <FileText className="w-4 h-4" />
                Audit Log
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editedTender.status}
                    onValueChange={(value) =>
                      setEditedTender({
                        ...editedTender,
                        status: value as Tender['status'],
                      })
                    }
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={editedTender.dueDate ? new Date(editedTender.dueDate).toISOString().split('T')[0] : ''}
                    onChange={(e) =>
                      setEditedTender({
                        ...editedTender,
                        dueDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={editedTender.title}
                  onChange={(e) =>
                    setEditedTender({
                      ...editedTender,
                      title: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editedTender.description}
                  onChange={(e) =>
                    setEditedTender({
                      ...editedTender,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Client (Company)</Label>
                  <Select
                    value={editedTender.companyId?.toString() || 'none'}
                    onValueChange={(value) =>
                      setEditedTender({
                        ...editedTender,
                        companyId: value && value !== 'none' ? parseInt(value) : undefined,
                      })
                    }
                    disabled={loadingCompanies}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCompanies ? "Loading companies..." : "Select a company"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No Company)</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id.toString()}>
                          {company.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estimated Value</Label>
                  <Input
                    type="number"
                    value={editedTender.estimatedValue || ''}
                    onChange={(e) =>
                      setEditedTender({
                        ...editedTender,
                        estimatedValue: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Product Line</Label>
                  <Select
                    value={editedTender.productLineId?.toString() || 'none'}
                    onValueChange={(value) =>
                      setEditedTender({
                        ...editedTender,
                        productLineId: value && value !== 'none' ? parseInt(value, 10) : undefined,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product line" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {productLines.map((pl) => (
                        <SelectItem key={pl.id} value={pl.id.toString()}>
                          {pl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sub Category</Label>
                  <Select
                    value={editedTender.subCategory || 'none'}
                    onValueChange={(value) =>
                      setEditedTender({
                        ...editedTender,
                        subCategory: value === 'none' ? undefined : value as any,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Hardware">Hardware</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <Label>EMD (Earnest Money Deposit)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editedTender.emdAmount !== undefined && editedTender.emdAmount !== null ? editedTender.emdAmount : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditedTender({
                        ...editedTender,
                        emdAmount: value !== '' ? (parseFloat(value) || 0) : undefined,
                      });
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Money deposited for participating</p>
                </div>

                <div className="space-y-1">
                  <Label>Tender Fees</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editedTender.tenderFees !== undefined && editedTender.tenderFees !== null ? editedTender.tenderFees : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEditedTender({
                        ...editedTender,
                        tenderFees: value !== '' ? (parseFloat(value) || 0) : undefined,
                      });
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Cost of participating in tender</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Created By</span>
                  </div>
                  <p>{editedTender.createdBy}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Created At</span>
                  </div>
                  <p>{editedTender.createdAt ? new Date(editedTender.createdAt).toLocaleString() : 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Updated By</span>
                  </div>
                  <p>{editedTender.updatedBy}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Updated At</span>
                  </div>
                  <p>{editedTender.updatedAt ? new Date(editedTender.updatedAt).toLocaleString() : 'N/A'}</p>
                </div>
              </div>
            </TabsContent>

            {/* Tender Documents Tab */}
            <TabsContent value="documents" className="space-y-4 mt-6">
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
                            {formatFileSize(doc.fileSize)} • {(doc as any).uploadedByName || 'Unknown'} • {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDocument(doc.id)}
                          aria-label={`View ${doc.originalName}`}
                          title="View document"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </Button>
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
            <TabsContent value="technical" className="space-y-4 mt-6">
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
                            {formatFileSize(doc.fileSize)} • {(doc as any).uploadedByName || 'Unknown'} • {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDocument(doc.id)}
                          aria-label={`View ${doc.originalName}`}
                          title="View document"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Eye className="w-4 h-4" aria-hidden="true" />
                        </Button>
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
            <TabsContent value="worklog" className="space-y-6 mt-6">
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
            <TabsContent value="auditlog" className="space-y-6 mt-6">
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

            {/* AI Summary Tab */}
            <TabsContent value="aisummary" className="space-y-6 mt-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2 mb-1">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      AI Tender Summary
                    </h3>
                    <p className="text-sm text-indigo-700">
                      Generate a comprehensive executive summary including all tender documents
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowChatPanel(true)}
                      className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Chat
                    </Button>
                    {!generatingSummary && (
                      <Button
                        onClick={async () => {
                          if (!tender?.id) return;
                          if (aiSummary && !confirm('Generate a new summary? This will replace the current one.')) {
                            return;
                          }
                          setGeneratingSummary(true);
                          try {
                            const response = await tenderApi.generateSummary(tender.id);
                            if (response.success && response.data) {
                              setAiSummary(response.data.summary);
                              // Refresh tender data to get updated summary from DB
                              await fetchTender();
                            } else {
                              alert('Failed to generate summary: ' + (response.error || 'Unknown error'));
                            }
                          } catch (error: any) {
                            alert('Error generating summary: ' + error.message);
                          } finally {
                            setGeneratingSummary(false);
                          }
                        }}
                        disabled={generatingSummary}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {generatingSummary ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating Summary...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            {aiSummary ? 'Regenerate Summary' : 'Generate AI Summary'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {generatingSummary && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto text-indigo-600 mb-4" />
                      <p className="text-indigo-700 font-medium">Analyzing tender and documents...</p>
                      <p className="text-sm text-indigo-600 mt-2">This may take a few moments</p>
                    </div>
                  </div>
                )}

                {!generatingSummary && !aiSummary && (
                  <div className="text-center py-12">
                    <Sparkles className="w-16 h-16 mx-auto text-indigo-300 mb-4" />
                    <p className="text-indigo-800 font-medium mb-2">No summary generated yet</p>
                    <p className="text-sm text-indigo-600 mb-4">
                      Click the button above to generate a comprehensive AI-powered summary
                    </p>
                    <div className="bg-white/70 p-4 rounded-lg border border-indigo-200 text-left max-w-2xl mx-auto">
                      <p className="text-xs font-semibold text-indigo-900 mb-2">What's included:</p>
                      <ul className="text-xs text-indigo-700 space-y-1 list-disc list-inside">
                        <li>Tender overview and key details</li>
                        <li>Financial analysis (EMD, fees, value)</li>
                        <li>Timeline and critical deadlines</li>
                        <li>Eligibility requirements</li>
                        <li>Content from all uploaded documents</li>
                        <li>Risk assessment and recommendations</li>
                      </ul>
                    </div>
                  </div>
                )}

                {!generatingSummary && aiSummary && (
                  <div className="bg-white rounded-lg border border-indigo-200 p-6 mt-6">
                    <div className="prose prose-lg max-w-none">
                      {(() => {
                        const formattedText = formatSummaryText(aiSummary);
                        const sections = formattedText.split(/\n\n+/).filter(s => s.trim());

                        return (
                          <div className="space-y-6">
                            {sections.map((section, index) => {
                              const trimmedSection = section.trim();

                              const headerMatch = trimmedSection.match(/^([A-Z][A-Z\s&]+):?\s*$/);
                              if (headerMatch) {
                                return (
                                  <div key={index} className="mt-8 first:mt-0">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-indigo-200">
                                      {trimmedSection.replace(/:\s*$/, '')}
                                    </h2>
                                  </div>
                                );
                              }

                              if (trimmedSection.includes('\n-') || trimmedSection.includes('\n•')) {
                                const lines = trimmedSection.split('\n').filter(l => l.trim());
                                const bulletItems = lines.filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'));
                                const regularLines = lines.filter(l => !l.trim().startsWith('-') && !l.trim().startsWith('•'));

                                return (
                                  <div key={index} className="space-y-3">
                                    {regularLines.map((line, lineIndex) => (
                                      <p key={lineIndex} className="text-base text-gray-800 leading-7 mb-3">
                                        {line.trim()}
                                      </p>
                                    ))}
                                    {bulletItems.length > 0 && (
                                      <ul className="list-none space-y-2 ml-0 pl-6">
                                        {bulletItems.map((item, itemIndex) => (
                                          <li key={itemIndex} className="text-base text-gray-800 leading-7 relative pl-6 before:content-['•'] before:absolute before:left-0 before:text-indigo-600 before:font-bold before:text-xl">
                                            {item.replace(/^[-•]\s*/, '').trim()}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                );
                              }

                              if (/^\d+\.\s/.test(trimmedSection)) {
                                const items = trimmedSection.split(/\n(?=\d+\.\s)/).filter(i => i.trim());
                                return (
                                  <ol key={index} className="list-decimal list-inside space-y-2 ml-4">
                                    {items.map((item, itemIndex) => (
                                      <li key={itemIndex} className="text-base text-gray-800 leading-7">
                                        {item.replace(/^\d+\.\s*/, '').trim()}
                                      </li>
                                    ))}
                                  </ol>
                                );
                              }

                              if (trimmedSection) {
                                return (
                                  <p key={index} className="text-base text-gray-800 leading-7 mb-4 text-justify">
                                    {trimmedSection}
                                  </p>
                                );
                              }

                              return null;
                            })}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (!aiSummary) return;
                          const formattedText = formatSummaryText(aiSummary);
                          const blob = new Blob([formattedText], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `Tender_Summary_${tender?.tender_number || tender?.id || 'summary'}_${new Date().toISOString().split('T')[0]}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
                        className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Summary
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowEmailDialog(true)}
                        className="text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send via Email
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Chat Side Panel */}
      {showChatPanel && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowChatPanel(false)}
          />
          {/* Side Panel */}
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-indigo-900">AI Chat Assistant</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChatPanel(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="px-6 py-2 text-sm text-indigo-700 border-b">
              Ask questions about this tender. The AI has access to all tender information and uploaded documents.
            </p>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4 overflow-y-auto">
              {chatMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center px-4">
                  <div>
                    <MessageCircle className="w-12 h-12 mx-auto text-indigo-300 mb-4" />
                    <p className="text-gray-500 font-medium">Start a conversation about this tender</p>
                    <p className="text-sm text-gray-500 mt-2 mb-4">I can help you understand:</p>
                    <div className="space-y-2 text-left max-w-xs mx-auto">
                      <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-700">• Key requirements & eligibility</div>
                      <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-700">• Financial details & deadlines</div>
                      <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-700">• Document analysis & insights</div>
                      <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-700">• Risk assessment & recommendations</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${message.role === 'user'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0 }}
                      >
                        <div className="text-sm whitespace-pre-wrap break-words">{message.content}</div>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                          <span className="text-sm text-gray-600">Analyzing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-4 border-t">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!chatInput.trim() || chatLoading || !tender?.id) return;

                  const userQuestion = chatInput.trim();
                  setChatInput('');
                  setChatMessages((prev) => [...prev, { role: 'user', content: userQuestion }]);
                  setChatLoading(true);

                  try {
                    const response = await tenderApi.chat(tender.id, userQuestion, chatMessages);
                    if (response.success && response.data) {
                      setChatMessages((prev) => [...prev, { role: 'assistant', content: response.data!.answer }]);
                    } else {
                      alert('Failed to get response: ' + (response.error || 'Unknown error'));
                      setChatMessages((prev) => prev.slice(0, -1)); // Remove user message on error
                    }
                  } catch (error: any) {
                    alert('Error: ' + error.message);
                    setChatMessages((prev) => prev.slice(0, -1)); // Remove user message on error
                  } finally {
                    setChatLoading(false);
                  }
                }}
                className="flex gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={chatLoading}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {chatLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Email Dialog */}
      {showEmailDialog && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setShowEmailDialog(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Send Summary via Email</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmailDialog(false)}
                  className="h-8 w-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="recipient@example.com"
                    className="mt-1"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEmailDialog(false);
                      setEmailAddress('');
                    }}
                    disabled={sendingEmail}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!emailAddress || !emailAddress.includes('@') || !tender?.id) {
                        alert('Please enter a valid email address');
                        return;
                      }
                      setSendingEmail(true);
                      try {
                        const response = await tenderApi.sendSummaryEmail(tender.id, emailAddress);
                        if (response.success) {
                          alert('Summary sent successfully!');
                          setShowEmailDialog(false);
                          setEmailAddress('');
                        } else {
                          alert('Failed to send email: ' + (response.error || 'Unknown error'));
                        }
                      } catch (error: any) {
                        alert('Error sending email: ' + error.message);
                      } finally {
                        setSendingEmail(false);
                      }
                    }}
                    disabled={sendingEmail || !emailAddress}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {sendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}