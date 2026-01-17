import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
    BadgeCheck
} from 'lucide-react';
import type { Tender, TenderActivity, Document, Company, User as UserType } from '../lib/types';
import { tenderApi, documentApi, companyApi, userApi, leadTypeApi } from '../lib/api';
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
    const [activeTab, setActiveTab] = useState('overview');
    const [tenderLeadTypeId, setTenderLeadTypeId] = useState<number | null>(null);

    // Edit State
    const [editedTender, setEditedTender] = useState<Tender | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    // Data State
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [activities, setActivities] = useState<TenderActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    // Activity State
    const [newWorkLog, setNewWorkLog] = useState('');
    const [isAddingLog, setIsAddingLog] = useState(false);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [users, setUsers] = useState<UserType[]>([]);
    const [currentUser, setCurrentUser] = useState<UserType | null>(null);

    // AI State
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatScrollRef = useRef<HTMLDivElement>(null);
    const { formatCurrency, formatDate } = useSettings();

    // Fetch initial metadata on mount
    useEffect(() => {
        fetchCompanies();
        fetchUsers();
        fetchTenderLeadType();
    }, []);

    // Fetch Tender Data when ID changes or Drawer opens
    useEffect(() => {
        if (isOpen && tenderId) {
            fetchTender(tenderId);
            fetchDocuments(tenderId);
            fetchActivities(tenderId);
        } else {
            setTender(null);
            setEditedTender(null);
            setDocuments([]);
            setActivities([]);
            setSaveSuccess(null);
        }
    }, [isOpen, tenderId]);

    const fetchTenderLeadType = async () => {
        try {
            const response = await leadTypeApi.getAll();
            if (response.success && response.data) {
                const tenderType = response.data.find(lt => lt.name === 'Tender');
                if (tenderType) setTenderLeadTypeId(tenderType.id);
            }
        } catch (e) {
            console.error('Error fetching lead types', e);
        }
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
                setTender(response.data);
                setEditedTender(response.data);
                if (response.data.aiSummary) setAiSummary(response.data.aiSummary);
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
            if (response.success && response.data) setDocuments(response.data.data || []);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoadingDocuments(false);
        }
    };

    const fetchActivities = async (id: number) => {
        setLoadingActivities(true);
        try {
            const response = await tenderApi.getActivities(id);
            if (response.success && response.data) setActivities(response.data || []);
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setLoadingActivities(false);
        }
    };

    const handleSave = async () => {
        if (!editedTender || !tender?.id) return;
        setSaving(true);
        try {
            // Construct payload with only changeable fields
            const payload: Partial<Tender> = {
                title: editedTender.title,
                description: editedTender.description,
                status: editedTender.status,
                client: editedTender.client,
                companyId: editedTender.companyId,
                estimatedValue: editedTender.estimatedValue,
                currency: editedTender.currency,
                submissionDeadline: editedTender.submissionDeadline,
                emdAmount: editedTender.emdAmount,
                tenderFees: editedTender.tenderFees,
                assignedTo: editedTender.assignedTo,
                priority: editedTender.priority,
                contractDurationMonths: editedTender.contractDurationMonths,
                expectedAwardDate: editedTender.expectedAwardDate,
            };

            const response = await tenderApi.update(tender.id, payload);
            if (response.success && response.data) {
                setTender(response.data);
                // Also update local edited state to match server response
                setEditedTender(response.data);
                onUpdate(response.data);
                setSaveSuccess('Changes saved successfully');
                setTimeout(() => setSaveSuccess(null), 3000);
            }
        } catch (error) {
            console.error('Error updating tender:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !tender?.id) return;
        setUploading(true);

        const files = Array.from(e.target.files);
        try {
            for (const file of files) {
                await documentApi.upload(file, { tenderId: tender.id });
            }
            await fetchDocuments(tender.id);
            await fetchActivities(tender.id); // Refresh logs as upload creates activity
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleGenerateSummary = async () => {
        if (!tender?.id) return;
        setGeneratingSummary(true);
        try {
            const response = await tenderApi.generateSummary(tender.id);
            if (response.success && response.data) {
                setAiSummary(response.data.summary);
                await fetchTender(tender.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGeneratingSummary(false);
        }
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
            console.error(e);
            setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleAddWorkLog = async () => {
        if (!newWorkLog.trim() || !tender?.id) return;
        setIsAddingLog(true);
        try {
            const response = await tenderApi.addActivity(tender.id, {
                activityType: 'Commented',
                description: newWorkLog,
            } as any);

            if (response.success) {
                setNewWorkLog('');
                await fetchActivities(tender.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsAddingLog(false);
        }
    };

    useEffect(() => {
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages, showChat]);

    const handleDeleteDocument = async (docId: number) => {
        if (!tender?.id || !confirm('Are you sure you want to delete this document?')) return;
        try {
            await documentApi.delete(docId);
            await fetchDocuments(tender.id);
            await fetchActivities(tender.id);
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Helper to get initials
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent
                side="right"
                className="p-0 w-[80vw] h-screen flex flex-col border-l shadow-2xl transition-transform duration-300 bg-white"
            >
                {loading || !tender || !editedTender ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white sticky top-0 z-20 flex-shrink-0">
                            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                                        #{tender.id.toString().padStart(4, '0')}
                                    </span>
                                    <Badge size="sm" className={
                                        tender.priority === 'Critical' ? 'bg-red-100 text-red-800 border-red-200 shadow-none' :
                                            tender.priority === 'High' ? 'bg-orange-100 text-orange-800 border-orange-200 shadow-none' :
                                                'bg-blue-100 text-blue-800 border-blue-200 shadow-none'
                                    }>
                                        {tender.priority}
                                    </Badge>
                                </div>
                                <SheetTitle className="text-xl font-bold text-gray-900 truncate pr-4">
                                    {tender.title}
                                </SheetTitle>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {tender.client || 'Direct Client'}
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {saveSuccess && (
                                    <div className="flex items-center text-emerald-600 text-xs font-medium animate-in fade-in slide-in-from-right-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        {saveSuccess}
                                    </div>
                                )}
                                <Button size="sm" onClick={handleSave} disabled={saving} className="h-9 shadow-sm">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Changes
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Tabs */}
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                            <div className="px-6 border-b border-gray-200 bg-white">
                                <TabsList className="h-10 p-0 bg-transparent gap-6">
                                    {['Overview', 'Documents', 'Activity', 'AI Insights'].map((tab) => (
                                        <TabsTrigger
                                            key={tab}
                                            value={tab.toLowerCase().replace(' ', '')}
                                            className="h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 px-0 bg-transparent shadow-none text-sm font-medium"
                                        >
                                            {tab === 'AI Insights' ? <><Sparkles className="w-3.5 h-3.5 mr-2" />{tab}</> : tab}
                                            {tab === 'Documents' && documents.length > 0 && (
                                                <span className="ml-2 bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                                                    {documents.length}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            {/* Content Areas */}
                            <ScrollArea className="flex-1 bg-gray-50/50">
                                <div className="p-6 max-w-4xl mx-auto">

                                    {/* OVERVIEW TAB */}
                                    <TabsContent value="overview" className="mt-0 space-y-8 pb-8">
                                        {/* Classification Group */}
                                        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                                    <BadgeCheck className="w-4 h-4 text-indigo-600" />
                                                </div>
                                                <h3 className="text-sm font-semibold text-gray-900">Classification</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Status</Label>
                                                    <Select
                                                        value={editedTender.status}
                                                        onValueChange={(val: any) => setEditedTender({ ...editedTender, status: val })}
                                                    >
                                                        <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {['Draft', 'Submitted', 'Under Review', 'Shortlisted', 'Won', 'Lost', 'Cancelled'].map(s => (
                                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Priority</Label>
                                                    <Select
                                                        value={editedTender.priority}
                                                        onValueChange={(val: any) => setEditedTender({ ...editedTender, priority: val })}
                                                    >
                                                        <SelectTrigger className="h-10 bg-gray-50/50 border-gray-200">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Basic Info Group */}
                                        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                </div>
                                                <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
                                            </div>
                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tender Title</Label>
                                                    <Input
                                                        value={editedTender.title}
                                                        onChange={(e) => setEditedTender({ ...editedTender, title: e.target.value })}
                                                        className="h-10 font-medium bg-gray-50/50"
                                                        placeholder="Enter tender title..."
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Client / Authority</Label>
                                                        <div className="space-y-2">
                                                            <Select
                                                                value={editedTender.companyId ? String(editedTender.companyId) : 'none'}
                                                                onValueChange={(val) => setEditedTender({
                                                                    ...editedTender,
                                                                    companyId: val === 'none' ? undefined : Number(val),
                                                                    client: val === 'none' ? editedTender.client : companies.find(c => c.id === Number(val))?.companyName || ''
                                                                })}
                                                            >
                                                                <SelectTrigger className="h-10 bg-gray-50/50">
                                                                    <SelectValue placeholder="Select Company" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">-- Manual Entry --</SelectItem>
                                                                    {companies.map(c => (
                                                                        <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {!editedTender.companyId && (
                                                                <Input
                                                                    placeholder="Or type client name..."
                                                                    value={editedTender.client || ''}
                                                                    onChange={(e) => setEditedTender({ ...editedTender, client: e.target.value })}
                                                                    className="h-9 text-sm bg-gray-50/50"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Assigned To</Label>
                                                        <Select
                                                            value={editedTender.assignedTo ? String(editedTender.assignedTo) : 'none'}
                                                            onValueChange={(val) => setEditedTender({ ...editedTender, assignedTo: val === 'none' ? undefined : Number(val) })}
                                                        >
                                                            <SelectTrigger className="h-10 bg-gray-50/50">
                                                                <SelectValue placeholder="Unassigned" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">Unassigned</SelectItem>
                                                                {users.map(u => (
                                                                    <SelectItem key={u.id} value={String(u.id)}>{u.fullName}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Description</Label>
                                                    <Textarea
                                                        value={editedTender.description || ''}
                                                        onChange={(e) => setEditedTender({ ...editedTender, description: e.target.value })}
                                                        className="min-h-[120px] text-sm resize-none bg-gray-50/50 focus:bg-white transition-colors"
                                                        placeholder="Detailed description of the tender..."
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        {/* Financials & Dates Group */}
                                        <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
                                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                                                    <DollarSign className="w-4 h-4 text-green-600" />
                                                </div>
                                                <h3 className="text-sm font-semibold text-gray-900">Financials & Schedule</h3>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Est. Value (INR)</Label>
                                                    <Input
                                                        type="number"
                                                        value={editedTender.estimatedValue || ''}
                                                        onChange={(e) => setEditedTender({ ...editedTender, estimatedValue: parseFloat(e.target.value) || 0 })}
                                                        className="h-10 bg-gray-50/50"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Submission Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={editedTender.submissionDeadline ? new Date(editedTender.submissionDeadline).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => setEditedTender({ ...editedTender, submissionDeadline: e.target.value })}
                                                        className="h-10 bg-gray-50/50"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">EMD Amount</Label>
                                                    <Input
                                                        type="number"
                                                        value={editedTender.emdAmount || ''}
                                                        onChange={(e) => setEditedTender({ ...editedTender, emdAmount: parseFloat(e.target.value) || 0 })}
                                                        className="h-10 bg-gray-50/50"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Tender Fees</Label>
                                                    <Input
                                                        type="number"
                                                        value={editedTender.tenderFees || ''}
                                                        onChange={(e) => setEditedTender({ ...editedTender, tenderFees: parseFloat(e.target.value) || 0 })}
                                                        className="h-10 bg-gray-50/50"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Contract Duration (Months)</Label>
                                                    <Input
                                                        type="number"
                                                        value={editedTender.contractDurationMonths || ''}
                                                        onChange={(e) => setEditedTender({ ...editedTender, contractDurationMonths: parseInt(e.target.value) || 0 })}
                                                        className="h-10 bg-gray-50/50"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Expected Award Date</Label>
                                                    <Input
                                                        type="date"
                                                        value={editedTender.expectedAwardDate ? new Date(editedTender.expectedAwardDate).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => setEditedTender({ ...editedTender, expectedAwardDate: e.target.value })}
                                                        className="h-10 bg-gray-50/50"
                                                    />
                                                </div>
                                            </div>
                                        </section>
                                    </TabsContent>

                                    {/* DOCUMENTS TAB */}
                                    <TabsContent value="documents" className="mt-0 space-y-4">
                                        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center border-dashed gap-2 group hover:border-indigo-300 transition-colors">
                                            <input
                                                type="file"
                                                multiple
                                                className="hidden"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                            />
                                            <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                {uploading ? <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" /> : <Upload className="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />}
                                            </div>
                                            <div className="text-center">
                                                <Button variant="link" onClick={() => fileInputRef.current?.click()} className="h-auto p-0 font-semibold text-indigo-600">
                                                    Click to upload
                                                </Button>
                                                <span className="text-sm text-gray-500 ml-1">or drag and drop</span>
                                                <p className="text-xs text-gray-400 mt-1">PDF, Docs, Images up to 10MB</p>
                                            </div>
                                        </div>

                                        {loadingDocuments ? (
                                            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></div>
                                        ) : documents.length === 0 ? (
                                            <div className="text-center py-12 bg-white rounded-lg border border-gray-100">
                                                <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                                <p className="text-sm text-gray-500">No documents attached yet</p>
                                            </div>
                                        ) : (
                                            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                                                {documents.map(doc => (
                                                    <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                                <FileText className="w-4 h-4 text-indigo-600" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-gray-900 truncate">{doc.displayName || doc.fileName}</p>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <span>{formatFileSize(doc.fileSize)}</span>
                                                                    <span>•</span>
                                                                    <span>{formatDate(doc.uploadedAt)}</span>
                                                                    <span>•</span>
                                                                    <span>{doc.uploadedByName || 'Unknown'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-indigo-600">
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={() => handleDeleteDocument(doc.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* ACTIVITY TAB */}
                                    <TabsContent value="activity" className="mt-0">
                                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="Add a note or work log..."
                                                    value={newWorkLog}
                                                    onChange={(e) => setNewWorkLog(e.target.value)}
                                                    className="bg-white"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleAddWorkLog();
                                                        }
                                                    }}
                                                />
                                                <Button size="icon" onClick={handleAddWorkLog} disabled={isAddingLog || !newWorkLog.trim()}>
                                                    <Send className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        {loadingActivities ? (
                                            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></div>
                                        ) : (
                                            <div className="space-y-6 p-4">
                                                {activities.length === 0 ? (
                                                    <div className="text-center py-12 text-sm text-gray-500">No activity recorded yet</div>
                                                ) : (
                                                    activities.map((activity, index) => (
                                                        <div key={activity.id} className="relative pl-6 pb-6 last:pb-0 border-l border-gray-200">
                                                            <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-gray-200 ring-4 ring-white" />
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-semibold text-gray-900">
                                                                        {activity.user?.fullName || 'System'}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {activity.activityType}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400 ml-auto">
                                                                        {new Date(activity.createdAt).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                                                                    {activity.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* AI INSIGHTS TAB */}
                                    <TabsContent value="aiinsights" className="mt-0 flex-1 flex flex-col min-h-[500px]">
                                        {!showChat ? (
                                            <div className="space-y-6">
                                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100 flex items-center justify-between">
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                                                            <Sparkles className="w-4 h-4 text-indigo-600" />
                                                            AI Summary
                                                        </h3>
                                                        <p className="text-xs text-indigo-700 mt-1">Generated from tender details and attached documents.</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" variant="outline" onClick={() => setShowChat(true)} className="h-8 bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50">
                                                            <MessageCircle className="w-3.5 h-3.5 mr-2" />
                                                            Chat
                                                        </Button>
                                                        <Button size="sm" onClick={handleGenerateSummary} disabled={generatingSummary} className="h-8 bg-indigo-600 hover:bg-indigo-700">
                                                            {generatingSummary ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Sparkles className="w-3.5 h-3.5 mr-2" />}
                                                            {aiSummary ? 'Regenerate' : 'Generate'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {generatingSummary ? (
                                                    <div className="py-12 text-center">
                                                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
                                                        <p className="text-sm text-indigo-600">Analyzing documents...</p>
                                                    </div>
                                                ) : aiSummary ? (
                                                    <div className="bg-white rounded-lg border border-gray-200 p-4 prose prose-sm max-w-none text-gray-700">
                                                        <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                                            {aiSummary}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-12 text-gray-400">
                                                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                        <p className="text-sm">No summary generated yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 overflow-hidden">
                                                <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                                                    <div className="flex items-center gap-2">
                                                        <MessageCircle className="w-4 h-4 text-indigo-600" />
                                                        <span className="font-semibold text-sm">Scout Assistant</span>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowChat(false)}>
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={chatScrollRef}>
                                                    {chatMessages.length === 0 && (
                                                        <div className="text-center text-gray-400 mt-8">
                                                            <p className="text-sm">Ask me anything about this tender.</p>
                                                        </div>
                                                    )}
                                                    {chatMessages.map((msg, i) => (
                                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {msg.content}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {chatLoading && (
                                                        <div className="flex justify-start">
                                                            <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                                                                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                                                                <span className="text-xs text-gray-500">Thinking...</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="p-3 border-t">
                                                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                                                        <Input
                                                            value={chatInput}
                                                            onChange={e => setChatInput(e.target.value)}
                                                            placeholder="Type a message..."
                                                            className="flex-1 h-9"
                                                        />
                                                        <Button type="submit" size="sm" disabled={chatLoading} className="h-9 px-3">
                                                            <Send className="w-4 h-4" />
                                                        </Button>
                                                    </form>
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>

                                </div>
                            </ScrollArea>
                        </Tabs>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
