import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Search,
  Plus,
  X,
  Pencil,
  Trash2,
  Megaphone,
  BarChart3,
  Calendar,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Mail,
  Share2,
  Layers,
  Target,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Zap,
  Send,
  Eye,
  Hash,
  Video,
  Paperclip,
  Upload,
  FolderOpen,
} from 'lucide-react';
import { marketingCampaignApi, audienceSegmentApi, collateralApi, emailMarketingApi } from '../lib/api';

// ==================== Type definitions ====================

interface CampaignChannel {
  id: number;
  campaign_id: number;
  channel: string;
  channel_type?: string; // alias — backend returns 'channel'
  post_content?: string;
  content?: string; // alias
  subject_line?: string;
  scheduled_at?: string;
  published_at?: string;
  external_post_id?: string;
  status: string;
  engagement_metrics?: any;
  media_urls?: any;
}

interface Campaign {
  id: number;
  name: string;
  description: string;
  type: 'email' | 'social' | 'multi-channel' | 'content';
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'completed';
  start_date: string;
  end_date: string;
  budget: number;
  target_audience_id: number | null;
  target_audience_name?: string;
  channels?: CampaignChannel[];
  created_at: string;
  updated_at: string;
}

interface AudienceSegment {
  id: number;
  name: string;
  description: string;
  contact_count: number;
}

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalBudget: number;
}

interface AIGenerateForm {
  productName: string;
  goal: string;
  targetAudience: string;
  channels: string[];
}

interface AIGeneratedContent {
  [channel: string]: {
    subject?: string;
    content: string;
    hashtags?: string[];
    cta?: string;
  };
}

// ==================== Helper functions ====================

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'active': return 'bg-green-100 text-green-700 border-green-200';
    case 'paused': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'completed': return 'bg-purple-100 text-purple-700 border-purple-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'email': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'social': return 'bg-pink-100 text-pink-700 border-pink-200';
    case 'multi-channel': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'content': return 'bg-amber-100 text-amber-700 border-amber-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft': return <Clock className="h-3.5 w-3.5" />;
    case 'scheduled': return <Calendar className="h-3.5 w-3.5" />;
    case 'active': return <PlayCircle className="h-3.5 w-3.5" />;
    case 'paused': return <PauseCircle className="h-3.5 w-3.5" />;
    case 'completed': return <CheckCircle2 className="h-3.5 w-3.5" />;
    default: return null;
  }
}

function getChannelIcon(channel: string | undefined | null) {
  if (!channel) return <Megaphone className="h-4 w-4 text-gray-500" />;
  switch (channel.toLowerCase()) {
    case 'email': return <Mail className="h-4 w-4 text-sky-600" />;
    case 'linkedin': return <Share2 className="h-4 w-4 text-blue-700" />;
    case 'facebook': return <Share2 className="h-4 w-4 text-blue-500" />;
    case 'twitter': case 'x': return <Hash className="h-4 w-4 text-gray-800" />;
    case 'instagram': return <Share2 className="h-4 w-4 text-pink-500" />;
    case 'youtube': return <Video className="h-4 w-4 text-red-600" />;
    default: return <Megaphone className="h-4 w-4 text-gray-500" />;
  }
}

const CAMPAIGN_GOALS = [
  { value: 'awareness', label: 'Brand Awareness' },
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'conversion', label: 'Conversion / Sales' },
];

const ALL_CHANNELS = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'email', label: 'Email' },
];

// ==================== Campaign Create/Edit Dialog ====================

