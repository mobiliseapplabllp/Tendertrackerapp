import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  BarChart3, FileText, TrendingUp, DollarSign, Clock,
  CheckCircle2, AlertCircle, XCircle, Calendar, Users, Crown, Loader2, Sparkles, RefreshCw, Info
} from 'lucide-react';
import { Button } from './ui/button';
import { DashboardStatCard } from './DashboardStatCard';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ScrollArea } from './ui/scroll-area';
import { dashboardApi } from '../lib/api';
import type { DashboardStats } from '../lib/types';

// Stage descriptions for info tooltips
const stageDescriptions: Record<string, string> = {
  'New': 'Freshly created leads that haven\'t been qualified yet. Initial contact or inquiry received.',
  'Qualified': 'Leads that have been vetted and confirmed as genuine opportunities with budget and decision-making authority.',
  'Proposal': 'Qualified leads where a formal proposal or solution has been submitted to the client for review.',
  'Negotiation': 'Active discussions on pricing, terms, and scope. Client is evaluating the proposal seriously.',
  'Won': 'Successfully closed deals. Contract signed, order confirmed, or project awarded.',
  'Lost': 'Deals that did not convert. Client chose a competitor, budget was cut, or opportunity expired.',
};

// Stage name → tender status mapping (reverse of backend mapping)
const stageToStatuses: Record<string, string[]> = {
  'New': ['Draft'],
  'Qualified': ['Submitted'],
  'Proposal': ['Under Review'],
  'Negotiation': ['Shortlisted'],
  'Won': ['Won'],
  'Lost': ['Lost', 'Cancelled'],
};

// Shared priority → Tailwind colour
const priorityColor = (p?: string) =>
  p === 'Critical' ? 'bg-red-100 text-red-700' :
  p === 'High' ? 'bg-orange-100 text-orange-700' :
  p === 'Medium' ? 'bg-amber-50 text-amber-700' :
  'bg-gray-100 text-gray-600';

// Status → Tailwind colour
const statusBadge = (s?: string) =>
  s === 'Won' ? 'bg-emerald-100 text-emerald-700' :
  s === 'Lost' || s === 'Cancelled' ? 'bg-red-100 text-red-700' :
  s === 'Shortlisted' ? 'bg-green-100 text-green-700' :
  s === 'Under Review' ? 'bg-blue-100 text-blue-700' :
  s === 'Submitted' ? 'bg-purple-100 text-purple-700' :
  s === 'Draft' ? 'bg-gray-100 text-gray-700' :
  'bg-gray-100 text-gray-700';

// Days-left helper for submission deadline
const daysLeft = (iso?: string | null) => {
  if (!iso) return null;
  const diffMs = new Date(iso).getTime() - Date.now();
  const d = Math.ceil(diffMs / 86400000);
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, tone: 'text-red-600' };
  if (d === 0) return { label: 'Due today', tone: 'text-orange-600' };
  if (d <= 7) return { label: `${d}d left`, tone: 'text-amber-600' };
  return { label: `${d}d left`, tone: 'text-gray-500' };
};

// Initials for avatar fallback
const initials = (name?: string) =>
  (name || '').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

