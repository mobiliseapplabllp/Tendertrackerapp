import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Loader2, Edit2, Trash2,
  List, LayoutGrid, Sparkles, AlertTriangle, Filter, X,
} from 'lucide-react';
import { contentCalendarApi, marketingCampaignApi } from '../lib/api';

// ---- Types ----
interface CalendarEvent {
  id: number;
  title: string;
  content_type: string;
  channel: string;
  scheduled_date: string;
  status: string;
  content: string;
  campaign_id: number | null;
  campaign_name?: string;
  created_at: string;
}

interface MarketingCampaign {
  id: number;
  name: string;
}

// ---- Constants ----
const CHANNELS = ['linkedin', 'facebook', 'twitter', 'instagram', 'youtube', 'email', 'blog'] as const;
const CONTENT_TYPES = ['social_post', 'email', 'blog', 'event', 'other'] as const;
const STATUSES = ['idea', 'draft', 'scheduled', 'published', 'cancelled'] as const;
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CHANNEL_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-500 text-white',
  facebook: 'bg-indigo-500 text-white',
  twitter: 'bg-gray-800 text-white',
  instagram: 'bg-pink-500 text-white',
  youtube: 'bg-red-500 text-white',
  email: 'bg-emerald-500 text-white',
  blog: 'bg-orange-500 text-white',
};

const CHANNEL_DOT_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-500',
  facebook: 'bg-indigo-500',
  twitter: 'bg-gray-800',
  instagram: 'bg-pink-500',
  youtube: 'bg-red-500',
  email: 'bg-emerald-500',
  blog: 'bg-orange-500',
};

