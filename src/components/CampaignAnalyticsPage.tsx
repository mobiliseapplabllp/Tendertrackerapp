import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  BarChart3,
  Loader2,
  TrendingUp,
  DollarSign,
  Target,
  Zap,
  Linkedin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Eye,
  MousePointerClick,
  Share2,
  Calendar,
  Activity,
  RefreshCw,
  AlertCircle,
  X,
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { marketingAnalyticsApi, marketingCampaignApi } from '../lib/api';

// --------------- Types ---------------
interface Campaign {
  id: number;
  name: string;
  status: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  channels?: CampaignChannel[];
  created_at: string;
}

interface CampaignChannel {
  id: number;
  campaign_id: number;
  channel: string;
  status: string;
  impressions?: number;
  clicks?: number;
  shares?: number;
  engagement?: number;
  scheduled_date?: string;
  published_date?: string;
}

interface OverviewData {
  total_campaigns: number;
  active_campaigns: number;
  total_budget: number;
  total_impressions: number;
  total_clicks: number;
  total_engagement: number;
  avg_engagement_rate: number;
  channel_breakdown: Record<string, ChannelMetrics>;
  recent_activity: ActivityEvent[];
}

interface ChannelMetrics {
  campaigns: number;
  impressions: number;
  clicks: number;
  engagement: number;
  shares?: number;
}

interface ActivityEvent {
  id: number;
  campaign_name?: string;
  campaign_id?: number;
  channel?: string;
  metric_type: string;
  metric_value: number;
  recorded_at: string;
}

// --------------- Constants ---------------
const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; bar: string }> = {
  linkedin: {
    label: 'LinkedIn',
    icon: <Linkedin className="h-5 w-5" />,
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-100',
    bar: 'bg-blue-500',
  },
  facebook: {
    label: 'Facebook',
    icon: <Facebook className="h-5 w-5" />,
    color: 'text-blue-600',
    bg: 'bg-indigo-50 border-indigo-100',
    bar: 'bg-indigo-500',
  },
  twitter: {
    label: 'Twitter / X',
    icon: <Twitter className="h-5 w-5" />,
    color: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-100',
    bar: 'bg-sky-500',
  },
  instagram: {
    label: 'Instagram',
    icon: <Instagram className="h-5 w-5" />,
    color: 'text-pink-600',
    bg: 'bg-pink-50 border-pink-100',
    bar: 'bg-pink-500',
  },
  youtube: {
    label: 'YouTube',
    icon: <Youtube className="h-5 w-5" />,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-100',
    bar: 'bg-red-500',
  },
  email: {
    label: 'Email',
    icon: <Mail className="h-5 w-5" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-100',
    bar: 'bg-amber-500',
  },
};

const CHANNELS = ['linkedin', 'facebook', 'twitter', 'instagram', 'youtube', 'email'];

// --------------- Helpers ---------------
function formatINR(value: number | undefined): string {
  if (value == null) return '0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | undefined): string {
  if (value == null) return '0';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return String(value);
}