// Second-level hover card: detailed info for a single lead in the list.
// Branches to the RIGHT of the parent hover card, flips left if no room.
// Accessible: keyboard focusable row, ESC to close, focus-triggered, aria-tooltip.
function LeadDetailHoverCard({ lead, parentRect, onNavigate, onRequestClose }: {
  lead: any;
  parentRect: DOMRect | null;
  onNavigate?: (view: string) => void;
  onRequestClose: () => void;
}) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    dashboardApi.getTeamMatrixLeadDetails(lead.id)
      .then(res => {
        if (cancelled) return;
        if (res.success && res.data) setData(res.data);
        else setError(res.error || 'Failed to load details');
      })
      .catch((e: any) => { if (!cancelled) setError(e.message || 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lead.id]);

  // ESC to close (accessibility)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onRequestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onRequestClose]);

  // Position: branch right of the parent card, flip left if no room.
  // Clamp vertical so the card always stays fully in the viewport and
  // internal body scrolls if content exceeds available height.
  const cardWidth = 360;
  const gap = 8;
  const margin = 12;
  const parentRight = parentRect?.right ?? 0;
  const parentLeft = parentRect?.left ?? 0;
  const parentTop = parentRect?.top ?? 0;
  const flipsLeft = parentRight + gap + cardWidth > window.innerWidth - margin;
  const left = flipsLeft ? Math.max(margin, parentLeft - cardWidth - gap) : parentRight + gap;

  const maxCardHeight = Math.max(320, window.innerHeight - margin * 2);
  const idealTop = parentTop;
  const maxTop = window.innerHeight - maxCardHeight - margin;
  const top = Math.max(margin, Math.min(idealTop, maxTop));

  const openLead = () => {
    if (onNavigate) onNavigate(`lead-details:${lead.id}`);
  };

  const dl = daysLeft(data?.lead?.submissionDeadline);
  const fmtCurrency = (n?: number | null, c?: string) =>
    typeof n === 'number' ? `${c || 'INR'} ${n.toLocaleString('en-IN')}` : null;
  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const fmtDateTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div
      role="dialog"
      aria-label={`Details for lead ${lead.title}`}
      className="fixed z-[120] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150 flex flex-col"
      style={{ top, left, width: cardWidth, maxHeight: maxCardHeight }}
      onMouseEnter={() => { /* keep open when pointer is on detail */ }}
    >
      {loading ? (
        <div className="flex items-center gap-2 px-4 py-8 text-gray-400 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Loading details…</span>
        </div>
      ) : error ? (
        <div className="px-4 py-6 text-center">
          <XCircle className="h-5 w-5 text-red-500 mx-auto mb-1" aria-hidden="true" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      ) : data ? (
        <>
          {/* Header */}
          <div className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-indigo-600 tracking-wide">
                  {data.lead.leadNumber || '—'}
                </p>
                <h4 className="text-sm font-semibold text-gray-900 leading-snug mt-0.5 text-left">
                  {data.lead.title}
                </h4>
              </div>
              <button
                onClick={openLead}
                aria-label="Open full lead"
                className="p-1 rounded hover:bg-indigo-100 text-indigo-600 flex-shrink-0"
              >
                <FileText className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusBadge(data.lead.status)}`}>
                {data.lead.status}
              </span>
              {data.lead.priority && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityColor(data.lead.priority)}`}>
                  {data.lead.priority}
                </span>
              )}
              {typeof data.lead.probability === 'number' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700">
                  {data.lead.probability}% likely
                </span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 px-4 py-3 space-y-2.5 overflow-y-auto">
            {/* Client */}
            {(data.company || data.primaryContact) && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Client</p>
                {data.company && (
                  <p className="text-xs font-medium text-gray-900 text-left">{data.company.name}</p>
                )}
                {data.primaryContact && (
                  <p className="text-[11px] text-gray-500 text-left">
                    {[data.primaryContact.first_name, data.primaryContact.last_name].filter(Boolean).join(' ')}
                    {data.primaryContact.position ? ` · ${data.primaryContact.position}` : ''}
                  </p>
                )}
              </div>
            )}

            {/* Owner + Creator */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Owner</p>
                {data.owner ? (
                  <div className="flex items-center gap-1.5 text-left">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0" aria-hidden="true">
                      {initials(data.owner.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-900 truncate">{data.owner.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">{data.owner.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Unassigned</p>
                )}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Created by</p>
                {data.creator ? (
                  <p className="text-[11px] text-gray-700 text-left">{data.creator.name}</p>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">—</p>
                )}
              </div>
            </div>

            {/* Product line + Value + Deadline */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Product line</p>
                <p className="text-[11px] text-gray-700 text-left">
                  {data.lead.productLineName || '—'}
                  {data.lead.subCategory ? ` · ${data.lead.subCategory}` : ''}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Value</p>
                <p className="text-[11px] font-medium text-gray-900 text-left">
                  {fmtCurrency(data.lead.estimatedValue, data.lead.currency) || '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Submission deadline</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-700">{fmtDate(data.lead.submissionDeadline)}</span>
                {dl && <span className={`text-[10px] font-medium ${dl.tone}`}>· {dl.label}</span>}
              </div>
            </div>

            {/* Last completed task */}
            <div className="border-t border-gray-100 pt-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" /> Last task completed
              </p>
              {data.lastCompletedTask ? (
                <div className="text-left">
                  <p className="text-[11px] font-medium text-gray-900">{data.lastCompletedTask.title}</p>
                  <p className="text-[10px] text-gray-500">
                    {fmtDateTime(data.lastCompletedTask.completed_at)}
                    {data.lastCompletedTask.completed_by_name ? ` · ${data.lastCompletedTask.completed_by_name}` : ''}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">No completed tasks yet</p>
              )}
            </div>

            {/* Next upcoming task */}
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500" aria-hidden="true" /> Next upcoming task
              </p>
              {data.nextUpcomingTask ? (
                <div className="text-left">
                  <p className="text-[11px] font-medium text-gray-900">{data.nextUpcomingTask.title}</p>
                  <p className="text-[10px] text-gray-500">
                    Due {fmtDate(data.nextUpcomingTask.due_date)}
                    {data.nextUpcomingTask.assignee_name ? ` · ${data.nextUpcomingTask.assignee_name}` : ''}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">No upcoming tasks</p>
              )}
            </div>

            {/* Last activity */}
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-indigo-400" aria-hidden="true" /> Last activity
              </p>
              {data.lastActivity ? (
                <div className="text-left">
                  <p className="text-[11px] text-gray-700 line-clamp-2">
                    <span className="font-medium">{data.lastActivity.activity_type}</span>
                    {data.lastActivity.description ? `: ${data.lastActivity.description}` : ''}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {fmtDateTime(data.lastActivity.created_at)}
                    {data.lastActivity.user_name ? ` · ${data.lastActivity.user_name}` : ''}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 italic">No activity recorded</p>
              )}
            </div>
          </div>

          {/* Footer */}
          {onNavigate && (
            <button
              onClick={openLead}
              className="flex-shrink-0 w-full px-4 py-2 border-t border-gray-100 bg-gray-50/70 hover:bg-indigo-50 text-indigo-600 text-xs font-medium text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
            >
              Open full lead →
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}

// A single lead row inside the first-level hover card.
// Hovering/focusing it opens the second-level detail card branching right.
function MatrixLeadRow({ lead, onNavigate }: { lead: any; onNavigate?: (view: string) => void; }) {
  const [detailOpen, setDetailOpen] = useState(false);
  const rowRef = useRef<HTMLButtonElement>(null);
  const openTimer = useRef<NodeJS.Timeout | null>(null);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);

  const scheduleOpen = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (detailOpen) return;
    openTimer.current = setTimeout(() => setDetailOpen(true), 250);
  };
  const scheduleClose = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setDetailOpen(false), 180);
  };

  // Keyboard: open on Enter/Space, close on Escape (also handled inside card)
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onNavigate) onNavigate(`lead-details:${lead.id}`);
    }
  };

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={() => setDetailOpen(true)}
        onBlur={scheduleClose}
        onClick={() => onNavigate && onNavigate(`lead-details:${lead.id}`)}
        onKeyDown={onKey}
        aria-haspopup="dialog"
        aria-expanded={detailOpen}
        className="w-full px-4 py-2.5 hover:bg-gray-50 transition-colors text-left focus:outline-none focus-visible:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-400"
      >
        <p className="text-sm font-medium text-gray-900 leading-snug text-left">{lead.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-start">
          {lead.company_name && (
            <span className="text-[11px] text-gray-500">{lead.company_name}</span>
          )}
          {lead.product_line_name && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{lead.product_line_name}</span>
          )}
          {lead.priority && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priorityColor(lead.priority)}`}>{lead.priority}</span>
          )}
        </div>
      </button>
      {detailOpen && (
        <div
          onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
          onMouseLeave={scheduleClose}
        >
          <LeadDetailHoverCard
            lead={lead}
            parentRect={rowRef.current?.closest('[role="dialog"]')?.getBoundingClientRect() || rowRef.current?.getBoundingClientRect() || null}
            onNavigate={onNavigate}
            onRequestClose={() => setDetailOpen(false)}
          />
        </div>
      )}
    </>
  );
}

// Hover popup for lead list on matrix cells (Teams-style hover card)
function LeadHoverCard({ userId, stageName, stageColor, count, children, onNavigate }: {
  userId: number; stageName: string; stageColor: string; count: number; children: React.ReactNode;
  onNavigate?: (view: string) => void;
}) {
  const [leads, setLeads] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchLeads = useCallback(async () => {
    if (leads) return;
    const statuses = stageToStatuses[stageName] || [stageName];
    setLoading(true);
    try {
      const res = await dashboardApi.getTeamMatrixLeads(userId, statuses);
      if (res.success) setLeads(res.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [userId, stageName, leads]);

  const show = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { setVisible(true); fetchLeads(); }, 250);
  };
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 150);
  };
  const keep = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };

  return (
    <div ref={wrapperRef} className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className="fixed z-[100] w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in duration-150"
          style={{
            top: (wrapperRef.current?.getBoundingClientRect().bottom ?? 0) + 6,
            left: Math.min(
              Math.max((wrapperRef.current?.getBoundingClientRect().left ?? 0) - 100, 8),
              window.innerWidth - 330
            ),
          }}
          onMouseEnter={keep} onMouseLeave={hide}
        >
          {/* Colored top bar */}
          <div className="h-1.5 w-full" style={{ backgroundColor: stageColor || '#6B7280' }} />
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageColor || '#6B7280' }} />
              <span className="text-sm font-semibold text-gray-900">{stageName}</span>
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: (stageColor || '#6B7280') + '18', color: stageColor || '#6B7280' }}>
              {count} lead{count !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Lead list */}
          <div className="max-h-56 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading leads...</span>
              </div>
            ) : leads && leads.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {leads.map((lead: any) => (
                  <MatrixLeadRow key={lead.id} lead={lead} onNavigate={onNavigate} />
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-xs text-gray-400">No leads in this stage</p>
              </div>
            )}
          </div>
          {leads && leads.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
              <p className="text-[10px] text-gray-400 text-center">Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Dashboard({ onNavigate }: { onNavigate?: (view: string) => void } = {}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('combined');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [expandedMembers, setExpandedMembers] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(true);
  const [teamMatrix, setTeamMatrix] = useState<any>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const { formatCurrency } = useSettings();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardApi.getStats();
        if (response.success && response.data) {
          setStats(response.data);
          // Fetch team performance if sales head
          if (response.data.userContext?.isSalesHead) {
            const teamRes = await dashboardApi.getTeamPerformance();
            if (teamRes.success) setTeamMembers(teamRes.data || []);
          }
        } else {
          setError(response.error || 'Failed to load dashboard data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const loadAiSummary = async () => {
      try {
        const res = await dashboardApi.getAiSummary();
        if (res.success && res.data) setAiSummary(res.data.summary);
      } catch (err) { console.error(err); }
      finally { setAiLoading(false); }
    };
    loadAiSummary();
  }, []);

  const loadTeamMatrix = async () => {
    setMatrixLoading(true);
    try {
      const res = await dashboardApi.getTeamMatrix();
      if (res.success) setTeamMatrix(res.data);
    } catch { /* silent */ }
    finally { setMatrixLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'team-matrix' && !teamMatrix && !matrixLoading) {
      loadTeamMatrix();
    }
  }, [activeTab]);

  // Also auto-load team matrix on mount
  useEffect(() => {
    loadTeamMatrix();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="p-6"><p className="text-muted-foreground">No data available</p></div>;
  }

  const userCtx = (stats as any).userContext || {};
  const isSalesHead = userCtx.isSalesHead;
  const isAdmin = userCtx.role === 'Admin';

  // Filter stats by lead_type_id for tabs
  // For now, same data for all tabs (backend already filters by role)
  // TODO: Backend can return separate tender/lead stats when lead_type_id filter is added

  const statusData = (stats.tendersByStatus || []).map((item: any) => ({
    name: item.status,
    value: item.count,
    color: item.status === 'Won' ? '#059669' :
      item.status === 'Lost' ? '#ef4444' :
      item.status === 'Draft' ? '#6b7280' :
      item.status === 'Submitted' ? '#8b5cf6' :
      item.status === 'Under Review' ? '#3b82f6' :
      item.status === 'Shortlisted' ? '#10b981' : '#f59e0b',
  }));

  const categoryData = stats.tendersByCategory || [];
  const recentActivities = stats.recentActivities || [];

  const StatsGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <DashboardStatCard title="Total" value={stats.totalTenders.toString()} icon={FileText} color="bg-blue-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Active" value={stats.activeTenders.toString()} icon={AlertCircle} color="bg-green-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Won" value={stats.wonTenders.toString()} icon={CheckCircle2} color="bg-emerald-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Total Value" value={formatCurrency(stats.totalValue)} rawValue={stats.totalValue} icon={DollarSign} color="bg-purple-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="EMD" value={formatCurrency(stats.totalEMD || 0) || 'N/A'} rawValue={stats.totalEMD || 0} icon={DollarSign} color="bg-amber-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Fees" value={formatCurrency(stats.totalFees || 0) || 'N/A'} rawValue={stats.totalFees || 0} icon={DollarSign} color="bg-orange-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Win Rate" value={`${(stats.avgWinRate || 0).toFixed(1)}%`} icon={TrendingUp} color="bg-indigo-500" formatCurrency={formatCurrency} />
      <DashboardStatCard title="Deadlines" value={stats.upcomingDeadlines.toString()} icon={Clock} color="bg-red-500" formatCurrency={formatCurrency} />
    </div>
  );

  const AiAnalysisCard = () => (
    <div className="bg-amber-50/60 border-l-4 border-amber-400 rounded-r-xl p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-purple-700 mb-1">AI Analysis</h3>
          {aiLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse h-3 bg-amber-200 rounded w-3/4" />
            </div>
          ) : aiSummary ? (
            <p className="text-sm text-gray-700 leading-relaxed">{aiSummary}</p>
          ) : (
            <p className="text-sm text-gray-500 italic">AI analysis not available. Configure AI in Administration to enable.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? 'Organization-wide overview' :
               isSalesHead ? `Your product line performance (${userCtx.teamMemberCount || 0} team members)` :
               'Your personal performance metrics'}
            </p>
          </div>
          {/* Role Badge */}
          <div className="flex items-center gap-2">
            {isSalesHead && (
              <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
                <Crown className="w-3 h-3" />Sales Head
              </Badge>
            )}
            {isAdmin && (
              <Badge className="bg-indigo-100 text-indigo-800">Admin</Badge>
            )}
            {!isAdmin && !isSalesHead && (
              <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1">
                <Users className="w-3 h-3" />{userCtx.fullName || 'Team Member'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-6">
          <TabsList>
            <TabsTrigger value="combined" className="text-sm py-2.5 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />Combined
            </TabsTrigger>
            <TabsTrigger value="tenders" className="text-sm py-2.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4" />Tenders
            </TabsTrigger>
            <TabsTrigger value="leads" className="text-sm py-2.5 flex items-center gap-1.5">
              <Users className="w-4 h-4" />Leads
            </TabsTrigger>
            <TabsTrigger value="team-matrix" className="text-sm py-2.5 flex items-center gap-1.5">
              <Users className="w-4 h-4" />Team Performance
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* Combined Tab */}
          <TabsContent value="combined" className="mt-0 p-6 space-y-6">
            <StatsGrid />
            <AiAnalysisCard />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="mb-4 font-medium">By Category</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-6">
                <h3 className="mb-4 font-medium">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius={95} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Team Performance (Sales Head only) */}
            {isSalesHead && teamMembers.length > 0 && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />My Team Performance
                  </h3>
                  <button onClick={() => setExpandedMembers(!expandedMembers)}
                    className="text-xs text-indigo-600 hover:underline">
                    {expandedMembers ? 'Collapse' : `Show all ${teamMembers.length} members`}
                  </button>
                </div>
                {/* Summary row */}
                <div className="grid grid-cols-5 gap-3 mb-3 text-center">
                  <div className="bg-blue-50 rounded-lg p-2"><p className="text-lg font-bold text-blue-700">{teamMembers.reduce((s, m) => s + (m.tender_count || 0), 0)}</p><p className="text-xs text-blue-600">Tenders</p></div>
                  <div className="bg-green-50 rounded-lg p-2"><p className="text-lg font-bold text-green-700">{teamMembers.reduce((s, m) => s + (m.lead_count || 0), 0)}</p><p className="text-xs text-green-600">Leads</p></div>
                  <div className="bg-emerald-50 rounded-lg p-2"><p className="text-lg font-bold text-emerald-700">{teamMembers.reduce((s, m) => s + (m.won_count || 0), 0)}</p><p className="text-xs text-emerald-600">Won</p></div>
                  <div className="bg-purple-50 rounded-lg p-2"><p className="text-lg font-bold text-purple-700">{formatCurrency(teamMembers.reduce((s, m) => s + parseFloat(m.total_value || 0), 0))}</p><p className="text-xs text-purple-600">Total Value</p></div>
                  <div className="bg-amber-50 rounded-lg p-2"><p className="text-lg font-bold text-amber-700">{formatCurrency(teamMembers.reduce((s, m) => s + parseFloat(m.won_value || 0), 0))}</p><p className="text-xs text-amber-600">Won Value</p></div>
                </div>
                {/* Individual members */}
                {expandedMembers && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="px-3 py-2 text-left">Member</th>
                          <th className="px-3 py-2 text-right">Tenders</th>
                          <th className="px-3 py-2 text-right">Leads</th>
                          <th className="px-3 py-2 text-right">Won</th>
                          <th className="px-3 py-2 text-right">Total Value</th>
                          <th className="px-3 py-2 text-right">Won Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMembers.map((m: any) => (
                          <tr key={m.id} className="border-t hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700">
                                  {(m.full_name || '').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                  <p className="font-medium text-xs">{m.full_name}</p>
                                  <p className="text-xs text-gray-500">{m.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">{m.tender_count || 0}</td>
                            <td className="px-3 py-2 text-right">{m.lead_count || 0}</td>
                            <td className="px-3 py-2 text-right font-medium text-green-600">{m.won_count || 0}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(parseFloat(m.total_value || 0))}</td>
                            <td className="px-3 py-2 text-right font-medium">{formatCurrency(parseFloat(m.won_value || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* Recent Activities */}
            <Card className="p-6">
              <h3 className="mb-4 font-medium">Recent Activities</h3>
              <div className="space-y-2">
                {recentActivities.length > 0 ? (
                  recentActivities.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">{activity.user_name || activity.user?.fullName || 'System'}</p>
                          <Badge variant="outline" className="text-xs">{activity.activity_type || activity.activityType}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{activity.description || activity.tender_title || 'Activity'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(activity.created_at || activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activities</p>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Tenders Tab */}
          <TabsContent value="tenders" className="mt-0 p-6 space-y-6">
            <StatsGrid />
            <AiAnalysisCard />
            <Card className="p-6">
              <h3 className="mb-4 font-medium">Tender Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="mt-0 p-6 space-y-6">
            <StatsGrid />
            <AiAnalysisCard />
            <Card className="p-6">
              <h3 className="mb-4 font-medium">Lead Categories</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Team Matrix Tab */}
          <TabsContent value="team-matrix" className="mt-0 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Team Performance Matrix</h3>
                <Button variant="outline" size="sm" onClick={loadTeamMatrix} disabled={matrixLoading}>
                  {matrixLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-1">Refresh</span>
                </Button>
              </div>

              {matrixLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : !teamMatrix ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Click Refresh to load team performance data</p>
                </div>
              ) : (
                <div className="border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 sticky left-0 bg-gray-50 min-w-[180px] border-r border-gray-200 z-20">Team Member</th>
                          {teamMatrix.stages.map((stage: any) => (
                            <th key={stage.id} className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[110px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: stage.color || '#9CA3AF' }} />
                                <div className="flex items-center gap-1">
                                  <span>{stage.name}</span>
                                  <span className="relative group/tip">
                                    <Info className="h-3 w-3 text-gray-300 hover:text-gray-500 cursor-help" />
                                    <span className="absolute z-[200] top-full left-1/2 -translate-x-1/2 mt-1.5 w-56 p-2.5 bg-gray-900 text-white text-[11px] font-normal leading-relaxed rounded-lg shadow-xl opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-150 text-left whitespace-normal">
                                      {stageDescriptions[stage.name] || `${stage.name} stage — ${stage.probability}% probability of closing.`}
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900" />
                                    </span>
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-normal">{stage.probability}%</span>
                              </div>
                            </th>
                          ))}
                          <th className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[80px] border-l border-gray-200 bg-green-50">Total</th>
                          <th className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[80px] bg-green-50">Won</th>
                          <th className="text-center px-3 py-3 font-semibold text-gray-700 min-w-[80px] bg-red-50">Lost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamMatrix.users.map((user: any, idx: number) => (
                          <tr key={user.userId} className={`border-b border-gray-100 hover:bg-gray-50 ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                            <td className="px-4 py-3 sticky left-0 bg-white border-r border-gray-200 z-10">
                              <div>
                                <p className="font-medium text-gray-900">{user.fullName}</p>
                                <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                              </div>
                            </td>
                            {teamMatrix.stages.map((stage: any) => {
                              const stageData = user.stages[stage.id];
                              const count = stageData?.count || 0;
                              return (
                                <td key={stage.id} className="text-center px-3 py-3">
                                  {count > 0 ? (
                                    <LeadHoverCard userId={user.userId} stageName={stage.name} stageColor={stage.color || '#9CA3AF'} count={count} onNavigate={onNavigate}>
                                      <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full text-sm font-semibold cursor-pointer hover:scale-110 transition-transform"
                                        style={{ backgroundColor: (stage.color || '#9CA3AF') + '20', color: stage.color || '#6B7280' }}>
                                        {count}
                                      </span>
                                    </LeadHoverCard>
                                  ) : (
                                    <span className="text-gray-300">&mdash;</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="text-center px-3 py-3 border-l border-gray-200 bg-green-50/30 font-semibold text-gray-900">{user.totalLeads}</td>
                            <td className="text-center px-3 py-3 bg-green-50/30">
                              <span className="text-green-700 font-semibold">{user.wonCount}</span>
                            </td>
                            <td className="text-center px-3 py-3 bg-red-50/30">
                              <span className="text-red-600 font-semibold">{user.lostCount}</span>
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row */}
                        {teamMatrix.users.length > 0 && (
                          <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                            <td className="px-4 py-3 sticky left-0 bg-gray-100 border-r border-gray-200 z-10">
                              <p className="font-bold text-gray-900">TOTAL</p>
                            </td>
                            {teamMatrix.stages.map((stage: any) => {
                              const stageTotal = teamMatrix.users.reduce((sum: number, u: any) => sum + (u.stages[stage.id]?.count || 0), 0);
                              return (
                                <td key={stage.id} className="text-center px-3 py-3 font-bold text-gray-900">
                                  {stageTotal > 0 ? stageTotal : '\u2014'}
                                </td>
                              );
                            })}
                            <td className="text-center px-3 py-3 border-l border-gray-200 bg-green-100/50 font-bold text-gray-900">
                              {teamMatrix.users.reduce((s: number, u: any) => s + u.totalLeads, 0)}
                            </td>
                            <td className="text-center px-3 py-3 bg-green-100/50 font-bold text-green-700">
                              {teamMatrix.users.reduce((s: number, u: any) => s + u.wonCount, 0)}
                            </td>
                            <td className="text-center px-3 py-3 bg-red-100/50 font-bold text-red-600">
                              {teamMatrix.users.reduce((s: number, u: any) => s + u.lostCount, 0)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
