import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from './ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import {
    FileText,
    Upload,
    Trash2,
    Save,
    X,
    CheckCircle2,
    Download,
    Sparkles,
    MessageCircle,
    Send,
    Loader2,
    DollarSign,
    BadgeCheck,
    List,
    ListTodo,
    CheckSquare,
    LayoutDashboard,
    CreditCard,
    Calendar,
    User,
    Clock,
    AlertCircle,
    Plus,
    Bell
} from 'lucide-react';
import type { Tender, TenderActivity, Document, Company, User as UserType, WorkLogReminder, ProductLine } from '../lib/types';
import { tenderApi, documentApi, companyApi, userApi, leadTypeApi, reminderApi, productLineApi, activityApi } from '../lib/api';
import EnhancedTasksTab from './EnhancedTasksTab';
import { useSettings } from '../hooks/useSettings';

interface TenderDetailDrawerProps {
    tenderId: number | null;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (tender: Tender) => void;
}

export function TenderDetailDrawer({ tenderId, isOpen, onClose, onUpdate }: TenderDetailDrawerProps) {
    const [tender, setTender] = useState<Tender | null>(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [leadTypes, setLeadTypes] = useState<any[]>([]); // Store all lead types
    const [productLines, setProductLines] = useState<ProductLine[]>([]);

    // Edit State
    const [editedTender, setEditedTender] = useState<Tender | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Data State
    const [documents, setDocuments] = useState<Document[]>([]);
    const [technicalDocuments, setTechnicalDocuments] = useState<Document[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Categories
    const [tenderDocCategoryId, setTenderDocCategoryId] = useState<number | null>(null);
    const [bidDocCategoryId, setBidDocCategoryId] = useState<number | null>(null);
    const [categoriesLoading, setCategoriesLoading] = useState(false);

    const [activities, setActivities] = useState<TenderActivity[]>([]);
    const [workLogs, setWorkLogs] = useState<TenderActivity[]>([]);
    const [auditLogs, setAuditLogs] = useState<TenderActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    // Work Log State
    const [newWorkLog, setNewWorkLog] = useState('');
    const [workLogForm, setWorkLogForm] = useState({
        description: '',
        workType: 'General' as 'General' | 'Research' | 'Documentation' | 'Communication' | 'Analysis' | 'Preparation' | 'Review' | 'Other',
        hoursSpent: '',
        workDate: new Date().toISOString().split('T')[0],
    });
    const [isAddingLog, setIsAddingLog] = useState(false);

    // Tasks State - Enhanced
    const [newTaskForm, setNewTaskForm] = useState({
        title: '',
        description: '',
        priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
        status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed' | 'Deferred' | 'Cancelled',
        dueDate: '',
        assignedTo: undefined as number | undefined,
        estimatedHours: '',
    });
    const [reminders, setReminders] = useState<WorkLogReminder[]>([]);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);

    // AI State
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const technicalFileInputRef = useRef<HTMLInputElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const { formatCurrency, formatDate } = useSettings();

    // Helper: Safe Date
    const safeDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    };

    // Helper: Format File Size
    const formatFileSize = (bytes: number) => {
        if (bytes === undefined || bytes === null || isNaN(bytes)) return 'Unknown size';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Helper: Status Color
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

    // Initial Fetches
    useEffect(() => {
        fetchCompanies();
        fetchUsers();
        fetchTenderLeadType();
        fetchProductLines();
        fetchCategories();
    }, []);

    // Load Tender Data
    useEffect(() => {
        if (isOpen && tenderId) {
            fetchTender(tenderId);
            fetchDocuments(tenderId);
            fetchActivities(tenderId);
            fetchAllReminders(tenderId);
        } else {
            setTender(null);
            setEditedTender(null);
            setDocuments([]);
            setTechnicalDocuments([]);
            setActivities([]);
            setSaveSuccess(null);
            setSaveError(null);
        }
    }, [isOpen, tenderId]);

    // Categories
    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await documentApi.getCategories();
            if (response.success && response.data) {
                const tenderCat = response.data.find((c: any) => c.name === 'Tender Documents');
                const bidCat = response.data.find((c: any) => c.name === 'Bid Documents') || response.data.find((c: any) => c.name === 'Technical Documents');

                if (tenderCat) setTenderDocCategoryId(tenderCat.id);
                if (bidCat) setBidDocCategoryId(bidCat.id);
            }
        } catch (e) { console.error(e); }
        finally { setCategoriesLoading(false); }
    };

    const fetchTenderLeadType = async () => {
        try {
            const response = await leadTypeApi.getAll();
            if (response.success && response.data) {
                setLeadTypes(response.data);
            }
        } catch (e) { console.error(e); }
    };

    const fetchProductLines = async () => {
        try {
            const response = await productLineApi.getAll();
            if (response.success && response.data) {
                setProductLines(Array.isArray(response.data) ? response.data : response.data.data || []);
            }
        } catch (e) { console.error('Error fetching product lines', e); }
    };

    const fetchCompanies = async () => {
        try {
            const response = await companyApi.getAll();
            if (response.success && response.data) setCompanies(response.data.data || []);
        } catch (error) { console.error('Error fetching companies', error); }
    };

    const fetchUsers = async () => {
        try {
            const response = await userApi.getAll();
            if (response.success && response.data) setUsers(response.data.data || []);
        } catch (error) { console.error('Error fetching users', error); }
    };

    const fetchTender = async (id: number) => {
        setLoading(true);
        try {
            const response = await tenderApi.getById(id);
            if (response.success && response.data) {
                const t = response.data;
                setTender(t);
                setEditedTender({ ...t, dueDate: t.submissionDeadline || t.dueDate }); // Sync dueDate
                if (t.aiSummary) setAiSummary(t.aiSummary);
            }
        } catch (error) {
            console.error('Error loading tender:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async (id: number) => {
        setLoadingDocuments(true);
        try {
            const response = await documentApi.getAll({ tenderId: id });
            if (response.success && response.data) {
                const allDocs = response.data.data || [];
                // Separate
                const tenderDocsList: Document[] = [];
                const bidDocsList: Document[] = [];
                allDocs.forEach((doc: any) => {
                    const d: Document = {
                        ...doc,
                        fileName: doc.file_name || doc.fileName,
                        originalName: doc.original_name || doc.originalName,
                        filePath: doc.file_path || doc.filePath,
                        fileSize: doc.file_size || doc.fileSize,
                        uploadedByName: doc.uploaded_by_name || doc.uploadedByName,
                        uploadedAt: doc.uploaded_at || doc.uploadedAt,
                        categoryId: doc.category_id || doc.categoryId
                    } as any;

                    if (bidDocCategoryId && d.categoryId === bidDocCategoryId) {
                        bidDocsList.push(d);
                    } else if (tenderDocCategoryId && d.categoryId === tenderDocCategoryId) {
                        tenderDocsList.push(d);
                    } else {
                        // Default fallback logic: if we have categories, default to Tender, else keep logic loose
                        if (tenderDocCategoryId) {
                            tenderDocsList.push(d);
                        } else {
                            // If no categories loaded yet (edge case), maybe show in Tender? 
                            tenderDocsList.push(d);
                        }
                    }
                });
                setDocuments(tenderDocsList);
                setTechnicalDocuments(bidDocsList);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoadingDocuments(false);
        }
    };

    const fetchAllReminders = async (id: number) => {
        try {
            const response = await tenderApi.getReminders(id);
            if (response.success && response.data) {
                setReminders(response.data || []);
            }
        } catch (error) {
            console.error('Error loading reminders:', error);
        }
    };

    const fetchActivities = async (id: number) => {
        if (!id) return;
        setLoadingActivities(true);
        try {
            const response = await tenderApi.getActivities(id);
            if (response.success && response.data) {
                const acts = (response.data || []).map((a: any) => ({
                    id: a.id,
                    tenderId: a.tender_id,
                    userId: a.user_id,
                    user: a.user_name ? { id: a.user_id, fullName: a.user_name, email: a.user_email } : undefined,
                    activityType: a.activity_type,
                    description: a.description,
                    createdAt: a.created_at,
                }));
                setActivities(acts);

                // Split
                const wLogs = acts.filter((a: any) => a.activityType === 'Commented');
                const aLogs = acts.filter((a: any) => a.activityType !== 'Commented');
                setWorkLogs(wLogs);
                setAuditLogs(aLogs);

            }
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleSave = async () => {
        if (!editedTender || !tender?.id) return;
        setSaving(true);
        setSaveError(null);
        setSaveSuccess(null);
        try {
            // Filter payload to only include fields expected by the API
            const payload = {
                title: editedTender.title,
                description: editedTender.description,
                status: editedTender.status,
                priority: editedTender.priority,
                companyId: editedTender.companyId,
                categoryId: editedTender.categoryId,
                leadTypeId: editedTender.leadTypeId,
                estimatedValue: editedTender.estimatedValue,
                emdAmount: editedTender.emdAmount,
                tenderFees: editedTender.tenderFees,
                submissionDeadline: editedTender.dueDate, // Map dueDate to submissionDeadline
                currency: editedTender.currency,
                assignedTo: editedTender.assignedTo,
                expectedAwardDate: editedTender.expectedAwardDate,
                contractDurationMonths: editedTender.contractDurationMonths,
                // Only include tagIds if we were editing them (which we aren't in this drawer yet, but good practice)
                // tagIds: editedTender.tags?.map(t => t.id) 
            };

            // Remove undefined/null keys if needed, but Joi allows null for most optional fields
            // However, we should be careful not to send 'undefined' string or NaN

            const response = await tenderApi.update(tender.id, payload);
            if (response.success && response.data) {
                setTender(response.data);
                setEditedTender({ ...response.data, dueDate: response.data.submissionDeadline || response.data.dueDate });
                onUpdate(response.data);
                setSaveSuccess('Changes saved successfully');
                setTimeout(() => setSaveSuccess(null), 3000);
            } else {
                setSaveError(response.error || 'Failed to update');
            }
        } catch (error: any) {
            setSaveError(error.message || 'Error updating tender');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateTask = async () => {
        if (!tender || !newTaskForm.title || !newTaskForm.description) return;
        try {
            // Step 1: Create structured task in tasks table
            const taskRes = await activityApi.createTask(tender.id, {
                title: newTaskForm.title,
                description: newTaskForm.description,
                priority: newTaskForm.priority,
                status: newTaskForm.status,
                dueDate: newTaskForm.dueDate || undefined,
                assignedTo: newTaskForm.assignedTo,
            });

            // Step 2: Create timeline activity entry for visibility in activity feed
            const activityRes = await tenderApi.addActivity(tender.id, {
                activityType: 'Task',
                description: `Task created: ${newTaskForm.title}`,
                hoursSpent: parseFloat(newTaskForm.estimatedHours) || 0,
                workDate: new Date().toISOString()
            } as any);

            // Step 3: Create reminder linked to the activity (for notification system)
            if (activityRes.success && activityRes.data) {
                const activityId = activityRes.data.id;
                await reminderApi.create(activityId, {
                    actionRequired: newTaskForm.title,
                    dueDate: newTaskForm.dueDate,
                    recipients: newTaskForm.assignedTo ? [{ userId: newTaskForm.assignedTo }] : [],
                    sendEmail: true,
                    sendSMS: false,
                });
            }

            if (taskRes.success) {
                setNewTaskForm({
                    title: '',
                    description: '',
                    priority: 'Medium',
                    status: 'Not Started',
                    dueDate: '',
                    assignedTo: undefined,
                    estimatedHours: ''
                });
                fetchActivities(tender.id);
                fetchAllReminders(tender.id);
            } else {
                alert(taskRes.error || 'Failed to create task');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to create task');
        }
    };

    const getAllReminders = () => {
        return reminders.sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'documents' | 'technicalDocuments') => {
        // File upload handler
        if (!tender?.id) {
            console.error('No tender ID found');
            return;
        }
        if (!e.target.files || e.target.files.length === 0) {
            console.error('No files selected');
            return;
        }
        setUploading(true);
        const file = e.target.files[0];
        try {
            let catId = undefined;
            if (type === 'technicalDocuments' && bidDocCategoryId) catId = bidDocCategoryId;
            if (type === 'documents' && tenderDocCategoryId) catId = tenderDocCategoryId;

            await documentApi.upload(file, { tenderId: tender.id, categoryId: catId });
            await fetchDocuments(tender.id);
            await fetchActivities(tender.id);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Upload failed');
        } finally {
            setUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleAddWorkLog = async () => {
        if (!workLogForm.description.trim() || !tender?.id) return;
        let desc = workLogForm.description;
        if (workLogForm.workType !== 'General') desc = `[${workLogForm.workType}] ${desc}`;
        if (workLogForm.hoursSpent) desc += ` (${workLogForm.hoursSpent} hrs)`;

        try {
            await tenderApi.addActivity(tender.id, {
                activityType: 'Commented',
                description: desc
            } as any);
            setWorkLogForm({ description: '', workType: 'General', hoursSpent: '', workDate: new Date().toISOString().split('T')[0] });
            fetchActivities(tender.id);
        } catch (e) { console.error(e); }
    };

    // AI Handlers
    const handleGenerateSummary = async () => {
        if (!tender?.id) return;
        setGeneratingSummary(true);
        try {
            const response = await tenderApi.generateSummary(tender.id);
            if (response.success && response.data) {
                setAiSummary(response.data.summary);
                fetchTender(tender.id);
            }
        } catch (e) { console.error(e); }
        finally { setGeneratingSummary(false); }
    };

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !tender?.id) return;
        const userMsg = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput('');
        setChatLoading(true);
        try {
            const response = await tenderApi.chat(tender.id, userMsg, chatMessages);
            if (response.success && response.data) {
                setChatMessages(prev => [...prev, { role: 'assistant', content: response.data!.answer }]);
            }
        } catch (e) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error getting response.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages, showChat]);


    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="p-0 w-[85vw] h-screen flex flex-col border-l shadow-2xl transition-transform duration-300 bg-white sm:max-w-none">
                {loading || !editedTender ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">#{tender?.id}</h2>
                                    <p className="text-sm text-gray-500 truncate max-w-[300px]">{editedTender.title}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button onClick={handleSave} disabled={saving} size="sm">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
                            </div>
                        </div>

                        {/* Status Messages */}
                        {saveSuccess && (
                            <div className="bg-green-50 text-green-700 px-4 py-2 text-sm flex items-center gap-2 border-b border-green-100">
                                <CheckCircle2 className="w-4 h-4" /> {saveSuccess}
                            </div>
                        )}

                        <ScrollArea className="flex-1 bg-gray-50/30">
                            <div className="px-6 py-4">
                                <Tabs defaultValue="details" className="w-full">
                                    <TabsList className="grid w-full grid-cols-7 p-1 bg-slate-100/80 rounded-xl mb-4 h-auto">
                                        <TabsTrigger value="details" className="text-sm py-2.5 flex items-center gap-1.5"><LayoutDashboard className="w-4 h-4" />Details</TabsTrigger>
                                        <TabsTrigger value="documents" className="text-sm py-2.5 flex items-center gap-1.5"><FileText className="w-4 h-4" />Tender Docs</TabsTrigger>
                                        <TabsTrigger value="technical" className="text-sm py-2.5 flex items-center gap-1.5"><CreditCard className="w-4 h-4" />Bid Docs</TabsTrigger>
                                        <TabsTrigger value="tasks" className="text-sm py-2.5 flex items-center gap-1.5"><ListTodo className="w-4 h-4" />Tasks</TabsTrigger>
                                        <TabsTrigger value="worklog" className="text-sm py-2.5 flex items-center gap-1.5"><Clock className="w-4 h-4" />Log</TabsTrigger>
                                        <TabsTrigger value="auditlog" className="text-sm py-2.5 flex items-center gap-1.5"><List className="w-4 h-4" />Audit</TabsTrigger>
                                        <TabsTrigger value="aiinsights" className="text-sm py-2.5 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-indigo-500" />AI Summary</TabsTrigger>
                                    </TabsList>

                                    {/* DETAILS TAB - Condensed */}
                                    <TabsContent value="details" className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {/* Classification */}
                                            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                                                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5"><LayoutDashboard className="w-3.5 h-3.5 text-indigo-600" /> Classification</h3>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Status</Label>
                                                        <Select value={editedTender.status} onValueChange={(v: any) => setEditedTender({ ...editedTender, status: v })}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>{['Draft', 'Submitted', 'Under Review', 'Shortlisted', 'Won', 'Lost', 'Cancelled'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Type</Label>
                                                        <Select value={editedTender.leadTypeId?.toString()} onValueChange={(v) => setEditedTender({ ...editedTender, leadTypeId: Number(v) })}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {leadTypes.map(lt => <SelectItem key={lt.id} value={lt.id.toString()}>{lt.name}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Priority</Label>
                                                        <Select value={editedTender.priority} onValueChange={(v: any) => setEditedTender({ ...editedTender, priority: v })}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>{['Low', 'Medium', 'High', 'Critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Product Line</Label>
                                                        <Select value={editedTender.productLineId?.toString() || 'none'} onValueChange={(v) => setEditedTender({ ...editedTender, productLineId: v === 'none' ? undefined : Number(v) })}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                                                            <SelectContent><SelectItem value="none">None</SelectItem>{productLines.map(pl => <SelectItem key={pl.id} value={pl.id.toString()}>{pl.name}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Sub Category</Label>
                                                        <Select value={editedTender.subCategory || 'none'} onValueChange={(v: any) => setEditedTender({ ...editedTender, subCategory: v === 'none' ? undefined : v })}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                                                            <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="Software">Software</SelectItem><SelectItem value="Hardware">Hardware</SelectItem></SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Basic Info */}
                                            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                                <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-blue-600" /> Basic Info</h3>
                                                <div className="space-y-2">
                                                    <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Title</Label>
                                                        <Input value={editedTender.title} onChange={e => setEditedTender({ ...editedTender, title: e.target.value })} className="h-8 text-xs" />
                                                    </div>
                                                    <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Client</Label>
                                                        <Select value={editedTender.companyId?.toString() || 'none'} onValueChange={v => setEditedTender({ ...editedTender, companyId: v === 'none' ? undefined : Number(v) })}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select Client" /></SelectTrigger>
                                                            <SelectContent><SelectItem value="none">None</SelectItem>{companies.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.companyName}</SelectItem>)}</SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                            <h3 className="text-xs font-bold text-slate-800 mb-2">Description</h3>
                                            <Textarea value={editedTender.description || ''} onChange={e => setEditedTender({ ...editedTender, description: e.target.value })} className="min-h-[80px] text-xs resize-none" />
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                                            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Financials & Dates</h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Est. Value</Label><Input type="number" value={editedTender.estimatedValue || ''} onChange={e => setEditedTender({ ...editedTender, estimatedValue: parseFloat(e.target.value) })} className="h-8 text-xs" /></div>
                                                <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">EMD</Label><Input type="number" value={editedTender.emdAmount || ''} onChange={e => setEditedTender({ ...editedTender, emdAmount: parseFloat(e.target.value) })} className="h-8 text-xs" /></div>
                                                <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Tender Fees</Label><Input type="number" value={editedTender.tenderFees || ''} onChange={e => setEditedTender({ ...editedTender, tenderFees: parseFloat(e.target.value) })} className="h-8 text-xs" /></div>
                                                <div className="space-y-1"><Label className="text-xs uppercase text-slate-500 font-bold">Due Date</Label><Input type="date" value={editedTender.dueDate ? new Date(editedTender.dueDate).toISOString().split('T')[0] : ''} onChange={e => setEditedTender({ ...editedTender, dueDate: e.target.value })} className="h-8 text-xs" /></div>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    {/* TASKS TAB - Enhanced */}
                                    <TabsContent value="tasks" className="space-y-4">
                                        <EnhancedTasksTab
                                            tender={tender!}
                                            users={users}
                                            reminders={getAllReminders()}
                                            onRefresh={() => {
                                                fetchActivities(tender!.id);
                                                fetchAllReminders(tender!.id);
                                            }}
                                        />
                                    </TabsContent>

                                    {/* DOCUMENTS & TECH TABS */}
                                    {['documents', 'technical'].map(type => (
                                        <TabsContent key={type} value={type} className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="capitalize">{type === 'technical' ? 'Bid Documents' : 'Tender Documents'}</h3>
                                                <div className="flex gap-2">
                                                    <input type="file" className="hidden" ref={type === 'documents' ? fileInputRef : technicalFileInputRef} onChange={e => handleFileUpload(e, type as any)} />
                                                    <Button size="sm" onClick={() => (type === 'documents' ? fileInputRef : technicalFileInputRef).current?.click()} disabled={uploading}><Upload className="w-4 h-4 mr-2" /> Upload</Button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                {(type === 'documents' ? documents : technicalDocuments).map(doc => (
                                                    <div key={doc.id} className="flex justify-between p-3 border rounded-lg bg-white">
                                                        <div className="flex gap-3"><FileText className="w-5 h-5 text-indigo-500" />
                                                            <div><p className="font-medium text-sm">{doc.originalName}</p><p className="text-xs text-slate-500">{formatFileSize(doc.fileSize)} • {safeDate(doc.uploadedAt)}</p></div></div>
                                                        <div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => documentApi.download(doc.id, doc.originalName).catch((err: any) => alert(`Download failed: ${err.message}`))}><Download className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => documentApi.delete(doc.id).then(() => fetchDocuments(tender!.id)).catch((err: any) => alert(`Delete failed: ${err.message}`))}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>
                                                    </div>
                                                ))}
                                                {(type === 'documents' ? documents : technicalDocuments).length === 0 && <div className="text-center py-8 border-dashed border-2 rounded text-slate-400">No documents</div>}
                                            </div>
                                        </TabsContent>
                                    ))}

                                    {/* WORK LOG */}
                                    <TabsContent value="worklog" className="space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="font-bold text-sm mb-3">Add Entry</h3>
                                            <div className="space-y-2">
                                                <div className="flex gap-2"><Select value={workLogForm.workType} onValueChange={(v: any) => setWorkLogForm({ ...workLogForm, workType: v })}><SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{['General', 'Research', 'Other'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                                                    <Input type="date" value={workLogForm.workDate} onChange={e => setWorkLogForm({ ...workLogForm, workDate: e.target.value })} className="w-32 h-8 text-xs" /></div>
                                                <Textarea value={workLogForm.description} onChange={e => setWorkLogForm({ ...workLogForm, description: e.target.value })} placeholder="Description..." className="text-xs" />
                                                <Button size="sm" onClick={handleAddWorkLog} disabled={!workLogForm.description}>Add Entry</Button>
                                            </div>
                                        </div>
                                        <div className="space-y-4 pt-4">
                                            {workLogs.map(log => (
                                                <div key={log.id} className="pl-4 border-l-2 border-indigo-200 py-1">
                                                    <p className="text-sm font-semibold">{log.description}</p>
                                                    <p className="text-xs text-slate-500">{safeDate(log.createdAt)} by {log.user?.fullName || 'System'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    {/* AUDIT LOG */}
                                    <TabsContent value="auditlog" className="space-y-4">
                                        <div className="space-y-2">
                                            {auditLogs.map(log => (
                                                <div key={log.id} className="text-xs text-slate-600 bg-gray-50 p-2 rounded">
                                                    <span className="font-bold">{log.activityType}:</span> {log.description} <span className="opacity-50">({safeDate(log.createdAt)})</span>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    {/* AI INSIGHTS */}
                                    <TabsContent value="aiinsights" className="space-y-4">
                                        {!showChat ? (
                                            <div className="space-y-6">
                                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100 flex items-center justify-between">
                                                    <div><h3 className="text-sm font-semibold text-indigo-900 flex gap-2"><Sparkles className="w-4 h-4" /> AI Summary</h3></div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => setShowChat(true)}><MessageCircle className="w-3.5 h-3.5 mr-2" /> Chat</Button>
                                                        <Button size="sm" onClick={handleGenerateSummary} disabled={generatingSummary}>{generatingSummary ? <Loader2 className="animate-spin" /> : <Sparkles />} {aiSummary ? 'Regenerate' : 'Generate'}</Button>
                                                    </div>
                                                </div>
                                                {generatingSummary ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto" /><p>Analyzing...</p></div> :
                                                    aiSummary ? <div className="p-4 bg-white border rounded text-sm leading-relaxed whitespace-pre-wrap">{aiSummary}</div> :
                                                        <div className="text-center py-12 text-gray-500"><p>No summary yet.</p></div>}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col h-[500px] border rounded-lg">
                                                <div className="p-2 border-b flex justify-between bg-gray-50"><span className="font-bold text-sm flex gap-2"><MessageCircle className="w-4 h-4" /> Chat</span><Button variant="ghost" size="icon" onClick={() => setShowChat(false)}><X className="w-4 h-4" /></Button></div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatScrollRef}>
                                                    {chatMessages.length === 0 && <p className="text-center text-gray-500 text-sm">Ask anything.</p>}
                                                    {chatMessages.map((m, i) => <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-2 rounded text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}>{m.content}</div></div>)}
                                                    {chatLoading && <div className="flex"><div className="bg-gray-100 p-2 rounded"><Loader2 className="w-3 h-3 animate-spin" /></div></div>}
                                                </div>
                                                <form onSubmit={handleChatSubmit} className="p-2 border-t flex gap-2"><Input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type..." className="h-9" /><Button type="submit" size="sm" disabled={chatLoading}><Send className="w-4 h-4" /></Button></form>
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </ScrollArea>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
