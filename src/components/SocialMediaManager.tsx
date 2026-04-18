import { useState, useEffect, useCallback } from 'react';
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
  Plus,
  X,
  Trash2,
  Pencil,
  Send,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Users,
  Eye,
  ThumbsUp,
  Share2,
  MessageCircle,
  BarChart3,
  Wifi,
  WifiOff,
  Link2,
  Unplug,
  ExternalLink,
} from 'lucide-react';
import { socialMediaApi } from '../lib/api';

// ==================== Type definitions ====================

interface SocialAccount {
  id: number;
  platform: string;
  account_name: string;
  account_id: string;
  page_id?: string;
  profile_url?: string;
  followers_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SocialPost {
  id: number;
  content: string;
  platforms: string[];
  platform?: string;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduled_at?: string;
  published_at?: string;
  engagement_metrics?: {
    likes?: number;
    shares?: number;
    comments?: number;
    impressions?: number;
    clicks?: number;
    reach?: number;
  };
  created_at: string;
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

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(num: number | undefined): string {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  linkedin: 3000,
  facebook: 63206,
  twitter: 280,
  instagram: 2200,
  youtube: 5000,
};

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'engaging', label: 'Engaging' },
  { value: 'informative', label: 'Informative' },
];

// ==================== Platform SVG Icons ====================

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className || 'h-6 w-6'} fill="none">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path d="M7.5 10.5V17H9.5V10.5H7.5ZM8.5 9.5C9.05 9.5 9.5 9.05 9.5 8.5C9.5 7.95 9.05 7.5 8.5 7.5C7.95 7.5 7.5 7.95 7.5 8.5C7.5 9.05 7.95 9.5 8.5 9.5ZM11 10.5V17H13V13.5C13 12.67 13.67 12 14.5 12C14.78 12 15 12.22 15 12.5V17H17V12C17 10.9 16.1 10 15 10C14.17 10 13.45 10.4 13 11V10.5H11Z" fill="white" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className || 'h-6 w-6'} fill="none">
      <rect width="24" height="24" rx="4" fill="#1877F2" />
      <path d="M16.5 12.5H14V17H12V12.5H10V10.5H12V9.5C12 8.12 13.12 7 14.5 7H16.5V9H14.5C14.22 9 14 9.22 14 9.5V10.5H16.5L16 12.5Z" fill="white" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className || 'h-6 w-6'} fill="none">
      <rect width="24" height="24" rx="4" fill="#000000" />
      <path d="M13.808 10.469L17.88 6H16.874L13.362 9.827L10.546 6H7L11.285 12.896L7 17.588H8.006L11.73 13.538L14.715 17.588H18.261L13.808 10.469ZM12.236 12.95L11.789 12.317L8.368 6.74H10.073L12.636 10.437L13.082 11.07L16.874 16.882H15.169L12.236 12.951V12.95Z" fill="white" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className || 'h-6 w-6'} fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FED373" />
          <stop offset="25%" stopColor="#F15245" />
          <stop offset="50%" stopColor="#D92E7F" />
          <stop offset="75%" stopColor="#9B36B7" />
          <stop offset="100%" stopColor="#515ECF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="4" fill="url(#ig-grad)" />
      <rect x="6" y="6" width="12" height="12" rx="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="8" r="1" fill="white" />
    </svg>
  );
}

function YouTubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className || 'h-6 w-6'} fill="none">
      <rect width="24" height="24" rx="4" fill="#FF0000" />
      <path d="M17.6 9.5C17.6 9.5 17.4 8.3 16.9 7.8C16.3 7.2 15.6 7.2 15.3 7.1C13.5 7 12 7 12 7C12 7 10.5 7 8.7 7.1C8.4 7.2 7.7 7.2 7.1 7.8C6.6 8.3 6.4 9.5 6.4 9.5C6.4 9.5 6.2 10.8 6.2 12.2V13.5C6.2 14.8 6.4 16.2 6.4 16.2C6.4 16.2 6.6 17.4 7.1 17.9C7.7 18.5 8.5 18.5 8.8 18.5C10.2 18.7 12 18.7 12 18.7C12 18.7 13.5 18.7 15.3 18.5C15.6 18.5 16.3 18.5 16.9 17.9C17.4 17.4 17.6 16.2 17.6 16.2C17.6 16.2 17.8 14.8 17.8 13.5V12.2C17.8 10.8 17.6 9.5 17.6 9.5ZM10.5 15V10.5L14.5 12.8L10.5 15Z" fill="white" />
    </svg>
  );
}

