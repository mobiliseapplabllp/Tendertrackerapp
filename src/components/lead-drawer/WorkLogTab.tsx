import { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Clock, Plus, User } from 'lucide-react';
import { leadApi } from '../../lib/api';
import { useSettings } from '../../hooks/useSettings';
import type { LeadActivity } from '../../lib/types';

interface WorkLogTabProps {
  leadId: number;
}

// Task entries (from the Tasks tab) have descriptions prefixed with [Urgent]/[High]/[Medium]/[Low]
// Exclude them from the Work Log so they don't appear in two places.
const isTaskEntry = (description: string) =>
  /^\[(Urgent|High|Medium|Low)\]/.test(description || '');

export function WorkLogTab({ leadId }: WorkLogTabProps) {
  const [workLogs, setWorkLogs] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    description: '',
    workType: 'General',
    hoursSpent: '',
    workDate: new Date().toISOString().split('T')[0],
  });
  const { formatDate } = useSettings();

  const fetchWorkLogs = useCallback(async () => {
    try {
      setLoading(true);
      // Use leadApi — the canonical API for leads
      const response = await leadApi.getActivities(leadId);
      if (response.success && response.data) {
        const acts = (response.data as any[]).map((a: any) => ({
          id: a.id,
          leadId: a.tender_id || a.lead_id || a.leadId,
          userId: a.user_id || a.userId,
          performedByName: a.user_name || a.performedByName || a.full_name,
          activityType: a.activity_type || a.activityType,
          description: a.description,
          createdAt: a.created_at || a.createdAt,
        }));
        // Work Log = 'Commented' type activities that are NOT task entries
        setWorkLogs(
          acts.filter(
            (a) => a.activityType === 'Commented' && !isTaskEntry(a.description)
          )
        );
      }
    } catch (err) {
      console.error('Error fetching work logs:', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchWorkLogs();
  }, [fetchWorkLogs]);

  const handleAdd = async () => {
    if (!form.description.trim()) return;
    setIsAdding(true);
    try {
      let desc = form.description.trim();
      if (form.workType !== 'General') desc = `[${form.workType}] ${desc}`;
      if (form.hoursSpent) desc += ` (${form.hoursSpent} hrs)`;

      const response = await leadApi.addActivity(leadId, {
        activityType: 'Commented',
        description: desc,
      });

      if (response.success) {
        setForm({
          description: '',
          workType: 'General',
          hoursSpent: '',
          workDate: new Date().toISOString().split('T')[0],
        });
        await fetchWorkLogs();
      } else {
        console.error('Failed to add work log:', response.error);
      }
    } catch (err) {
      console.error('Error adding work log:', err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Add Work Log Form */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3 border">
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Add Work Log Entry</span>
        </div>
        <div className="flex gap-2">
          <Select value={form.workType} onValueChange={(v) => setForm({ ...form, workType: v })}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {['General', 'Research', 'Documentation', 'Communication', 'Analysis', 'Preparation', 'Review', 'Other'].map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={form.workDate}
            onChange={e => setForm({ ...form, workDate: e.target.value })}
            className="w-32 h-8 text-xs"
          />
          <Input
            type="number"
            placeholder="Hours"
            value={form.hoursSpent}
            onChange={e => setForm({ ...form, hoursSpent: e.target.value })}
            className="w-20 h-8 text-xs"
          />
        </div>
        <Textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Describe the work done..."
          className="text-xs min-h-[60px]"
        />
        <Button size="sm" onClick={handleAdd} disabled={!form.description.trim() || isAdding}>
          {isAdding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Add Entry
        </Button>
      </div>

      {/* Work Log List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : workLogs.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          No work log entries yet
        </div>
      ) : (
        <div className="space-y-3">
          {workLogs.map(log => (
            <div key={log.id} className="bg-white border rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{log.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {log.performedByName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {log.performedByName}
                      </span>
                    )}
                    <span>{formatDate(log.createdAt)}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">Work Log</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
