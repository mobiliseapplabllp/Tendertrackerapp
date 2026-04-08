import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Loader2, Clock, FileText, User, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';
import { tenderApi } from '../../lib/api';
import { useSettings } from '../../hooks/useSettings';
import type { LeadActivity } from '../../lib/types';

interface AuditLogTabProps {
  leadId: number;
}

export function AuditLogTab({ leadId }: AuditLogTabProps) {
  const [auditLogs, setAuditLogs] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatDate } = useSettings();

  useEffect(() => {
    fetchAuditLogs();
  }, [leadId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await tenderApi.getActivities(leadId);
      if (response.success && response.data) {
        const acts = (response.data || []).map((a: any) => ({
          id: a.id,
          leadId: a.tender_id || a.lead_id || a.leadId,
          userId: a.user_id || a.userId,
          performedByName: a.user_name || a.full_name,
          activityType: a.activity_type || a.activityType,
          description: a.description,
          oldValue: a.old_value || a.oldValue,
          newValue: a.new_value || a.newValue,
          createdAt: a.created_at || a.createdAt,
        }));
        // Audit logs are everything EXCEPT work logs (Commented)
        setAuditLogs(acts.filter((a: any) => a.activityType !== 'Commented'));
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'Created': return <FileText className="w-3.5 h-3.5" />;
      case 'Updated': return <RefreshCw className="w-3.5 h-3.5" />;
      case 'Status Changed': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'Document Added': return <FileText className="w-3.5 h-3.5" />;
      case 'Assigned': return <UserCheck className="w-3.5 h-3.5" />;
      case 'Deadline Changed': return <Clock className="w-3.5 h-3.5" />;
      case 'Task': return <Clock className="w-3.5 h-3.5" />;
      default: return <User className="w-3.5 h-3.5" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'Created': return 'bg-green-50 text-green-600';
      case 'Updated': return 'bg-blue-50 text-blue-600';
      case 'Status Changed': return 'bg-purple-50 text-purple-600';
      case 'Document Added': return 'bg-indigo-50 text-indigo-600';
      case 'Assigned': return 'bg-teal-50 text-teal-600';
      case 'Deadline Changed': return 'bg-orange-50 text-orange-600';
      case 'Task': return 'bg-amber-50 text-amber-600';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (auditLogs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm p-4">
        <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        No audit trail entries yet
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {auditLogs.map((log, index) => (
        <div key={log.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(log.activityType)}`}>
              {getIcon(log.activityType)}
            </div>
            {index < auditLogs.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{log.activityType}</Badge>
              {log.performedByName && (
                <span className="text-xs text-gray-500">{log.performedByName}</span>
              )}
              <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
            </div>
            {log.description && (
              <p className="text-sm text-gray-700 mt-1">{log.description}</p>
            )}
            {(log.oldValue || log.newValue) && (
              <div className="text-xs text-gray-500 mt-1">
                {log.oldValue && <span className="line-through text-red-400 mr-2">{log.oldValue}</span>}
                {log.newValue && <span className="text-green-600">{log.newValue}</span>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