function formatPercent(value: number | undefined): string {
  if (value == null) return '0%';
  return value.toFixed(1) + '%';
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ========================================
// Component
// ========================================
export function CampaignAnalyticsPage() {
  // --------------- State ---------------
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campaign selector for detailed breakdown
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('none');
  const [campaignDetail, setCampaignDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // --------------- Data loading ---------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, campaignsRes] = await Promise.all([
        marketingAnalyticsApi.getOverview(),
        marketingCampaignApi.getAll(),
      ]);

      if (overviewRes.success) {
        setOverview(overviewRes.data);
      }

      if (campaignsRes.success) {
        const campaignData = Array.isArray(campaignsRes.data)
          ? campaignsRes.data
          : campaignsRes.data?.data || campaignsRes.data?.campaigns || [];
        setCampaigns(campaignData);
      }

      if (!overviewRes.success && !campaignsRes.success) {
        setError('Failed to load analytics data');
      }
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Campaign detail loading
  useEffect(() => {
    if (!selectedCampaignId || selectedCampaignId === 'none') {
      setCampaignDetail(null);
      return;
    }
    const loadDetail = async () => {
      setDetailLoading(true);
      try {
        const res = await marketingAnalyticsApi.getCampaignAnalytics(Number(selectedCampaignId));
        if (res.success) {
          setCampaignDetail(res.data);
        }
      } catch (err) {
        console.error('Failed to load campaign detail', err);
      } finally {
        setDetailLoading(false);
      }
    };
    loadDetail();
  }, [selectedCampaignId]);

  // --------------- Computed values ---------------
  // Derive overview stats from campaigns if overview endpoint is sparse
  const stats = useMemo(() => {
    if (overview) {
      return {
        totalCampaigns: overview.total_campaigns ?? campaigns.length,
        activeCampaigns: overview.active_campaigns ?? campaigns.filter((c) => c.status === 'active').length,
        totalBudget: overview.total_budget ?? campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
        avgEngagement: overview.avg_engagement_rate ?? 0,
      };
    }
    // Fallback: calculate from campaigns
    return {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === 'active' || c.status === 'running').length,
      totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
      avgEngagement: 0,
    };
  }, [overview, campaigns]);

  // Channel metrics from overview or aggregated from campaigns
  const channelMetrics = useMemo(() => {
    if (overview?.channel_breakdown) {
      return overview.channel_breakdown;
    }
    // Build from campaign channels
    const metrics: Record<string, ChannelMetrics> = {};
    for (const ch of CHANNELS) {
      metrics[ch] = { campaigns: 0, impressions: 0, clicks: 0, engagement: 0, shares: 0 };
    }
    campaigns.forEach((campaign) => {
      if (campaign.channels) {
        campaign.channels.forEach((ch) => {
          const key = ch.channel?.toLowerCase();
          if (key && metrics[key]) {
            metrics[key].campaigns += 1;
            metrics[key].impressions += ch.impressions || 0;
            metrics[key].clicks += ch.clicks || 0;
            metrics[key].engagement += ch.engagement || 0;
            if (ch.shares) metrics[key].shares = (metrics[key].shares || 0) + ch.shares;
          }
        });
      }
    });
    return metrics;
  }, [overview, campaigns]);

  // Max impressions for progress bar scaling
  const maxImpressions = useMemo(() => {
    const values = Object.values(channelMetrics).map((m) => m.impressions);
    return Math.max(...values, 1);
  }, [channelMetrics]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return overview?.recent_activity || [];
  }, [overview]);

  // Selected campaign channels for breakdown
  const selectedCampaignChannels = useMemo(() => {
    if (campaignDetail?.channels) return campaignDetail.channels;
    // Fallback: get from campaigns list
    const campaign = campaigns.find((c) => c.id === Number(selectedCampaignId));
    return campaign?.channels || [];
  }, [campaignDetail, campaigns, selectedCampaignId]);

  // ========================================
  // Render
  // ========================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-xl">
            <BarChart3 className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Track campaign performance, channel metrics, and engagement trends</p>
          </div>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
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

      {/* ==================== OVERVIEW CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCampaigns}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeCampaigns}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-600" />
              </div>
            </div>
            {stats.totalCampaigns > 0 && (
              <div className="mt-3 flex items-center gap-1 text-xs">
                <span className="text-green-600 font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="h-3 w-3" />
                  {((stats.activeCampaigns / stats.totalCampaigns) * 100).toFixed(0)}%
                </span>
                <span className="text-gray-400">of total</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Budget</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatINR(stats.totalBudget)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Engagement Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatPercent(stats.avgEngagement)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================== CHANNEL PERFORMANCE ==================== */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Channel Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {CHANNELS.map((channelKey) => {
            const config = CHANNEL_CONFIG[channelKey];
            const metrics = channelMetrics[channelKey] || { campaigns: 0, impressions: 0, clicks: 0, engagement: 0 };
            const barWidth = maxImpressions > 0 ? (metrics.impressions / maxImpressions) * 100 : 0;

            return (
              <Card key={channelKey} className={`border ${config.bg} hover:shadow-md transition-shadow`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bg} ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{config.label}</h3>
                      <p className="text-xs text-gray-400">{metrics.campaigns} campaign{metrics.campaigns !== 1 ? 's' : ''}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/60 rounded-lg p-2.5 text-center">
                      <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1 mb-1">
                        <Eye className="h-3 w-3" />
                        Impressions
                      </p>
                      <p className="text-lg font-bold text-gray-900" title="Total number of times content was displayed">{formatNumber(metrics.impressions)}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2.5 text-center">
                      <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1 mb-1">
                        <MousePointerClick className="h-3 w-3" />
                        Clicks
                      </p>
                      <p className="text-lg font-bold text-gray-900" title="Number of link clicks">{formatNumber(metrics.clicks)}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg p-2.5 text-center">
                      <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1 mb-1">
                        <Share2 className="h-3 w-3" />
                        Engagement
                      </p>
                      <p className="text-lg font-bold text-gray-900" title="Total interactions">{formatNumber(metrics.engagement)}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-white/50 rounded-full h-2">
                    <div
                      className={`${config.bar} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${Math.max(barWidth, 3)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                    {formatNumber(metrics.impressions)} impressions
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ==================== CAMPAIGN SELECTOR + BREAKDOWN ==================== */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Campaign Breakdown</h2>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-80">
            <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- Select a Campaign --</SelectItem>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedCampaignId === 'none' ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
            <BarChart3 className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm text-gray-500">Choose a campaign above to see detailed channel performance</p>
          </div>
        ) : detailLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            <p className="text-sm">Loading campaign details...</p>
          </div>
        ) : selectedCampaignChannels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
            <Target className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm text-gray-500">No performance data recorded yet for this campaign</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Channel</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-gray-600">Impressions</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-gray-600">Clicks</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-gray-600">Shares</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Scheduled</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Published</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedCampaignChannels.map((ch: any, idx: number) => {
                    const chKey = ch.channel?.toLowerCase() || '';
                    const config = CHANNEL_CONFIG[chKey];
                    return (
                      <tr key={ch.id ?? `ch-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {config ? (
                              <span className={config.color}>{config.icon}</span>
                            ) : (
                              <Activity className="h-4 w-4 text-gray-400" />
                            )}
                            <span className="font-medium">{config?.label || ch.channel || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="secondary"
                            className={
                              ch.status === 'published'
                                ? 'bg-green-50 text-green-600 border-green-100'
                                : ch.status === 'scheduled'
                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                : 'bg-gray-100 text-gray-500'
                            }
                          >
                            {ch.status || 'draft'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700" title="Total number of times content was displayed">
                          {formatNumber(ch.impressions)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700" title="Number of link clicks">
                          {formatNumber(ch.clicks)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700" title="Number of times content was shared">
                          {formatNumber(ch.shares)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(ch.scheduled_date)}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(ch.published_date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ==================== RECENT ACTIVITY ==================== */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>

        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-lg">
            <Activity className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm text-gray-500">No recent analytics activity recorded</p>
            <p className="text-xs mt-1 text-gray-300">Activity events will appear here as campaigns run</p>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Recorded At</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Campaign</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Channel</th>
                    <th scope="col" className="text-left px-4 py-3 font-medium text-gray-600">Metric</th>
                    <th scope="col" className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentActivity.slice(0, 20).map((event, idx) => {
                    const chKey = event.channel?.toLowerCase() || '';
                    const config = CHANNEL_CONFIG[chKey];
                    return (
                      <tr key={event.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDateTime(event.recorded_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">{event.campaign_name || '-'}</td>
                        <td className="px-4 py-3">
                          {config ? (
                            <div className="flex items-center gap-1.5">
                              <span className={config.color}>{config.icon}</span>
                              <span className="text-gray-600">{config.label}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">{event.channel || '-'}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs">
                            {event.metric_type?.replace(/_/g, ' ') || '-'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                          {formatNumber(event.metric_value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {recentActivity.length > 20 && (
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-center">
                <p className="text-xs text-gray-400">
                  Showing 20 of {recentActivity.length} events
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
