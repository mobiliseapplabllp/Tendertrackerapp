import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import {
  Mail, Plus, Users, Loader2, Trash2, Send, Save, Eye, Sparkles,
  ChevronLeft, ChevronRight, MailOpen, MousePointerClick, AlertTriangle,
  UserMinus, X, ListPlus, FileText, BarChart3,
} from 'lucide-react';
import { emailMarketingApi, marketingCampaignApi } from '../lib/api';

// ---- Types ----
interface EmailList {
  id: number;
  name: string;
  description: string;
  member_count: number;
  created_at: string;
}

interface ListMember {
  id: number;
  email: string;
  name: string;
  company: string;
  status: string;
}

interface EmailCampaign {
  id: number;
  subject: string;
  from_name: string;
  list_id: number;
  list_name: string;
  body: string;
  status: string;
  campaign_id: number | null;
  sent_at: string | null;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_unsubscribed: number;
  created_at: string;
}

interface MarketingCampaign {
  id: number;
  name: string;
}

// ---- Helpers ----
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function rateColor(rate: number): string {
  if (rate >= 20) return 'text-green-600';
  if (rate >= 10) return 'text-yellow-600';
  return 'text-red-600';
}

function statusVariant(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    sending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    active: 'bg-green-100 text-green-700',
    unsubscribed: 'bg-red-100 text-red-700',
    bounced: 'bg-orange-100 text-orange-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

// ================================================================
// Email Marketing Page
// ================================================================
export function EmailMarketingPage() {
  // ---- Shared state ----
  const [activeTab, setActiveTab] = useState('lists');

  // ---- Mailing Lists state ----
  const [lists, setLists] = useState<EmailList[]>([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [listsError, setListsError] = useState<string | null>(null);
  const [showCreateList, setShowCreateList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // Expanded list + members
  const [expandedListId, setExpandedListId] = useState<number | null>(null);
  const [members, setMembers] = useState<ListMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [membersTotalPages, setMembersTotalPages] = useState(1);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMembersText, setAddMembersText] = useState('');
  const [addMemberName, setAddMemberName] = useState('');
  const [addMemberCompany, setAddMemberCompany] = useState('');
  const [addingMembers, setAddingMembers] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // ---- Compose Campaign state ----
  const [composeSubject, setComposeSubject] = useState('');
  const [composeFromName, setComposeFromName] = useState('');
  const [composeListId, setComposeListId] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeCampaignId, setComposeCampaignId] = useState('');
  const [composeSaving, setComposeSaving] = useState(false);
  const [composeSending, setComposeSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // AI Writer
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('formal');
  const [aiGenerating, setAiGenerating] = useState(false);

  // Marketing campaigns for linking
  const [marketingCampaigns, setMarketingCampaigns] = useState<MarketingCampaign[]>([]);

  // ---- Sent Campaigns state ----
  const [sentCampaigns, setSentCampaigns] = useState<EmailCampaign[]>([]);
  const [sentLoading, setSentLoading] = useState(true);
  const [sentError, setSentError] = useState<string | null>(null);

  // ================================================================
  // Data Fetching
  // ================================================================
  const fetchLists = useCallback(async () => {
    setListsLoading(true);
    setListsError(null);
    try {
      const res = await emailMarketingApi.getLists();
      if (res.success) {
        setLists(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } else {
        setListsError(res.error || 'Failed to load mailing lists');
      }
    } catch {
      setListsError('Failed to load mailing lists');
    } finally {
      setListsLoading(false);
    }
  }, []);

  const fetchMembers = useCallback(async (listId: number, page: number) => {
    setMembersLoading(true);
    try {
      const res = await emailMarketingApi.getListMembers(listId, {
        page: String(page), pageSize: '10',
      });
      if (res.success) {
        const data = res.data;
        setMembers(Array.isArray(data) ? data : data?.data || []);
        setMembersTotalPages(data?.totalPages || 1);
      }
    } catch {
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const fetchSentCampaigns = useCallback(async () => {
    setSentLoading(true);
    setSentError(null);
    try {
      const res = await emailMarketingApi.getCampaigns();
      if (res.success) {
        setSentCampaigns(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } else {
        setSentError(res.error || 'Failed to load campaigns');
      }
    } catch {
      setSentError('Failed to load campaigns');
    } finally {
      setSentLoading(false);
    }
  }, []);

  const fetchMarketingCampaigns = useCallback(async () => {
    try {
      const res = await marketingCampaignApi.getAll();
      if (res.success) {
        setMarketingCampaigns(Array.isArray(res.data) ? res.data : res.data?.data || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchLists();
    fetchMarketingCampaigns();
  }, [fetchLists, fetchMarketingCampaigns]);

  useEffect(() => {
    if (activeTab === 'sent') fetchSentCampaigns();
  }, [activeTab, fetchSentCampaigns]);

  useEffect(() => {
    if (expandedListId !== null) {
      setMembersPage(1);
      fetchMembers(expandedListId, 1);
    }
  }, [expandedListId, fetchMembers]);

  useEffect(() => {
    if (expandedListId !== null) {
      fetchMembers(expandedListId, membersPage);
    }
  }, [membersPage, expandedListId, fetchMembers]);

  // ================================================================
  // Handlers
  // ================================================================
  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreatingList(true);
    try {
      const res = await emailMarketingApi.createList({
        name: newListName.trim(),
        description: newListDesc.trim(),
      });
      if (res.success) {
        setShowCreateList(false);
        setNewListName('');
        setNewListDesc('');
        fetchLists();
      }
    } catch { /* silent */ }
    finally { setCreatingList(false); }
  };

  const handleDeleteList = async (id: number) => {
    if (!confirm('Delete this mailing list? This cannot be undone.')) return;
    await emailMarketingApi.deleteList(id);
    if (expandedListId === id) setExpandedListId(null);
    fetchLists();
  };

  const handleAddMembers = async () => {
    if (!addMembersText.trim() || expandedListId === null) return;
    setAddingMembers(true);
    try {
      const emails = addMembersText
        .split(/[\n,;]+/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (emails.length === 0) return;

      const res = await emailMarketingApi.addMembers(expandedListId, {
        emails,
        name: addMemberName.trim() || undefined,
        company: addMemberCompany.trim() || undefined,
      });
      if (res.success) {
        setShowAddMembers(false);
        setAddMembersText('');
        setAddMemberName('');
        setAddMemberCompany('');
        fetchMembers(expandedListId, membersPage);
        fetchLists(); // refresh counts
      }
    } catch { /* silent */ }
    finally { setAddingMembers(false); }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (expandedListId === null) return;
    setRemovingMemberId(memberId);
    try {
      await emailMarketingApi.removeMember(expandedListId, memberId);
      fetchMembers(expandedListId, membersPage);
      fetchLists();
    } catch { /* silent */ }
    finally { setRemovingMemberId(null); }
  };

  const handleSaveDraft = async () => {
    if (!composeSubject.trim()) { setComposeError('Subject is required'); return; }
    if (!composeListId) { setComposeError('Please select a mailing list'); return; }
    setComposeSaving(true);
    setComposeError(null);
    try {
      const payload: any = {
        subject: composeSubject,
        from_name: composeFromName,
        list_id: Number(composeListId),
        body: composeBody,
        status: 'draft',
      };
      if (composeCampaignId) payload.campaign_id = Number(composeCampaignId);
      const res = await emailMarketingApi.createCampaign(payload);
      if (res.success) {
        resetCompose();
        setActiveTab('sent');
        fetchSentCampaigns();
      } else {
        setComposeError(res.error || 'Failed to save draft');
      }
    } catch { setComposeError('Failed to save draft'); }
    finally { setComposeSaving(false); }
  };

  const handleSendNow = async () => {
    if (!composeSubject.trim()) { setComposeError('Subject is required'); return; }
    if (!composeListId) { setComposeError('Please select a mailing list'); return; }
    if (!composeBody.trim()) { setComposeError('Email body is required'); return; }
    if (!confirm('Send this campaign to all list members? This cannot be undone.')) return;
    setComposeSending(true);
    setComposeError(null);
    try {
      const payload: any = {
        subject: composeSubject,
        from_name: composeFromName,
        list_id: Number(composeListId),
        body: composeBody,
        status: 'sending',
      };
      if (composeCampaignId) payload.campaign_id = Number(composeCampaignId);
      const createRes = await emailMarketingApi.createCampaign(payload);
      if (createRes.success && createRes.data?.id) {
        await emailMarketingApi.sendCampaign(createRes.data.id);
        resetCompose();
        setActiveTab('sent');
        fetchSentCampaigns();
      } else {
        setComposeError(createRes.error || 'Failed to create campaign');
      }
    } catch { setComposeError('Failed to send campaign'); }
    finally { setComposeSending(false); }
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    try {
      const res = await emailMarketingApi.aiGenerate({
        topic: aiTopic,
        tone: aiTone,
      });
      if (res.success && res.data) {
        if (res.data.subject) setComposeSubject(res.data.subject);
        if (res.data.body) setComposeBody(res.data.body);
      }
    } catch { /* silent */ }
    finally { setAiGenerating(false); }
  };

  const resetCompose = () => {
    setComposeSubject('');
    setComposeFromName('');
    setComposeListId('');
    setComposeBody('');
    setComposeCampaignId('');
    setComposeError(null);
    setAiTopic('');
  };

  // ================================================================
  // Render
  // ================================================================
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Mail className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
            <p className="text-sm text-gray-500">Manage lists, compose campaigns, and track performance</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lists" className="gap-2">
            <Users className="h-4 w-4" /> Mailing Lists
          </TabsTrigger>
          <TabsTrigger value="compose" className="gap-2">
            <FileText className="h-4 w-4" /> Compose Campaign
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <BarChart3 className="h-4 w-4" /> Sent Campaigns
          </TabsTrigger>
        </TabsList>

        {/* ==== TAB 1: Mailing Lists ==== */}
        <TabsContent value="lists">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your Mailing Lists</h2>
              <Button onClick={() => setShowCreateList(true)} className="gap-2">
                <Plus className="h-4 w-4" /> New List
              </Button>
            </div>

            {listsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading mailing lists...</span>
              </div>
            ) : listsError ? (
              <div className="text-center py-12 text-red-500" role="alert">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>{listsError}</p>
                <Button variant="outline" className="mt-3" onClick={fetchLists}>Retry</Button>
              </div>
            ) : lists.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No mailing lists yet</p>
                  <p className="text-gray-400 text-sm mt-1">Create your first mailing list to start sending campaigns</p>
                  <Button className="mt-4 gap-2" onClick={() => setShowCreateList(true)}>
                    <Plus className="h-4 w-4" /> Create List
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {lists.map(list => (
                  <Card key={list.id} className="overflow-hidden">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{list.name}</h3>
                          {list.description && (
                            <p className="text-sm text-gray-500 mt-0.5">{list.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{list.member_count || 0} members</p>
                          <p className="text-xs text-gray-400">Created {formatDate(list.created_at)}</p>
                        </div>
                        <Button
                          variant="ghost" size="sm"
                          onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          aria-label="Delete mailing list"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded members section */}
                    {expandedListId === list.id && (
                      <div className="border-t border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700">Members</h4>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAddMembers(true)}>
                            <ListPlus className="h-3.5 w-3.5" /> Add Members
                          </Button>
                        </div>

                        {membersLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        ) : members.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 text-sm">
                            No members in this list yet
                          </div>
                        ) : (
                          <>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Email</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Name</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Company</th>
                                    <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                                    <th className="w-16"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {members.map(member => (
                                    <tr key={member.id} className="border-b border-gray-100 last:border-0">
                                      <td className="px-4 py-2.5 text-gray-900">{member.email}</td>
                                      <td className="px-4 py-2.5 text-gray-700">{member.name || '-'}</td>
                                      <td className="px-4 py-2.5 text-gray-700">{member.company || '-'}</td>
                                      <td className="px-4 py-2.5">
                                        <Badge className={statusVariant(member.status || 'active')}>
                                          {member.status || 'active'}
                                        </Badge>
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <Button
                                          variant="ghost" size="sm"
                                          disabled={removingMemberId === member.id}
                                          onClick={() => handleRemoveMember(member.id)}
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                          aria-label="Remove member"
                                        >
                                          {removingMemberId === member.id
                                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            : <UserMinus className="h-3.5 w-3.5" />
                                          }
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Members pagination */}
                            {membersTotalPages > 1 && (
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-500">
                                  Page {membersPage} of {membersTotalPages}
                                </span>
                                <div className="flex gap-1.5">
                                  <Button
                                    variant="outline" size="sm"
                                    disabled={membersPage <= 1}
                                    onClick={() => setMembersPage(p => p - 1)}
                                    aria-label="Previous page"
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline" size="sm"
                                    disabled={membersPage >= membersTotalPages}
                                    onClick={() => setMembersPage(p => p + 1)}
                                    aria-label="Next page"
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Create List Dialog */}
          <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Mailing List</DialogTitle>
                <DialogDescription>Add a new list to organize your email recipients</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>List Name *</Label>
                  <Input
                    placeholder="e.g. Newsletter Subscribers"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of this list..."
                    value={newListDesc}
                    onChange={e => setNewListDesc(e.target.value)}
                    className="mt-1.5"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateList(false)}>Cancel</Button>
                <Button onClick={handleCreateList} disabled={creatingList || !newListName.trim()} className="gap-2">
                  {creatingList && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create List
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Members Dialog */}
          <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Members</DialogTitle>
                <DialogDescription>Enter email addresses, one per line or comma-separated</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Email Addresses *</Label>
                  <Textarea
                    placeholder={"john@example.com\njane@example.com\nor: john@example.com, jane@example.com"}
                    value={addMembersText}
                    onChange={e => setAddMembersText(e.target.value)}
                    className="mt-1.5 font-mono text-sm"
                    rows={5}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Default Name (optional)</Label>
                    <Input
                      placeholder="Contact name"
                      value={addMemberName}
                      onChange={e => setAddMemberName(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Default Company (optional)</Label>
                    <Input
                      placeholder="Company name"
                      value={addMemberCompany}
                      onChange={e => setAddMemberCompany(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddMembers(false)}>Cancel</Button>
                <Button onClick={handleAddMembers} disabled={addingMembers || !addMembersText.trim()} className="gap-2">
                  {addingMembers && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add Members
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ==== TAB 2: Compose Campaign ==== */}
        <TabsContent value="compose">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Form */}
            <div className="lg:col-span-2 space-y-5">
              {/* AI Writer */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" /> AI Email Writer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Topic / Context</Label>
                    <Input
                      placeholder="e.g. Product launch announcement for new CRM features"
                      value={aiTopic}
                      onChange={e => setAiTopic(e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label>Tone</Label>
                      <Select value={aiTone} onValueChange={setAiTone}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="promotional">Promotional</SelectItem>
                          <SelectItem value="informational">Informational</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiTopic.trim()} className="gap-2">
                      {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      AI Generate Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Campaign form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {composeError && (
                    <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm flex items-center gap-2" role="alert">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {composeError}
                      <button onClick={() => setComposeError(null)} className="ml-auto" aria-label="Dismiss error"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Subject *</Label>
                      <Input
                        placeholder="e.g., New Product Launch Announcement"
                        value={composeSubject}
                        onChange={e => setComposeSubject(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label>From Name</Label>
                      <Input
                        placeholder="e.g., Ashish from Mobilise"
                        value={composeFromName}
                        onChange={e => setComposeFromName(e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Select Mailing List *</Label>
                      <Select value={composeListId} onValueChange={setComposeListId}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Choose a list..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lists.map(l => (
                            <SelectItem key={l.id} value={String(l.id)}>
                              {l.name} ({l.member_count || 0} members)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Attach to Campaign (optional)</Label>
                      <Select value={composeCampaignId || 'none'} onValueChange={v => setComposeCampaignId(v === 'none' ? '' : v)}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {marketingCampaigns.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Email Body *</Label>
                    <Textarea
                      placeholder="Write your email content here..."
                      value={composeBody}
                      onChange={e => setComposeBody(e.target.value)}
                      className="mt-1.5 min-h-[200px] font-mono text-sm"
                      rows={10}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button variant="outline" onClick={handleSaveDraft} disabled={composeSaving} className="gap-2">
                      {composeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Draft
                    </Button>
                    <Button onClick={handleSendNow} disabled={composeSending} className="gap-2">
                      {composeSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Send to All Members
                    </Button>
                    <Button variant="ghost" onClick={() => setShowPreview(true)} className="gap-2 ml-auto">
                      <Eye className="h-4 w-4" /> Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Live Preview */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4" /> Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Email header */}
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Subject</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                        {composeSubject || 'Your subject line...'}
                      </p>
                      {composeFromName && (
                        <p className="text-xs text-gray-500 mt-1">From: {composeFromName}</p>
                      )}
                    </div>
                    {/* Email body */}
                    <div className="p-4 min-h-[200px]">
                      {composeBody ? (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {composeBody}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Email body will appear here...</p>
                      )}
                    </div>
                  </div>
                  {composeListId && (
                    <p className="text-xs text-gray-400 mt-2">
                      Sending to: {lists.find(l => String(l.id) === composeListId)?.name || 'Unknown list'}
                      {' '}({lists.find(l => String(l.id) === composeListId)?.member_count || 0} members)
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Full Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Email Preview</DialogTitle>
              </DialogHeader>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <p className="font-semibold text-gray-900">{composeSubject || '(No subject)'}</p>
                  {composeFromName && <p className="text-sm text-gray-500 mt-1">From: {composeFromName}</p>}
                  {composeListId && (
                    <p className="text-xs text-gray-400 mt-1">
                      To: {lists.find(l => String(l.id) === composeListId)?.name}
                    </p>
                  )}
                </div>
                <div className="p-6 min-h-[300px]">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {composeBody || '(No content)'}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowPreview(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ==== TAB 3: Sent Campaigns ==== */}
        <TabsContent value="sent">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Sent Campaigns</h2>

            {sentLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading campaigns...</span>
              </div>
            ) : sentError ? (
              <div className="text-center py-12 text-red-500" role="alert">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>{sentError}</p>
                <Button variant="outline" className="mt-3" onClick={fetchSentCampaigns}>Retry</Button>
              </div>
            ) : sentCampaigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Send className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No campaigns yet</p>
                  <p className="text-gray-400 text-sm mt-1">Compose and send your first email campaign</p>
                  <Button className="mt-4 gap-2" onClick={() => setActiveTab('compose')}>
                    <FileText className="h-4 w-4" /> Compose Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">List</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Sent Date</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Sent</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">
                          <span className="flex items-center justify-end gap-1"><MailOpen className="h-3.5 w-3.5" /> Opened</span>
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">
                          <span className="flex items-center justify-end gap-1"><MousePointerClick className="h-3.5 w-3.5" /> Clicked</span>
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Bounced</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Unsubs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentCampaigns.map(campaign => {
                        const openRate = campaign.total_sent > 0
                          ? (campaign.total_opened / campaign.total_sent) * 100 : 0;
                        const clickRate = campaign.total_sent > 0
                          ? (campaign.total_clicked / campaign.total_sent) * 100 : 0;

                        return (
                          <tr key={campaign.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900 max-w-[250px] truncate">{campaign.subject}</p>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{campaign.list_name || '-'}</td>
                            <td className="px-4 py-3">
                              <Badge className={statusVariant(campaign.status)}>
                                {campaign.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(campaign.sent_at)}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{campaign.total_sent}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-medium text-gray-900">{campaign.total_opened}</span>
                              <span className={`text-xs ml-1 font-medium ${rateColor(openRate)}`}>
                                ({openRate.toFixed(1)}%)
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-medium text-gray-900">{campaign.total_clicked}</span>
                              <span className={`text-xs ml-1 font-medium ${rateColor(clickRate)}`}>
                                ({clickRate.toFixed(1)}%)
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{campaign.total_bounced}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{campaign.total_unsubscribed}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
