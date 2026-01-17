import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Send, Loader2, FileText, User, Clock, MessageSquare } from 'lucide-react';
import { leadApi } from '../../lib/api';
import { useSettings } from '../../hooks/useSettings';
import type { LeadActivity } from '../../lib/types';

interface ActivitiesTabProps {
    leadId: number;
}

export function ActivitiesTab({ leadId }: ActivitiesTabProps) {
    const [activities, setActivities] = useState<LeadActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [newWorkLog, setNewWorkLog] = useState('');
    const [isAddingLog, setIsAddingLog] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { formatDate } = useSettings();

    useEffect(() => {
        fetchActivities();
    }, [leadId]);

    const fetchActivities = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await leadApi.getActivities(leadId);

            if (response.success && response.data) {
                setActivities(response.data || []);
            } else {
                setError(response.error || 'Failed to load activities');
            }
        } catch (err: any) {
            console.error('Error fetching activities:', err);
            setError(err.message || 'Failed to load activities');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWorkLog = async () => {
        if (!newWorkLog.trim()) return;

        try {
            setIsAddingLog(true);
            setError(null);

            const response = await leadApi.addActivity(leadId, {
                activityType: 'work_log',
                description: newWorkLog.trim(),
            });

            if (response.success) {
                setNewWorkLog('');
                await fetchActivities();
            } else {
                setError(response.error || 'Failed to add work log');
            }
        } catch (err: any) {
            console.error('Error adding work log:', err);
            setError(err.message || 'Failed to add work log');
        } finally {
            setIsAddingLog(false);
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'work_log':
            case 'note':
                return <MessageSquare className="w-4 h-4" />;
            case 'document_upload':
            case 'document_delete':
                return <FileText className="w-4 h-4" />;
            case 'status_change':
            case 'field_update':
                return <Clock className="w-4 h-4" />;
            default:
                return <User className="w-4 h-4" />;
        }
    };

    const getActivityColor = (type: string): string => {
        switch (type) {
            case 'work_log':
            case 'note':
                return 'bg-blue-50 text-blue-600';
            case 'document_upload':
                return 'bg-green-50 text-green-600';
            case 'document_delete':
                return 'bg-red-50 text-red-600';
            case 'status_change':
                return 'bg-purple-50 text-purple-600';
            case 'field_update':
                return 'bg-orange-50 text-orange-600';
            default:
                return 'bg-gray-50 text-gray-600';
        }
    };

    const getActivityLabel = (type: string): string => {
        const labels: Record<string, string> = {
            'work_log': 'Work Log',
            'note': 'Note',
            'document_upload': 'Document Upload',
            'document_delete': 'Document Delete',
            'status_change': 'Status Change',
            'field_update': 'Update',
            'created': 'Created',
            'assigned': 'Assigned',
        };
        return labels[type] || type.replace(/_/g, ' ');
    };

    const getInitials = (name: string): string => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Add Work Log Section */}
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
                <div className="flex gap-2">
                    <Input
                        placeholder="Add a note or work log..."
                        value={newWorkLog}
                        onChange={(e) => setNewWorkLog(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddWorkLog();
                            }
                        }}
                        className="bg-white"
                        disabled={isAddingLog}
                    />
                    <Button
                        size="icon"
                        onClick={handleAddWorkLog}
                        disabled={isAddingLog || !newWorkLog.trim()}
                    >
                        {isAddingLog ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Press Enter to submit, Shift+Enter for new line
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Activities List */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Clock className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">No activity recorded yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Add your first work log to get started
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activities.map((activity, index) => (
                            <div key={activity.id || index} className="flex gap-3">
                                {/* Timeline Line */}
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(
                                            activity.activityType
                                        )}`}
                                    >
                                        {getActivityIcon(activity.activityType)}
                                    </div>
                                    {index < activities.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-gray-200 mt-2" />
                                    )}
                                </div>

                                {/* Activity Content */}
                                <div className="flex-1 pb-6">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge
                                                variant="outline"
                                                className="text-xs font-medium"
                                            >
                                                {getActivityLabel(activity.activityType)}
                                            </Badge>
                                            {activity.performedByName && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium">
                                                        {getInitials(activity.performedByName)}
                                                    </div>
                                                    <span>{activity.performedByName}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {formatDate(activity.createdAt)}
                                        </span>
                                    </div>

                                    {activity.description && (
                                        <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                                            {activity.description}
                                        </p>
                                    )}

                                    {activity.metadata && (
                                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 font-mono">
                                            {typeof activity.metadata === 'string'
                                                ? activity.metadata
                                                : JSON.stringify(activity.metadata, null, 2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