const STATUS_COLORS: Record<string, string> = {
  idea: 'bg-purple-100 text-purple-700',
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

// ---- Helpers ----
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function toInputDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toInputTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate();
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// ================================================================
// Content Calendar Page
// ================================================================
export function ContentCalendarPage() {
  // ---- Core state ----
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Filters ----
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ---- Dialog state ----
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContentType, setFormContentType] = useState('social_post');
  const [formChannel, setFormChannel] = useState('linkedin');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formStatus, setFormStatus] = useState('draft');
  const [formContent, setFormContent] = useState('');
  const [formCampaignId, setFormCampaignId] = useState('');

  // ---- AI suggest ----
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // ---- Marketing campaigns ----
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);

  // ---- Deleting ----
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ================================================================
  // Calendar grid calculation
  // ================================================================
  const calendarGrid = useMemo(() => {
    const firstOfMonth = new Date(currentYear, currentMonth, 1);
    const lastOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Get the day-of-week for the 1st (0=Sun, adjust for Mon-start)
    let startDow = firstOfMonth.getDay(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert: Mon=0 .. Sun=6

    // Calculate start date (back to Monday of first week)
    const startDate = new Date(firstOfMonth);
    startDate.setDate(startDate.getDate() - startDow);

    // Generate 6 rows of 7 days (42 cells covers all months)
    const weeks: Date[][] = [];
    const cursor = new Date(startDate);

    // Use 6 rows to ensure we always cover the entire month
    for (let row = 0; row < 6; row++) {
      const week: Date[] = [];
      for (let col = 0; col < 7; col++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }

    // Trim trailing rows where every day is in the next month
    while (
      weeks.length > 4 &&
      weeks[weeks.length - 1].every(d => d.getMonth() !== currentMonth)
    ) {
      weeks.pop();
    }

    return { weeks, firstOfMonth, lastOfMonth };
  }, [currentYear, currentMonth]);

  // ================================================================
  // Data fetching
  // ================================================================
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {
        year: String(currentYear),
        month: String(currentMonth + 1),
      };
      if (channelFilter) params.channel = channelFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await contentCalendarApi.getEvents(params);
      if (res.success) {
        setEvents(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } else {
        setError(res.error || 'Failed to load calendar events');
      }
    } catch {
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, channelFilter, statusFilter]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await marketingCampaignApi.getAll();
      if (res.success) {
        setCampaigns(Array.isArray(res.data) ? res.data : res.data?.data || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // ================================================================
  // Filtered events for list view
  // ================================================================
  const filteredSortedEvents = useMemo(() => {
    return [...events].sort((a, b) =>
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );
  }, [events]);

  // ================================================================
  // Navigation
  // ================================================================
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear(y => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear(y => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // ================================================================
  // Dialog handlers
  // ================================================================
  const openCreateDialog = (prefilledDate?: Date) => {
    setEditingEvent(null);
    setFormTitle('');
    setFormContentType('social_post');
    setFormChannel('linkedin');
    setFormDate(prefilledDate ? toInputDate(prefilledDate) : toInputDate(new Date()));
    setFormTime('09:00');
    setFormStatus('draft');
    setFormContent('');
    setFormCampaignId('');
    setDialogError(null);
    setShowDialog(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormContentType(event.content_type);
    setFormChannel(event.channel);
    const d = new Date(event.scheduled_date);
    setFormDate(toInputDate(d));
    setFormTime(toInputTime(d));
    setFormStatus(event.status);
    setFormContent(event.content || '');
    setFormCampaignId(event.campaign_id ? String(event.campaign_id) : '');
    setDialogError(null);
    setShowDialog(true);
  };

  const handleSaveEvent = async () => {
    if (!formTitle.trim()) { setDialogError('Title is required'); return; }
    if (!formDate) { setDialogError('Scheduled date is required'); return; }

    setDialogSaving(true);
    setDialogError(null);

    const scheduledDate = `${formDate}T${formTime || '09:00'}:00`;
    const payload: any = {
      title: formTitle.trim(),
      content_type: formContentType,
      channel: formChannel,
      scheduled_date: scheduledDate,
      status: formStatus,
      content: formContent,
      campaign_id: formCampaignId ? Number(formCampaignId) : null,
    };

    try {
      const res = editingEvent
        ? await contentCalendarApi.updateEvent(editingEvent.id, payload)
        : await contentCalendarApi.createEvent(payload);

      if (res.success) {
        setShowDialog(false);
        fetchEvents();
      } else {
        setDialogError(res.error || 'Failed to save event');
      }
    } catch {
      setDialogError('Failed to save event');
    } finally {
      setDialogSaving(false);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Delete this content item? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await contentCalendarApi.deleteEvent(id);
      fetchEvents();
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  };

  const handleAiSuggest = async () => {
    setAiSuggesting(true);
    try {
      const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${lastDay}`;

      const res = await contentCalendarApi.aiSuggest({
        contentTypes: ['social_post', 'email', 'blog'],
        channels: ['linkedin', 'facebook', 'email', 'blog'],
        startDate,
        endDate,
      });

      if (res.success && Array.isArray(res.data)) {
        // Refresh events to pick up any AI-created suggestions
        fetchEvents();
      }
    } catch { /* silent */ }
    finally { setAiSuggesting(false); }
  };

  // ================================================================
  // Get events for a specific day
  // ================================================================
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.scheduled_date);
      return isSameDay(eventDate, day);
    });
  };

  // ================================================================
  // Render
  // ================================================================
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-50 rounded-lg">
            <Calendar className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
            <p className="text-sm text-gray-500">Plan and schedule marketing content</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Suggest */}
          <Button variant="outline" onClick={handleAiSuggest} disabled={aiSuggesting} className="gap-2">
            {aiSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Content Suggestions
          </Button>
          {/* Schedule Content */}
          <Button onClick={() => openCreateDialog()} className="gap-2">
            <Plus className="h-4 w-4" /> Schedule Content
          </Button>
        </div>
      </div>

      {/* Navigation + View Toggle + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday} className="font-semibold text-gray-900 min-w-[180px] justify-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Filters + View Toggle */}
        <div className="flex items-center gap-2">
          {/* Channel filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <Select value={channelFilter || 'all'} onValueChange={v => setChannelFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                {CHANNELS.map(ch => (
                  <SelectItem key={ch} value={ch} className="capitalize">{ch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map(st => (
                <SelectItem key={st} value={st} className="capitalize">{st}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear filters */}
          {(channelFilter || statusFilter) && (
            <Button
              variant="ghost" size="sm" className="h-8 px-2 text-gray-500"
              onClick={() => { setChannelFilter(''); setStatusFilter(''); }}
              aria-label="Clear filters"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* Divider */}
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm" className="h-7 px-2.5 gap-1 text-xs"
              onClick={() => setViewMode('month')}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Month
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm" className="h-7 px-2.5 gap-1 text-xs"
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5" /> List
            </Button>
          </div>
        </div>
      </div>

      {/* Channel Legend */}
      <div className="flex flex-wrap gap-3">
        {CHANNELS.map(ch => (
          <div key={ch} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${CHANNEL_DOT_COLORS[ch]}`} />
            <span className="text-xs text-gray-500 capitalize">{ch}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Loading calendar...</span>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p>{error}</p>
          <Button variant="outline" className="mt-3" onClick={fetchEvents}>Retry</Button>
        </div>
      ) : viewMode === 'month' ? (
        /* ========== MONTH VIEW ========== */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="px-2 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar rows */}
            {calendarGrid.weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
                {week.map((day, di) => {
                  const isCurrentMonth = day.getMonth() === currentMonth;
                  const dayEvents = getEventsForDay(day);
                  const isTodayCell = isToday(day);

                  return (
                    <div
                      key={di}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCreateDialog(day); } }}
                      className={`min-h-[110px] border-r border-gray-100 last:border-r-0 p-1.5 transition-colors
                        ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                        ${isTodayCell ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/30' : ''}
                        hover:bg-gray-50 cursor-pointer group`}
                      onClick={() => openCreateDialog(day)}
                      aria-label={`${day.getDate()} ${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}, ${getEventsForDay(day).length} events. Click to schedule content.`}
                    >
                      {/* Date number */}
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium leading-none
                          ${isTodayCell ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : ''}
                          ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                        `}>
                          {day.getDate()}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-3 w-3 text-gray-400" />
                        </span>
                      </div>

                      {/* Event pills */}
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(event => (
                          <div
                            key={event.id}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openEditDialog(event); } }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer ${CHANNEL_COLORS[event.channel] || 'bg-gray-400 text-white'}`}
                            title={`${event.title} (${event.channel})`}
                            onClick={(e) => { e.stopPropagation(); openEditDialog(event); }}
                            aria-label={`Edit ${event.title} on ${event.channel}`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-gray-500 px-1 font-medium">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        /* ========== LIST VIEW ========== */
        <Card className="overflow-hidden">
          {filteredSortedEvents.length === 0 ? (
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No content scheduled this month</p>
              <p className="text-gray-400 text-sm mt-1">Schedule content or use AI Content Suggestions to fill your calendar</p>
              <Button className="mt-4 gap-2" onClick={() => openCreateDialog()}>
                <Plus className="h-4 w-4" /> Schedule Content
              </Button>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Channel</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Campaign</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSortedEvents.map(event => (
                    <tr key={event.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 whitespace-nowrap">
                        {formatDate(event.scheduled_date)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatTime(event.scheduled_date)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 max-w-[250px] truncate">{event.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] ${CHANNEL_COLORS[event.channel] || 'bg-gray-400 text-white'}`}>
                          {event.channel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">
                        {event.content_type.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={STATUS_COLORS[event.status] || 'bg-gray-100 text-gray-700'}>
                          {event.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">
                        {event.campaign_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900"
                            onClick={() => openEditDialog(event)}
                            aria-label={`Edit ${event.title}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            disabled={deletingId === event.id}
                            onClick={() => handleDeleteEvent(event.id)}
                            aria-label={`Delete ${event.title}`}
                          >
                            {deletingId === event.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />
                            }
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Empty state for month view */}
      {!loading && !error && viewMode === 'month' && events.length === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400">No content scheduled for {MONTH_NAMES[currentMonth]} {currentYear}</p>
        </div>
      )}

      {/* ========== Create / Edit Dialog ========== */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Content' : 'Add Content'}</DialogTitle>
            <DialogDescription>
              {editingEvent ? 'Update this content item' : 'Schedule new marketing content'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {dialogError && (
              <div className="bg-red-50 text-red-700 px-3 py-2 rounded-md text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {dialogError}
                <button onClick={() => setDialogError(null)} className="ml-auto" aria-label="Dismiss error"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}

            <div>
              <Label>Title *</Label>
              <Input
                placeholder="Content title"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Content Type</Label>
                <Select value={formContentType} onValueChange={setFormContentType}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(ct => (
                      <SelectItem key={ct} value={ct} className="capitalize">
                        {ct.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Channel</Label>
                <Select value={formChannel} onValueChange={setFormChannel}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map(ch => (
                      <SelectItem key={ch} value={ch} className="capitalize">{ch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Scheduled Date *</Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={e => setFormDate(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formTime}
                  onChange={e => setFormTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(st => (
                    <SelectItem key={st} value={st} className="capitalize">{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Content</Label>
              <Textarea
                placeholder="Write the content or notes here..."
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                className="mt-1.5"
                rows={4}
              />
            </div>

            <div>
              <Label>Link to Campaign (optional)</Label>
              <Select value={formCampaignId || 'none'} onValueChange={v => setFormCampaignId(v === 'none' ? '' : v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {campaigns.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="flex gap-2">
              {editingEvent && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5"
                  disabled={deletingId === editingEvent.id}
                  onClick={() => {
                    handleDeleteEvent(editingEvent.id);
                    setShowDialog(false);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveEvent} disabled={dialogSaving} className="gap-2">
                {dialogSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingEvent ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