function getPlatformIcon(platform: string, size?: string) {
  const cls = size || 'h-6 w-6';
  switch (platform.toLowerCase()) {
    case 'linkedin': return <LinkedInIcon className={cls} />;
    case 'facebook': return <FacebookIcon className={cls} />;
    case 'twitter': case 'x': return <TwitterIcon className={cls} />;
    case 'instagram': return <InstagramIcon className={cls} />;
    case 'youtube': return <YouTubeIcon className={cls} />;
    default: return <Share2 className={cls + ' text-gray-500'} />;
  }
}

function getPlatformDisplayName(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'linkedin': return 'LinkedIn';
    case 'facebook': return 'Facebook';
    case 'twitter': return 'X (Twitter)';
    case 'instagram': return 'Instagram';
    case 'youtube': return 'YouTube';
    default: return platform;
  }
}

const ALL_PLATFORMS = ['linkedin', 'facebook', 'twitter', 'instagram', 'youtube'];

// ==================== Connect Account Dialog ====================

function ConnectAccountDialog({
  isOpen,
  onClose,
  platform,
  onConnected,
}: {
  isOpen: boolean;
  onClose: () => void;
  platform: string;
  onConnected: () => void;
}) {
  const [accountName, setAccountName] = useState('');
  const [accountId, setAccountId] = useState('');
  const [pageId, setPageId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setAccountName('');
    setAccountId('');
    setPageId('');
    setAccessToken('');
    setProfileUrl('');
    setError('');
  };

  const handleConnect = async () => {
    if (!accountName.trim()) { setError('Account name is required.'); return; }

    setSaving(true);
    setError('');
    try {
      const res = await socialMediaApi.connectAccount({
        platform,
        account_name: accountName.trim(),
        account_id: accountId.trim() || undefined,
        page_id: pageId.trim() || undefined,
        access_token: accessToken.trim() || undefined,
        profile_url: profileUrl.trim() || undefined,
      });
      if (res.success || res.data) {
        resetForm();
        onConnected();
        onClose();
      } else {
        setError(res.error || 'Failed to connect account.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect account.');
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

  useEffect(() => { if (isOpen) resetForm(); }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {getPlatformIcon(platform)}
            <h2 className="text-lg font-semibold">Connect {getPlatformDisplayName(platform)}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { resetForm(); onClose(); }} aria-label="Close"><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            Enter your {getPlatformDisplayName(platform)} account details. For full OAuth integration, API keys would be configured separately.
          </p>

          <div>
            <Label htmlFor="soc-name">Account Name *</Label>
            <Input id="soc-name" value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g., Mobilise App Lab" />
          </div>

          <div>
            <Label htmlFor="soc-acc-id">Account / User ID</Label>
            <Input id="soc-acc-id" value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="Platform-specific ID" />
          </div>

          {(platform === 'facebook' || platform === 'linkedin') && (
            <div>
              <Label htmlFor="soc-page-id">Page ID</Label>
              <Input id="soc-page-id" value={pageId} onChange={e => setPageId(e.target.value)} placeholder="Page ID (for business pages)" />
            </div>
          )}

          <div>
            <Label htmlFor="soc-token">Access Token</Label>
            <Input id="soc-token" type="password" value={accessToken} onChange={e => setAccessToken(e.target.value)} placeholder="Paste your access token" />
          </div>

          <div>
            <Label htmlFor="soc-url">Profile URL</Label>
            <Input id="soc-url" value={profileUrl} onChange={e => setProfileUrl(e.target.value)} placeholder="https://linkedin.com/company/..." />
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancel</Button>
          <Button onClick={handleConnect} disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Connecting...</> : <><Link2 className="h-4 w-4 mr-1" /> Connect Account</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== Connected Accounts Tab ====================

function ConnectedAccountsTab({
  accounts,
  loading,
  onRefresh,
  oauthConfig = {},
}: {
  accounts: SocialAccount[];
  loading: boolean;
  onRefresh: () => void;
  oauthConfig?: Record<string, boolean>;
}) {
  const [connectPlatform, setConnectPlatform] = useState<string | null>(null);

  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  // Group accounts by platform — multiple accounts per platform allowed (e.g., multiple FB pages)
  const accountsByPlatform = new Map<string, SocialAccount[]>();
  safeAccounts.forEach(acc => {
    const p = acc.platform.toLowerCase();
    if (!accountsByPlatform.has(p)) accountsByPlatform.set(p, []);
    accountsByPlatform.get(p)!.push(acc);
  });

  const handleDisconnect = async (account: SocialAccount) => {
    if (!confirm(`Disconnect ${getPlatformDisplayName(account.platform)} account "${account.account_name}"?`)) return;
    try {
      await socialMediaApi.disconnectAccount(account.id);
      onRefresh();
    } catch (err) {
      alert('Failed to disconnect: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleConnect = (platform: string) => {
    if (oauthConfig[platform]) {
      // Platform has OAuth configured — redirect to provider consent page
      socialMediaApi.initiateOAuth(platform);
    } else {
      // Fallback to manual token entry dialog
      setConnectPlatform(platform);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Connected accounts — one card per account (multiple per platform possible) */}
        {safeAccounts.filter(a => !!a.is_active).map(account => (
          <Card key={account.id} className="p-5 relative border-green-200 bg-green-50/30">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getPlatformIcon(account.platform.toLowerCase(), 'h-10 w-10')}
                <div>
                  <h3 className="font-semibold text-sm">{getPlatformDisplayName(account.platform.toLowerCase())}</h3>
                  <p className="text-xs text-gray-600 font-medium">{account.account_name}</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-green-300 bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                <Wifi className="h-3 w-3" /> Connected
              </span>
            </div>
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Users className="h-3.5 w-3.5" />
                <span className="font-medium">{formatNumber(account.followers_count)}</span>
                <span className="text-gray-400">followers</span>
              </div>
              {account.profile_url && (
                <a href={account.profile_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                  <ExternalLink className="h-3 w-3" /> View Profile
                </a>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => handleDisconnect(account)}>
              <Unplug className="h-3.5 w-3.5 mr-1.5" /> Disconnect
            </Button>
          </Card>
        ))}

        {/* Unconnected platforms — show Connect button */}
        {ALL_PLATFORMS.filter(p => !accountsByPlatform.has(p) || !accountsByPlatform.get(p)!.some(a => !!a.is_active)).map(platform => (
          <Card key={`connect-${platform}`} className="p-5 relative border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getPlatformIcon(platform, 'h-10 w-10')}
                <div>
                  <h3 className="font-semibold text-sm">{getPlatformDisplayName(platform)}</h3>
                  <p className="text-xs text-gray-400">Not connected</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                <WifiOff className="h-3 w-3" /> Offline
              </span>
            </div>
            <Button size="sm" className="w-full mt-auto" onClick={() => handleConnect(platform)}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" /> {oauthConfig[platform] ? 'Connect via OAuth' : 'Connect'}
            </Button>
          </Card>
        ))}
      </div>

      <ConnectAccountDialog
        isOpen={!!connectPlatform}
        onClose={() => setConnectPlatform(null)}
        platform={connectPlatform || ''}
        onConnected={onRefresh}
      />
    </>
  );
}

// ==================== Compose & Schedule Tab ====================

function ComposeTab({
  accounts,
  onPostCreated,
}: {
  accounts: SocialAccount[];
  onPostCreated: () => void;
}) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // AI Writer state
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiPlatform, setAiPlatform] = useState('linkedin');
  const [generating, setGenerating] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);

  const connectedPlatforms = accounts
    .filter(a => a.is_active)
    .map(a => a.platform.toLowerCase());

  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const lowestCharLimit = selectedPlatforms.reduce((min, p) => {
    const limit = PLATFORM_CHAR_LIMITS[p] || 5000;
    return limit < min ? limit : min;
  }, 99999);

  const isOverLimit = content.length > lowestCharLimit && lowestCharLimit < 99999;

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) { setError('Enter a topic for AI generation.'); return; }
    setGenerating(true);
    setError('');
    try {
      const res = await socialMediaApi.aiGeneratePost({
        platform: aiPlatform,
        topic: aiTopic,
        tone: aiTone,
        includeHashtags: true,
      });
      if (res.success && res.data) {
        const generated = res.data.content || res.data.text || res.data;
        if (typeof generated === 'string') {
          setContent(generated);
        } else if (generated.content) {
          setContent(generated.content);
        }
        setShowAIPanel(false);
        setSuccess('AI content generated. Review and edit before posting.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.error || 'AI generation failed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePost = async (scheduleMode: boolean) => {
    if (selectedPlatforms.length === 0) { setError('Select at least one platform.'); return; }
    if (!content.trim()) { setError('Post content cannot be empty.'); return; }
    if (scheduleMode && !scheduledAt) { setError('Select a schedule date and time.'); return; }

    setPosting(true);
    setError('');
    setSuccess('');
    try {
      const payload: any = {
        content: content.trim(),
        platforms: selectedPlatforms,
        status: scheduleMode ? 'scheduled' : 'published',
      };
      if (scheduleMode) payload.scheduled_at = scheduledAt;

      const endpoint = scheduleMode
        ? socialMediaApi.connectAccount  // Uses POST to same endpoint
        : socialMediaApi.connectAccount;

      // The API doesn't have explicit createPost, so we use the generic POST approach
      const res = await fetch(
        `${(import.meta as any).env?.VITE_API_URL || '/api/v1'}/marketing/social/posts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(payload),
        }
      ).then(r => r.json());

      if (res.success || res.data) {
        setContent('');
        setSelectedPlatforms([]);
        setScheduledAt('');
        setSuccess(scheduleMode ? 'Post scheduled successfully!' : 'Post published successfully!');
        onPostCreated();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(res.error || 'Failed to create post.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Compose Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Platform Selection */}
        <div>
          <Label className="mb-2 block">Post to</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS.map(p => {
              const isConnected = connectedPlatforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={!isConnected}
                  onClick={() => isConnected && togglePlatform(p)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    selectedPlatforms.includes(p)
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                      : isConnected
                        ? 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                        : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                  }`}
                  title={!isConnected ? `${getPlatformDisplayName(p)} is not connected` : undefined}
                >
                  {getPlatformIcon(p, 'h-5 w-5')}
                  {getPlatformDisplayName(p)}
                  {selectedPlatforms.includes(p) && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                </button>
              );
            })}
          </div>
          {connectedPlatforms.length === 0 && (
            <p className="text-xs text-amber-600 mt-2">No accounts connected. Go to Connected Accounts tab to connect first.</p>
          )}
        </div>

        {/* Text Area */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>Post Content</Label>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowAIPanel(!showAIPanel)}>
                <Sparkles className="h-3.5 w-3.5 mr-1" /> AI Writer
              </Button>
              <span className={`text-xs ${isOverLimit ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                {content.length}{lowestCharLimit < 99999 ? ` / ${lowestCharLimit}` : ''}
              </span>
            </div>
          </div>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={8}
            placeholder="What do you want to share with your audience?"
            className={`resize-none ${isOverLimit ? 'border-red-300 focus:ring-red-400' : ''}`}
          />
          {isOverLimit && (
            <p className="text-xs text-red-600 mt-1">
              Content exceeds the character limit for {selectedPlatforms.find(p => PLATFORM_CHAR_LIMITS[p] === lowestCharLimit)} ({lowestCharLimit} chars).
            </p>
          )}
        </div>

        {/* Schedule Picker */}
        <div>
          <Label htmlFor="schedule-time">Schedule Date & Time (optional)</Label>
          <Input
            id="schedule-time"
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* Messages */}
        {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded" role="alert">{error}</div>}
        {success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />{success}</div>}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={() => handlePost(false)} disabled={posting || selectedPlatforms.length === 0 || !content.trim()}>
            {posting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
            Publish Now
          </Button>
          <Button variant="outline" onClick={() => handlePost(true)} disabled={posting || selectedPlatforms.length === 0 || !content.trim() || !scheduledAt}>
            <Clock className="h-4 w-4 mr-1.5" /> Schedule
          </Button>
        </div>
      </div>

      {/* AI Writer Sidebar */}
      <div className={`${showAIPanel ? 'block' : 'hidden lg:block'}`}>
        <Card className="p-4 border-indigo-200 bg-indigo-50/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-sm">AI Post Writer</h3>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ai-topic">Topic *</Label>
              <Input id="ai-topic" value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="e.g., Product launch announcement" />
            </div>
            <div>
              <Label>Platform Style</Label>
              <Select value={aiPlatform} onValueChange={setAiPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_PLATFORMS.map(p => (
                    <SelectItem key={p} value={p}>{getPlatformDisplayName(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tone</Label>
              <Select value={aiTone} onValueChange={setAiTone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleAIGenerate} disabled={generating || !aiTopic.trim()}>
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1.5" /> Generate Post</>
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ==================== Scheduled Posts Tab ====================

function ScheduledPostsTab({
  posts,
  loading,
  onRefresh,
}: {
  posts: SocialPost[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const handleCancel = async (post: SocialPost) => {
    if (!confirm('Cancel this scheduled post?')) return;
    try {
      await fetch(
        `${(import.meta as any).env?.VITE_API_URL || '/api/v1'}/marketing/social/posts/${post.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
        }
      );
      onRefresh();
    } catch (err) {
      alert('Failed to cancel post.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="h-16 w-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No scheduled posts</h3>
        <p className="text-sm text-gray-500 mt-1">Compose and schedule posts from the Compose tab.</p>
      </div>
    );
  }

  const sortedPosts = [...posts].sort((a, b) => {
    const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
    const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
    return dateA - dateB;
  });

  return (
    <div className="space-y-3">
      {sortedPosts.map(post => {
        const platforms = post.platforms || (post.platform ? [post.platform] : []);
        return (
          <Card key={post.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1">
                    {platforms.map(p => (
                      <span key={p}>{getPlatformIcon(p, 'h-4 w-4')}</span>
                    ))}
                  </div>
                  {post.scheduled_at && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDateTime(post.scheduled_at)}
                    </span>
                  )}
                  <Badge className="bg-blue-100 text-blue-700 text-xs">Scheduled</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="sm" title="Edit" aria-label="Edit post" disabled>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" title="Cancel" aria-label="Cancel scheduled post" onClick={() => handleCancel(post)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ==================== Published Posts Tab ====================

function PublishedPostsTab({
  posts,
  loading,
}: {
  posts: SocialPost[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <CheckCircle2 className="h-16 w-16 text-gray-200 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-700">No published posts yet</h3>
        <p className="text-sm text-gray-500 mt-1">Published posts and their engagement metrics will appear here.</p>
      </div>
    );
  }

  const getMaxMetric = (metric: string): number => {
    let max = 0;
    posts.forEach(p => {
      const val = (p.engagement_metrics as any)?.[metric] || 0;
      if (val > max) max = val;
    });
    return max || 1;
  };

  const maxImpressions = getMaxMetric('impressions');
  const maxLikes = getMaxMetric('likes');

  return (
    <div className="space-y-4">
      {posts.map(post => {
        const platforms = post.platforms || (post.platform ? [post.platform] : []);
        const metrics = post.engagement_metrics || {};

        return (
          <Card key={post.id} className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 line-clamp-3 whitespace-pre-wrap">{post.content}</p>

                <div className="flex items-center gap-3 mt-2 mb-3">
                  <div className="flex items-center gap-1">
                    {platforms.map(p => (
                      <span key={p}>{getPlatformIcon(p, 'h-4 w-4')}</span>
                    ))}
                  </div>
                  {post.published_at && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDateTime(post.published_at)}
                    </span>
                  )}
                  <Badge className="bg-green-100 text-green-700 text-xs">Published</Badge>
                </div>

                {/* Engagement Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <ThumbsUp className="h-3 w-3" /> Likes
                    </div>
                    <p className="text-sm font-semibold">{formatNumber(metrics.likes)}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(((metrics.likes || 0) / maxLikes) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <Share2 className="h-3 w-3" /> Shares
                    </div>
                    <p className="text-sm font-semibold">{formatNumber(metrics.shares)}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(((metrics.shares || 0) / (getMaxMetric('shares') || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <MessageCircle className="h-3 w-3" /> Comments
                    </div>
                    <p className="text-sm font-semibold">{formatNumber(metrics.comments)}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(((metrics.comments || 0) / (getMaxMetric('comments') || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                      <Eye className="h-3 w-3" /> Impressions
                    </div>
                    <p className="text-sm font-semibold">{formatNumber(metrics.impressions)}</p>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(((metrics.impressions || 0) / maxImpressions) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ==================== Main Component ====================

export function SocialMediaManager() {
  // Data state
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<SocialPost[]>([]);
  const [publishedPosts, setPublishedPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [loadingPublished, setLoadingPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('accounts');
  const [oauthConfig, setOauthConfig] = useState<Record<string, boolean>>({});

  // ==================== OAuth callback handler ====================
  // After OAuth redirect, the hash will be #social-connected?platform=xxx&success=true/false
  useEffect(() => {
    const checkOAuthReturn = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#social-connected')) {
        const params = new URLSearchParams(hash.replace('#social-connected?', '').replace('#social-connected', ''));
        const platform = params.get('platform');
        const success = params.get('success');
        const oauthError = params.get('error');

        // Clear the hash
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        if (success === 'true' && platform) {
          setActiveTab('accounts');
          // Refresh accounts to show the newly connected platform
          loadAccounts();
        } else if (oauthError) {
          setError(`OAuth connection failed for ${platform || 'platform'}: ${decodeURIComponent(oauthError)}`);
          setActiveTab('accounts');
        }
      }
    };

    checkOAuthReturn();
    window.addEventListener('hashchange', checkOAuthReturn);
    return () => window.removeEventListener('hashchange', checkOAuthReturn);
  }, []);

  // Load OAuth config on mount
  useEffect(() => {
    socialMediaApi.getOAuthConfig().then(res => {
      if (res.success && res.data?.platforms) {
        setOauthConfig(res.data.platforms);
      }
    }).catch(() => {
      // OAuth config not available — manual entry will be used for all platforms
    });
  }, []);

  // ==================== Data loading ====================

  const loadAccounts = useCallback(async () => {
    try {
      const res = await socialMediaApi.getAccounts();
      if (res.success && res.data) {
        setAccounts(Array.isArray(res.data) ? res.data : res.data.data || []);
      } else if (Array.isArray(res)) {
        setAccounts(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts.');
    }
  }, []);

  const loadScheduledPosts = useCallback(async () => {
    setLoadingScheduled(true);
    try {
      const res = await socialMediaApi.getScheduledPosts();
      if (res.success && res.data) {
        setScheduledPosts(Array.isArray(res.data) ? res.data : res.data.data || []);
      } else if (Array.isArray(res)) {
        setScheduledPosts(res);
      }
    } catch (err) {
      // non-critical
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const loadPublishedPosts = useCallback(async () => {
    setLoadingPublished(true);
    try {
      const res = await socialMediaApi.getPublishedPosts();
      if (res.success && res.data) {
        setPublishedPosts(Array.isArray(res.data) ? res.data : res.data.data || []);
      } else if (Array.isArray(res)) {
        setPublishedPosts(res);
      }
    } catch (err) {
      // non-critical
    } finally {
      setLoadingPublished(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadAccounts(), loadScheduledPosts(), loadPublishedPosts()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, [loadAccounts, loadScheduledPosts, loadPublishedPosts]);

  useEffect(() => {
    loadAll();
  }, []);

  // Reload data when tab changes
  useEffect(() => {
    if (activeTab === 'scheduled') loadScheduledPosts();
    if (activeTab === 'published') loadPublishedPosts();
    if (activeTab === 'accounts') loadAccounts();
  }, [activeTab]);

  const handlePostCreated = () => {
    loadScheduledPosts();
    loadPublishedPosts();
  };

  // ==================== Render ====================

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-500">Loading social media manager...</p>
        </div>
      </div>
    );
  }

  const connectedCount = accounts.filter(a => a.is_active).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Social Media Manager</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect accounts, compose posts with AI, and track engagement across platforms
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-400">Connected Accounts</p>
            <p className="text-lg font-bold text-gray-900">{connectedCount} / {ALL_PLATFORMS.length}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Share2 className="h-5 w-5 text-indigo-600" />
          </div>
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

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Accounts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{connectedCount}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{scheduledPosts.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Published</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{publishedPosts.length}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Followers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(accounts.reduce((sum, a) => sum + (a.followers_count || 0), 0))}
              </p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="accounts" className="flex items-center gap-1.5">
            <Link2 className="h-4 w-4" /> Connected Accounts
          </TabsTrigger>
          <TabsTrigger value="compose" className="flex items-center gap-1.5">
            <Pencil className="h-4 w-4" /> Compose & Schedule
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> Scheduled
            {scheduledPosts.length > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-xs ml-1">{scheduledPosts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="published" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" /> Published
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <ConnectedAccountsTab accounts={accounts} loading={loading} onRefresh={loadAccounts} oauthConfig={oauthConfig} />
        </TabsContent>

        <TabsContent value="compose">
          <ComposeTab accounts={accounts} onPostCreated={handlePostCreated} />
        </TabsContent>

        <TabsContent value="scheduled">
          <ScheduledPostsTab posts={scheduledPosts} loading={loadingScheduled} onRefresh={loadScheduledPosts} />
        </TabsContent>

        <TabsContent value="published">
          <PublishedPostsTab posts={publishedPosts} loading={loadingPublished} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