function CampaignDialog({
  isOpen,
  onClose,
  campaign,
  segments,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  segments: AudienceSegment[];
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<string>('email');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [targetAudienceId, setTargetAudienceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (campaign) {
      setName(campaign.name || '');
      setDescription(campaign.description || '');
      setType(campaign.type || 'email');
      setStartDate(campaign.start_date ? campaign.start_date.split('T')[0] : '');
      setEndDate(campaign.end_date ? campaign.end_date.split('T')[0] : '');
      setBudget(campaign.budget ? String(campaign.budget) : '');
      setTargetAudienceId(campaign.target_audience_id ? String(campaign.target_audience_id) : '');
    } else {
      setName('');
      setDescription('');
      setType('email');
      setStartDate('');
      setEndDate('');
      setBudget('');
      setTargetAudienceId('');
    }
    setError('');
  }, [campaign, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) { setError('Campaign name is required.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        type,
        start_date: startDate,
        end_date: endDate || undefined,
        budget: budget ? parseFloat(budget) : 0,
        target_audience_id: targetAudienceId ? parseInt(targetAudienceId) : null,
      };

      let res;
      if (campaign) {
        res = await marketingCampaignApi.update(campaign.id, payload);
      } else {
        res = await marketingCampaignApi.create(payload);
      }

      if (res.success || res.data) {
        onSaved();
        onClose();
      } else {
        setError(res.error || 'Failed to save campaign.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name *</Label>
            <Input id="campaign-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Q2 Product Launch" />
          </div>

          <div>
            <Label htmlFor="campaign-desc">Description</Label>
            <Textarea id="campaign-desc" value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Brief description of the campaign objectives..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="social">Social Media</SelectItem>
                  <SelectItem value="multi-channel">Multi-Channel</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select value={targetAudienceId} onValueChange={setTargetAudienceId}>
                <SelectTrigger><SelectValue placeholder="Select segment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific segment</SelectItem>
                  {segments.map(seg => (
                    <SelectItem key={seg.id} value={String(seg.id)}>
                      {seg.name} ({seg.contact_count || 0} contacts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="campaign-start">Start Date *</Label>
              <Input id="campaign-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="campaign-end">End Date</Label>
              <Input id="campaign-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="campaign-budget">Budget (INR)</Label>
              <Input id="campaign-budget" type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g., 50000" />
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : campaign ? 'Update Campaign' : 'Create Campaign'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== AI Campaign Generator Dialog ====================

function AIGeneratorDialog({
  isOpen,
  onClose,
  onCampaignCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: () => void;
}) {
  const [form, setForm] = useState<AIGenerateForm>({
    productName: '',
    goal: 'awareness',
    targetAudience: '',
    channels: ['linkedin', 'email'],
  });
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<AIGeneratedContent | null>(null);
  const [activeChannelTab, setActiveChannelTab] = useState('');
  const [editedContent, setEditedContent] = useState<AIGeneratedContent>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'review'>('form');

  const toggleChannel = (ch: string) => {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter(c => c !== ch)
        : [...prev.channels, ch],
    }));
  };

  const handleGenerate = async () => {
    if (!form.productName.trim()) { setError('Product/Service name is required.'); return; }
    if (!form.targetAudience.trim()) { setError('Target audience description is required.'); return; }
    if (form.channels.length === 0) { setError('Select at least one channel.'); return; }

    setGenerating(true);
    setError('');
    try {
      const res = await marketingCampaignApi.aiGenerate({
        productName: form.productName,
        goal: form.goal,
        targetAudience: form.targetAudience,
        channels: form.channels,
      });
      if (res.success && res.data) {
        const content = res.data.generated_content || res.data;
        setGeneratedContent(content);
        setEditedContent(content);
        setActiveChannelTab(form.channels[0] || '');
        setStep('review');
      } else {
        setError(res.error || 'AI generation failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateCampaign = async () => {
    setSaving(true);
    setError('');
    try {
      const campaignData = {
        name: `${form.productName} - ${CAMPAIGN_GOALS.find(g => g.value === form.goal)?.label || form.goal}`,
        description: `AI-generated campaign for ${form.productName} targeting ${form.targetAudience}`,
        type: form.channels.length > 1 ? 'multi-channel' : (form.channels[0] === 'email' ? 'email' : 'social'),
        start_date: new Date().toISOString().split('T')[0],
        budget: 0,
        channels: Object.entries(editedContent).map(([channel, data]) => ({
          channel_type: channel,
          content: data.content,
          subject_line: data.subject || '',
          status: 'draft',
        })),
      };

      const res = await marketingCampaignApi.create(campaignData);
      if (res.success || res.data) {
        onCampaignCreated();
        handleReset();
        onClose();
      } else {
        setError(res.error || 'Failed to create campaign.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm({ productName: '', goal: 'awareness', targetAudience: '', channels: ['linkedin', 'email'] });
    setGeneratedContent(null);
    setEditedContent({});
    setStep('form');
    setError('');
  };

  const updateChannelContent = (channel: string, field: string, value: string) => {
    setEditedContent(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: value },
    }));
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">AI Campaign Generator</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { handleReset(); onClose(); }} aria-label="Close dialog"><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5">
          {step === 'form' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Let AI create campaign content for your product or service across multiple channels.</p>

              <div>
                <Label htmlFor="ai-product">Product / Service Name *</Label>
                <Input id="ai-product" value={form.productName} onChange={e => setForm(prev => ({ ...prev, productName: e.target.value }))} placeholder="e.g., LeadTrack Pro CRM" />
              </div>

              <div>
                <Label>Campaign Goal</Label>
                <Select value={form.goal} onValueChange={v => setForm(prev => ({ ...prev, goal: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_GOALS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ai-audience">Target Audience Description *</Label>
                <Textarea id="ai-audience" value={form.targetAudience} onChange={e => setForm(prev => ({ ...prev, targetAudience: e.target.value }))} rows={2} placeholder="e.g., B2B SaaS founders, IT managers at mid-size companies in India..." />
              </div>

              <div>
                <Label>Channels to Generate For</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALL_CHANNELS.map(ch => (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => toggleChannel(ch.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        form.channels.includes(ch.value)
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {getChannelIcon(ch.value)}
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { handleReset(); onClose(); }}>Cancel</Button>
                <Button onClick={handleGenerate} disabled={generating}>
                  {generating ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-1.5" /> Generate with AI</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'review' && generatedContent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Generated Campaign Content</h3>
                  <p className="text-sm text-gray-500">Review and edit the generated content for each channel before creating the campaign.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setStep('form')}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              </div>

              <Tabs value={activeChannelTab} onValueChange={setActiveChannelTab}>
                <TabsList>
                  {form.channels.map(ch => (
                    <TabsTrigger key={ch} value={ch} className="flex items-center gap-1.5">
                      {getChannelIcon(ch)}
                      {ALL_CHANNELS.find(c => c.value === ch)?.label || ch}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {form.channels.map(ch => (
                  <TabsContent key={ch} value={ch}>
                    <div className="space-y-3 p-1">
                      {editedContent[ch]?.subject !== undefined && (
                        <div>
                          <Label>Subject Line</Label>
                          <Input
                            value={editedContent[ch]?.subject || ''}
                            onChange={e => updateChannelContent(ch, 'subject', e.target.value)}
                          />
                        </div>
                      )}
                      <div>
                        <Label>Content</Label>
                        <Textarea
                          value={editedContent[ch]?.content || ''}
                          onChange={e => updateChannelContent(ch, 'content', e.target.value)}
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                      {editedContent[ch]?.hashtags && editedContent[ch].hashtags!.length > 0 && (
                        <div>
                          <Label>Hashtags</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {editedContent[ch].hashtags!.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {editedContent[ch]?.cta && (
                        <div>
                          <Label>Call to Action</Label>
                          <Input
                            value={editedContent[ch]?.cta || ''}
                            onChange={e => updateChannelContent(ch, 'cta', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { handleReset(); onClose(); }}>Discard</Button>
                <Button onClick={handleCreateCampaign} disabled={saving}>
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creating...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-1.5" /> Create Campaign</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Media Attachment Helpers ====================

function ExistingAttachments({ mediaUrls }: { mediaUrls: any }) {
  let media: any[] = [];
  try {
    if (mediaUrls) media = typeof mediaUrls === 'string' ? JSON.parse(mediaUrls) : mediaUrls;
    if (!Array.isArray(media)) media = [];
  } catch { media = []; }

  if (media.length === 0) return null;

  return (
    <div className="mt-3">
      <span className="text-xs font-medium text-gray-500">Attachments:</span>
      <div className="flex flex-wrap gap-2 mt-1">
        {media.map((m: any, i: number) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-200">
            <Paperclip className="h-3 w-3" />
            {m.fileName || 'Attachment'}
          </span>
        ))}
      </div>
    </div>
  );
}

function MediaAttachmentSection({ campaignId, channelId, mediaUrls, onUpdated }: { campaignId: number; channelId: number; mediaUrls: any; onUpdated: () => void }) {
  const [showCollateralPicker, setShowCollateralPicker] = useState(false);
  const [collateralItems, setCollateralItems] = useState<any[]>([]);
  const [selectedCollateralIds, setSelectedCollateralIds] = useState<number[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loadingCollateral, setLoadingCollateral] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  let media: any[] = [];
  try {
    if (mediaUrls) media = typeof mediaUrls === 'string' ? JSON.parse(mediaUrls) : mediaUrls;
    if (!Array.isArray(media)) media = [];
  } catch { media = []; }

  const loadCollateral = async () => {
    setLoadingCollateral(true);
    try {
      const res = await collateralApi.getAll({ pageSize: 50 });
      if (res.success) setCollateralItems(res.data?.data || []);
    } catch { /* silent */ }
    finally { setLoadingCollateral(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await marketingCampaignApi.uploadChannelMedia(campaignId, channelId, file);
      if (res.success) onUpdated();
      else alert('Upload failed: ' + (res.error || ''));
    } catch (err) {
      alert('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAttachFromCollateral = async () => {
    if (selectedCollateralIds.length === 0) return;
    try {
      const res = await marketingCampaignApi.attachCollateral(campaignId, channelId, selectedCollateralIds);
      if (res.success) {
        setShowCollateralPicker(false);
        setSelectedCollateralIds([]);
        onUpdated();
      }
    } catch { alert('Failed to attach'); }
  };

  return (
    <div className="border rounded-lg p-3 bg-gray-50/50">
      <Label className="text-sm font-medium">
        Attachments {media.length > 0 && <span className="text-xs text-gray-400 ml-1">({media.length} file{media.length !== 1 ? 's' : ''})</span>}
      </Label>

      {/* Existing attachments */}
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {media.map((m: any, i: number) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs border border-blue-200">
              <Paperclip className="h-3 w-3" />
              {m.fileName || 'Attachment'}
              <span className="text-blue-400">({Math.round((m.fileSize || 0) / 1024)} KB)</span>
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-2">
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setShowCollateralPicker(true); loadCollateral(); }}>
          <FolderOpen className="h-3 w-3 mr-1" /> Pick from Collateral
        </Button>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
          {uploading ? 'Uploading...' : 'Upload New'}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mov" />
      </div>

      {/* Collateral Picker */}
      {showCollateralPicker && (
        <div className="mt-3 border rounded-lg p-3 bg-white max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Select from Collateral Library:</p>
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowCollateralPicker(false)}>Close</Button>
          </div>
          {loadingCollateral ? (
            <p className="text-xs text-gray-400 py-4 text-center">Loading...</p>
          ) : collateralItems.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No collateral items found</p>
          ) : (
            <>
              <div className="space-y-1">
                {collateralItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-xs hover:bg-gray-50 rounded px-2 py-1.5 cursor-pointer"
                    onClick={() => setSelectedCollateralIds(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])}>
                    <input type="checkbox" checked={selectedCollateralIds.includes(item.id)} onChange={() => {}} className="h-3.5 w-3.5 rounded text-indigo-600" />
                    <Paperclip className="h-3 w-3 text-gray-400 shrink-0" />
                    <span className="flex-1 truncate">{item.title || item.original_name}</span>
                    <span className="text-gray-400 shrink-0">{item.file_extension?.toUpperCase()}</span>
                    <span className="text-gray-400 shrink-0">{Math.round((item.file_size || 0) / 1024)} KB</span>
                  </div>
                ))}
              </div>
              {selectedCollateralIds.length > 0 && (
                <Button size="sm" className="w-full mt-2 text-xs" onClick={handleAttachFromCollateral}>
                  Attach {selectedCollateralIds.length} Selected
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== Channel Management Dialog ====================

function ChannelManagementDialog({
  isOpen,
  onClose,
  campaign,
  onUpdated,
}: {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onUpdated: () => void;
}) {
  const [channels, setChannels] = useState<CampaignChannel[]>([]);
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingChannel, setAddingChannel] = useState(false);
  const [newChannelType, setNewChannelType] = useState('linkedin');
  const [newChannelContent, setNewChannelContent] = useState('');
  const [newChannelSubject, setNewChannelSubject] = useState('');
  const [newChannelScheduleDate, setNewChannelScheduleDate] = useState('');
  const [newChannelScheduleTime, setNewChannelScheduleTime] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [error, setError] = useState('');
  const [newChannelListId, setNewChannelListId] = useState('none');
  const [emailLists, setEmailLists] = useState<any[]>([]);

  // Inline edit state
  const [editingChannelId, setEditingChannelId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editScheduleDate, setEditScheduleDate] = useState('');
  const [editScheduleTime, setEditScheduleTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (campaign && isOpen) {
      loadCampaignDetails();
    }
  }, [campaign, isOpen]);

  useEffect(() => {
    if (isOpen) {
      emailMarketingApi.getLists().then(res => {
        if (res.success) setEmailLists(res.data || []);
      }).catch(() => {});
    }
  }, [isOpen]);

  const loadCampaignDetails = async () => {
    if (!campaign) return;
    setLoading(true);
    try {
      const res = await marketingCampaignApi.getById(campaign.id);
      if (res.success && res.data) {
        const chs = res.data.channels || [];
        setChannels(chs);
        if (chs.length > 0) setActiveTab(String(chs[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChannel = async () => {
    if (!campaign || !newChannelContent.trim()) return;
    setError('');
    try {
      const scheduled_at = newChannelScheduleDate
        ? `${newChannelScheduleDate}T${newChannelScheduleTime || '09:00'}:00`
        : undefined;

      const res = await marketingCampaignApi.addChannel(campaign.id, {
        channel_type: newChannelType,
        content: newChannelContent,
        subject_line: newChannelSubject || undefined,
        scheduled_at,
        target_list_id: newChannelListId !== 'none' ? parseInt(newChannelListId) : undefined,
        status: scheduled_at ? 'scheduled' : 'draft',
      });
      if (res.success || res.data) {
        setAddingChannel(false);
        setNewChannelContent('');
        setNewChannelSubject('');
        setNewChannelScheduleDate('');
        setNewChannelScheduleTime('');
        setNewChannelListId('none');
        loadCampaignDetails();
        onUpdated();
      } else {
        setError(res.error || 'Failed to add channel.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add channel.');
    }
  };

  const handleRemoveChannel = async (channelId: number) => {
    if (!campaign || !confirm('Remove this channel?')) return;
    try {
      await marketingCampaignApi.removeChannel(campaign.id, channelId);
      loadCampaignDetails();
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove channel.');
    }
  };

  const startEditChannel = (ch: any) => {
    setEditingChannelId(ch.id);
    setEditContent(ch.post_content || ch.content || '');
    setEditSubject(ch.subject_line || '');
    const schedDate = ch.scheduled_at ? new Date(ch.scheduled_at) : null;
    setEditScheduleDate(schedDate ? schedDate.toISOString().split('T')[0] : '');
    setEditScheduleTime(schedDate ? schedDate.toTimeString().substring(0, 5) : '');
  };

  const cancelEditChannel = () => {
    setEditingChannelId(null);
    setEditContent('');
    setEditSubject('');
  };

  const saveEditChannel = async () => {
    if (!campaign || !editingChannelId) return;
    setSavingEdit(true);
    try {
      const scheduled_at = editScheduleDate ? `${editScheduleDate}T${editScheduleTime || '09:00'}:00` : undefined;
      const res = await marketingCampaignApi.updateChannel(campaign.id, editingChannelId, {
        post_content: editContent,
        subject_line: editSubject || undefined,
        scheduled_at,
      });
      if (res.success || res.data) {
        setEditingChannelId(null);
        loadCampaignDetails();
      } else {
        setError(res.error || 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAIContentGenerate = async (channelType: string) => {
    if (!campaign) return;
    setGeneratingAI(true);
    setError('');
    try {
      const res = await marketingCampaignApi.aiContent({
        campaign_id: campaign.id,
        channel_type: channelType,
        campaign_name: campaign.name,
        campaign_description: campaign.description,
        campaign_type: campaign.type,
        target_audience: campaign.target_audience_name || '',
        budget: campaign.budget,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
      });
      if (res.success && res.data) {
        if (editingChannelId) {
          setEditContent(res.data.content || '');
          setEditSubject(res.data.subject || editSubject);
        } else {
          setNewChannelContent(res.data.content || '');
          setNewChannelSubject(res.data.subject || '');
        }
      } else {
        setError(res.error || 'AI content generation failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI content generation failed.');
    } finally {
      setGeneratingAI(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && isOpen) onClose(); };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !campaign) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Channel Management</h2>
            <p className="text-sm text-gray-500">{campaign.name}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog"><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : channels.length === 0 && !addingChannel ? (
            <div className="text-center py-12">
              <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No channels configured yet.</p>
              <Button className="mt-3" onClick={() => setAddingChannel(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Channel
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{channels.length} channel{channels.length !== 1 ? 's' : ''} configured</p>
                <Button size="sm" onClick={() => setAddingChannel(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add Channel
                </Button>
              </div>

              {channels.length > 0 && (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    {channels.map(ch => (
                      <TabsTrigger key={ch.id} value={String(ch.id)} className="flex items-center gap-1.5">
                        {getChannelIcon((ch.channel || ch.channel_type || ''))}
                        {(ch.channel || ch.channel_type || '')}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {channels.map(ch => (
                    <TabsContent key={ch.id} value={String(ch.id)}>
                      <Card className="p-4">
                        {editingChannelId === ch.id ? (
                          /* ===== EDIT MODE ===== */
                          <div className="space-y-3">
                            {(ch.channel || ch.channel_type || '').toLowerCase() === 'email' && (
                              <div>
                                <Label>Subject Line</Label>
                                <Input value={editSubject} onChange={e => setEditSubject(e.target.value)} placeholder="Email subject" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <Label>Content</Label>
                                <Button variant="ghost" size="sm" onClick={() => handleAIContentGenerate((ch.channel || ch.channel_type || ''))} disabled={generatingAI}>
                                  {generatingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                                  AI Regenerate
                                </Button>
                              </div>
                              <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={8} />
                              {(ch.channel || '').toLowerCase() === 'email' && editContent.includes('<') && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-400 mb-1">Preview:</p>
                                  <div className="border rounded-lg p-3 bg-white max-h-48 overflow-y-auto text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editContent) }} />
                                </div>
                              )}
                            </div>
                            <div>
                              <Label>Schedule</Label>
                              <div className="flex gap-2 mt-1">
                                <Input type="date" value={editScheduleDate} onChange={e => setEditScheduleDate(e.target.value)} className="flex-1" />
                                <Input type="time" value={editScheduleTime} onChange={e => setEditScheduleTime(e.target.value)} className="w-32" />
                              </div>
                            </div>

                            {/* Media Attachments Section */}
                            <MediaAttachmentSection
                              campaignId={campaign.id}
                              channelId={ch.id}
                              mediaUrls={ch.media_urls}
                              onUpdated={loadCampaignDetails}
                            />

                            <div className="flex justify-end gap-2 pt-2 border-t">
                              <Button variant="outline" size="sm" onClick={cancelEditChannel}>Cancel</Button>
                              <Button size="sm" onClick={saveEditChannel} disabled={savingEdit}>
                                {savingEdit ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* ===== READ MODE ===== */
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(ch.status)}`}>{ch.status}</span>
                              {ch.scheduled_at && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {ch.status === 'published' ? 'Published' : 'Scheduled'}: {formatDate(ch.scheduled_at)}
                                </span>
                              )}
                              {ch.published_at && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Published: {formatDate(ch.published_at)}
                                </span>
                              )}
                            </div>
                            {ch.subject_line && (
                              <div className="mb-2">
                                <span className="text-xs font-medium text-gray-500">Subject:</span>
                                <p className="text-sm">{ch.subject_line}</p>
                              </div>
                            )}
                            {ch.target_list_id && (
                              <div className="mb-2">
                                <span className="text-xs font-medium text-gray-500">Email List:</span>
                                <span className="text-xs ml-1 text-indigo-600">{emailLists.find(l => l.id === ch.target_list_id)?.name || `List #${ch.target_list_id}`}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-xs font-medium text-gray-500">Content:</span>
                              {(ch.post_content || ch.content || '').includes('<') ? (
                                <div className="text-sm mt-1 bg-gray-50 rounded p-3 max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ch.post_content || ch.content || '') }} />
                              ) : (
                                <p className="text-sm whitespace-pre-wrap mt-1 bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">{ch.post_content || ch.content}</p>
                              )}
                            </div>

                            {/* Show existing attachments in read mode */}
                            <ExistingAttachments mediaUrls={ch.media_urls} />

                            <div className="flex justify-end gap-2 mt-3">
                              <Button variant="outline" size="sm" onClick={() => startEditChannel(ch)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleRemoveChannel(ch.id)}>
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              )}

              {addingChannel && (
                <Card className="p-4 mt-4 border-indigo-200 bg-indigo-50/30">
                  <h4 className="font-medium text-sm mb-3">Add New Channel</h4>
                  <div className="space-y-3">
                    <div>
                      <Label>Channel Type</Label>
                      <Select value={newChannelType} onValueChange={setNewChannelType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ALL_CHANNELS.map(ch => (
                            <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {(newChannelType === 'email') && (
                      <div>
                        <Label>Subject Line</Label>
                        <Input value={newChannelSubject} onChange={e => setNewChannelSubject(e.target.value)} placeholder="Email subject line" />
                      </div>
                    )}
                    {newChannelType === 'email' && (
                      <div>
                        <Label>Send to Email List *</Label>
                        <Select value={newChannelListId} onValueChange={setNewChannelListId}>
                          <SelectTrigger><SelectValue placeholder="Select an email list" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Select List --</SelectItem>
                            {emailLists.map(list => (
                              <SelectItem key={list.id} value={String(list.id)}>
                                {list.name} ({list.contact_count || 0} members)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400 mt-1">Campaign emails will be sent to all active members in this list</p>
                      </div>
                    )}
                    {/* Schedule */}
                    <div>
                      <Label>Schedule (optional — leave empty to publish immediately on activation)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input type="date" value={newChannelScheduleDate} onChange={e => setNewChannelScheduleDate(e.target.value)} className="flex-1" />
                        <Input type="time" value={newChannelScheduleTime} onChange={e => setNewChannelScheduleTime(e.target.value)} className="w-32" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {newChannelScheduleDate ? `Will be published on ${newChannelScheduleDate} at ${newChannelScheduleTime || '09:00'}` : 'Will be published immediately when campaign is activated'}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label>Content</Label>
                        <Button variant="ghost" size="sm" onClick={() => handleAIContentGenerate(newChannelType)} disabled={generatingAI}>
                          {generatingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                          AI Generate
                        </Button>
                      </div>
                      <Textarea value={newChannelContent} onChange={e => setNewChannelContent(e.target.value)} rows={6} placeholder="Enter channel content..." />
                      {/* HTML Preview for email */}
                      {newChannelType === 'email' && newChannelContent && newChannelContent.includes('<') && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-400 mb-1">Email Preview:</p>
                          <div className="border rounded-lg p-4 bg-white max-h-64 overflow-y-auto text-sm"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(newChannelContent) }} />
                        </div>
                      )}
                    </div>
                    {/* Media for new channel -- upload first, then attach after creation */}
                    <p className="text-xs text-gray-400 italic">You can attach files after saving the channel</p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setAddingChannel(false); setNewChannelContent(''); setNewChannelSubject(''); setNewChannelScheduleDate(''); setNewChannelScheduleTime(''); setNewChannelListId('none'); }}>Cancel</Button>
                      <Button size="sm" onClick={handleAddChannel} disabled={!newChannelContent.trim()}>Add Channel</Button>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-3" role="alert">{error}</div>}
        </div>
      </div>
    </div>
  );
}

// ==================== Campaign Card ====================

function CampaignCard({
  campaign,
  onEdit,
  onDelete,
  onManageChannels,
  onStatusChange,
  onActivate,
}: {
  campaign: Campaign;
  onEdit: (c: Campaign) => void;
  onDelete: (c: Campaign) => void;
  onManageChannels: (c: Campaign) => void;
  onStatusChange: (c: Campaign, status: string) => void;
  onActivate: (c: Campaign) => void;
}) {
  const channelTypes = campaign.channels?.map(ch => (ch.channel || ch.channel_type || '')) || [];
  const uniqueChannels = [...new Set(channelTypes)];

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate" title={campaign.name}>{campaign.name}</h3>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getTypeColor(campaign.type)}`}>{campaign.type}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(campaign.status)}`}>
              {getStatusIcon(campaign.status)}
              {campaign.status}
            </span>
          </div>
          {campaign.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{campaign.description}</p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(campaign.start_date)}
              {campaign.end_date && ` - ${formatDate(campaign.end_date)}`}
            </span>
            {campaign.budget > 0 && (
              <span className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                {formatINR(campaign.budget)}
              </span>
            )}
            {campaign.target_audience_name && (
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {campaign.target_audience_name}
              </span>
            )}
          </div>

          {uniqueChannels.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-gray-400">Channels:</span>
              {uniqueChannels.map(ch => (
                <span key={ch} title={ch} className="p-1 bg-gray-50 rounded">
                  {getChannelIcon(ch)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Status Actions */}
          <div className="flex items-center gap-1">
            {(campaign.status === 'draft' || campaign.status === 'paused') && (
              <Button size="sm" className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700 text-white gap-1"
                onClick={() => onActivate(campaign)}>
                <PlayCircle className="h-3 w-3" /> Activate
              </Button>
            )}
            {campaign.status === 'active' && (
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1 border-amber-300 text-amber-600 hover:bg-amber-50"
                onClick={() => onStatusChange(campaign, 'paused')}>
                <PauseCircle className="h-3 w-3" /> Pause
              </Button>
            )}
            {(campaign.status === 'active' || campaign.status === 'paused') && (
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1 border-purple-300 text-purple-600 hover:bg-purple-50"
                onClick={() => onStatusChange(campaign, 'completed')}>
                <CheckCircle2 className="h-3 w-3" /> Complete
              </Button>
            )}
          </div>
          {/* Management Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onManageChannels(campaign)} title="Manage Channels" aria-label="Manage channels">
              <Layers className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(campaign)} title="Edit Campaign" aria-label="Edit campaign">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(campaign)} title="Delete Campaign" aria-label="Delete campaign" className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ==================== Main Component ====================

export function CampaignBuilder() {
  // Data state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<AudienceSegment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({ totalCampaigns: 0, activeCampaigns: 0, completedCampaigns: 0, totalBudget: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Activate state
  const [activating, setActivating] = useState(false);
  const [activateResults, setActivateResults] = useState<any>(null);

  // Dialogs
  const [isCampaignDialogOpen, setIsCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [channelCampaign, setChannelCampaign] = useState<Campaign | null>(null);

  // ==================== Data loading ====================

  const loadStats = useCallback(async () => {
    try {
      const res = await marketingCampaignApi.getDashboard();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      // non-critical
    }
  }, []);

  const loadSegments = useCallback(async () => {
    try {
      const res = await audienceSegmentApi.getAll();
      if (res.success && res.data) {
        setSegments(Array.isArray(res.data) ? res.data : res.data.data || []);
      }
    } catch (err) {
      // non-critical
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    const params: any = { page, pageSize: 12 };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (typeFilter !== 'all') params.type = typeFilter;
    if (searchQuery.trim()) params.search = searchQuery.trim();

    try {
      const res = await marketingCampaignApi.getAll(params);
      if (res.success && res.data) {
        const data = res.data;
        setCampaigns(Array.isArray(data) ? data : data.data || []);
        setTotalPages(data.totalPages || 1);
      } else if (Array.isArray(res)) {
        setCampaigns(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns.');
    }
  }, [page, statusFilter, typeFilter, searchQuery]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadCampaigns(), loadStats(), loadSegments()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [loadCampaigns, loadStats, loadSegments]);

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [page, statusFilter, typeFilter, searchQuery]);

  // ==================== Actions ====================

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`Delete campaign "${campaign.name}"? This cannot be undone.`)) return;
    try {
      const res = await marketingCampaignApi.delete(campaign.id);
      if (res.success) {
        loadCampaigns();
        loadStats();
      }
    } catch (err) {
      alert('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsCampaignDialogOpen(true);
  };

  const handleStatusChange = async (campaign: Campaign, newStatus: string) => {
    const labels: Record<string, string> = { active: 'activate', paused: 'pause', completed: 'mark as completed' };
    if (!confirm(`${labels[newStatus] || newStatus} campaign "${campaign.name}"?`)) return;
    try {
      const res = await marketingCampaignApi.update(campaign.id, { status: newStatus });
      if (res.success) {
        loadCampaigns();
        loadStats();
      }
    } catch (err) {
      alert('Failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleAfterSave = () => {
    loadCampaigns();
    loadStats();
  };

  const handleActivateCampaign = async (campaign: Campaign) => {
    // Show confirmation with channel details
    const channelSummary = campaign.channels?.map(ch => {
      const platform = (ch.channel || ch.channel_type || 'unknown');
      if (ch.scheduled_at && new Date(ch.scheduled_at) > new Date()) {
        return `${platform} → Scheduled for ${new Date(ch.scheduled_at).toLocaleString()}`;
      }
      return `${platform} → Publish immediately`;
    }).join('\n') || 'No channels configured';

    if (!confirm(`Activate campaign "${campaign.name}"?\n\nThis will:\n${channelSummary}\n\nProceed?`)) return;

    setActivating(true);
    try {
      const res = await marketingCampaignApi.activateCampaign(campaign.id);
      if (res.success) {
        setActivateResults(res.data);
        loadCampaigns();
        loadStats();
        // Show results
        const results = res.data?.channelResults || [];
        const published = results.filter((r: any) => r.action === 'published').length;
        const scheduled = results.filter((r: any) => r.action === 'scheduled').length;
        const failed = results.filter((r: any) => r.action === 'failed').length;
        alert(`Campaign activated!\n\nPublished: ${published}\nScheduled: ${scheduled}${failed > 0 ? `\nFailed: ${failed}` : ''}`);
      } else {
        alert('Activation failed: ' + (res.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Activation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setActivating(false);
    }
  };

  // ==================== Render ====================

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage multi-channel marketing campaigns with AI assistance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
            <Sparkles className="h-4 w-4 mr-1.5" /> AI Generate Campaign
          </Button>
          <Button onClick={() => { setEditingCampaign(null); setIsCampaignDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Campaign
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)} aria-label="Dismiss error"><X className="h-3.5 w-3.5" /></Button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCampaigns}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Megaphone className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.activeCampaigns}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
              <PlayCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.completedCampaigns}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatINR(stats.totalBudget)}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <IndianRupee className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-10"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="social">Social Media</SelectItem>
            <SelectItem value="multi-channel">Multi-Channel</SelectItem>
            <SelectItem value="content">Content</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No campaigns found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters or search query.'
              : 'Get started by creating your first marketing campaign or use AI to generate one.'}
          </p>
          {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
                <Sparkles className="h-4 w-4 mr-1.5" /> AI Generate
              </Button>
              <Button onClick={() => { setEditingCampaign(null); setIsCampaignDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1.5" /> New Campaign
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onManageChannels={c => setChannelCampaign(c)}
              onStatusChange={handleStatusChange}
              onActivate={handleActivateCampaign}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CampaignDialog
        isOpen={isCampaignDialogOpen}
        onClose={() => { setIsCampaignDialogOpen(false); setEditingCampaign(null); }}
        campaign={editingCampaign}
        segments={segments}
        onSaved={handleAfterSave}
      />

      <AIGeneratorDialog
        isOpen={isAIDialogOpen}
        onClose={() => setIsAIDialogOpen(false)}
        onCampaignCreated={handleAfterSave}
      />

      <ChannelManagementDialog
        isOpen={!!channelCampaign}
        onClose={() => setChannelCampaign(null)}
        campaign={channelCampaign}
        onUpdated={handleAfterSave}
      />
    </div>
  );
}
