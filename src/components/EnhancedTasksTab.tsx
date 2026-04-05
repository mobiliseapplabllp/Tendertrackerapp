import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
    Plus, ListTodo, CheckCircle2, Trash2, Calendar, Clock, User, Search,
    Filter, Mail, MessageSquare, AlertCircle, TrendingUp, CheckSquare, X, Edit2
} from 'lucide-react';
import type { WorkLogReminder, User as UserType } from '../lib/types';
import { reminderApi, tenderApi } from '../lib/api';

interface EnhancedTasksTabProps {
    tender: any;
    users: UserType[];
    reminders: WorkLogReminder[];
    onRefresh: () => void;
}

type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
type TaskFilter = 'all' | 'active' | 'completed' | 'overdue';

const EnhancedTasksTab: React.FC<EnhancedTasksTabProps> = ({ tender, users, reminders, onRefresh }) => {
    // Task Form State
    const [newTaskForm, setNewTaskForm] = useState({
        title: '',
        description: '',
        priority: 'Medium' as TaskPriority,
        status: 'Pending' as TaskStatus,
        dueDate: '',
        assignedTo: undefined as number | undefined,
        estimatedHours: '',
        sendEmail: false,
        sendSMS: false,
    });

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<TaskFilter>('all');
    const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'created'>('dueDate');
    const [editingTask, setEditingTask] = useState<number | null>(null);
    const [isFormExpanded, setIsFormExpanded] = useState(false);
    const [sendingMetrics, setSendingMetrics] = useState<Record<number, string>>({});

    // Helper Functions
    const safeDate = (dateStr: string | undefined | null) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
    };

    const isOverdue = (dueDate: string | undefined | null) => {
        if (!dueDate) return false;
        const due = new Date(dueDate);
        return due < new Date() && !isNaN(due.getTime());
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'bg-red-100 text-red-800 border-red-300';
            case 'High': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'Low': return 'bg-green-100 text-green-800 border-green-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'Urgent': return '🔴';
            case 'High': return '🟠';
            case 'Medium': return '🟡';
            case 'Low': return '🟢';
            default: return '⚪';
        }
    };

    const extractPriorityFromTitle = (title: string): TaskPriority => {
        if (title.includes('[Urgent]')) return 'Urgent';
        if (title.includes('[High]')) return 'High';
        if (title.includes('[Medium]')) return 'Medium';
        if (title.includes('[Low]')) return 'Low';
        if (title.includes('[Medium]')) return 'Medium';
        if (title.includes('[Low]')) return 'Low';
        return 'Medium';
    };

    // Clean description to remove priority
    const cleanDescription = (description: string) => {
        return description.replace(/^\[(Urgent|High|Medium|Low)\]\s*/, '');
    };

    // Parse task metadata from description
    const parseTaskMetadata = (reminder: WorkLogReminder) => {
        const title = reminder.actionRequired || '';
        const priority = extractPriorityFromTitle(title);
        const cleanTitle = title.replace(/\[(Urgent|High|Medium|Low)\]\s*/, '');

        // Try to get description from activity if available, or use title
        // Note: The backend 'getReminders' now returns joined data, but we need to ensure description is available
        // For now, let's assume valid description is passed or we default to title
        // In the new 'getReminders' logic, we fetch 'r.*'. The description is actually on the activity. 
        // We might need to update the backend to returning activity description or store it on reminder.
        // However, for now, we will rely on what we have. 
        // User requested to show description. 

        return {
            ...reminder,
            priority,
            cleanTitle,
            isOverdue: isOverdue(reminder.dueDate),
            assigneeName: reminder.recipients && reminder.recipients.length > 0
                ? (reminder.recipients[0].user?.fullName || reminder.recipients[0].email || 'External')
                : 'Unassigned'
        };
    };

    // Filtered and Sorted Tasks
    const processedTasks = useMemo(() => {
        let tasks = reminders.map(parseTaskMetadata);

        // Apply search filter
        if (searchQuery) {
            tasks = tasks.filter(task =>
                task.cleanTitle.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply status filter
        switch (filterStatus) {
            case 'active':
                tasks = tasks.filter(t => !t.isCompleted);
                break;
            case 'completed':
                tasks = tasks.filter(t => t.isCompleted);
                break;
            case 'overdue':
                tasks = tasks.filter(t => !t.isCompleted && t.isOverdue);
                break;
        }

        // Apply sorting
        tasks.sort((a, b) => {
            switch (sortBy) {
                case 'dueDate':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                case 'priority':
                    const priorityOrder = { 'Urgent': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                case 'created':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                default:
                    return 0;
            }
        });

        return tasks;
    }, [reminders, searchQuery, filterStatus, sortBy]);

    // Task Statistics
    const stats = useMemo(() => {
        const total = reminders.length;
        const completed = reminders.filter(r => r.isCompleted).length;
        const active = total - completed;
        const overdue = reminders.filter(r => !r.isCompleted && isOverdue(r.dueDate)).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, active, overdue, completionRate };
    }, [reminders]);

    // Create Task Handler
    const handleCreateTask = async () => {
        if (!tender || !newTaskForm.title || !newTaskForm.description) return;

        try {
            const taskDesc = `[${newTaskForm.priority}] ${newTaskForm.title}: ${newTaskForm.description}`;

            // Create activity
            const activityRes = await tenderApi.addActivity(tender.id, {
                activityType: 'Task',
                description: taskDesc,
                hoursSpent: parseFloat(newTaskForm.estimatedHours) || 0,
                workDate: new Date().toISOString()
            });

            if (activityRes.success && activityRes.data) {
                // Create reminder with notification preferences
                await reminderApi.create(activityRes.data.id, {
                    actionRequired: newTaskForm.title,
                    dueDate: newTaskForm.dueDate,
                    recipients: newTaskForm.assignedTo ? [{ userId: newTaskForm.assignedTo }] : [],
                    sendEmail: newTaskForm.sendEmail,
                    sendSMS: newTaskForm.sendSMS,
                });

                // Reset form
                setNewTaskForm({
                    title: '',
                    description: '',
                    priority: 'Medium',
                    status: 'Pending',
                    dueDate: '',
                    assignedTo: undefined,
                    estimatedHours: '',
                    sendEmail: false,
                    sendSMS: false,
                });

                onRefresh();
            }
        } catch (err) {
            console.error('Failed to create task:', err);
            alert('Failed to create task');
        }
    };

    // Toggle Complete Handler
    const handleToggleComplete = async (reminderId: number, currentStatus: boolean) => {
        try {
            await reminderApi.markComplete(reminderId, !currentStatus);
            onRefresh();
        } catch (err) {
            console.error('Failed to update task:', err);
        }
    };

    // Delete Task Handler
    const handleDeleteTask = async (reminderId: number) => {
        if (!confirm('Delete this task? This action cannot be undone.')) return;

        try {
            await reminderApi.delete(reminderId);
            onRefresh();
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
    };

    // Send Notification Handler
    const handleSendNotification = async (reminderId: number, type: 'email' | 'sms') => {
        setSendingMetrics(prev => ({ ...prev, [reminderId]: type }));
        try {
            await reminderApi.sendNotification(reminderId, type);
            alert(`${type === 'email' ? 'Email' : 'SMS'} sent successfully!`);
        } catch (err) {
            console.error('Failed to send notification:', err);
            alert('Failed to send notification');
        } finally {
            setSendingMetrics(prev => {
                const newMetrics = { ...prev };
                delete newMetrics[reminderId];
                return newMetrics;
            });
        }
    };

    return (
        <div className="space-y-4">
            {/* Task Statistics */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-blue-600 font-medium">Total Tasks</p>
                            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                        </div>
                        <ListTodo className="w-8 h-8 text-blue-400" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-green-600 font-medium">Completed</p>
                            <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
                        </div>
                        <CheckSquare className="w-8 h-8 text-green-400" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-amber-600 font-medium">Active</p>
                            <p className="text-2xl font-bold text-amber-900">{stats.active}</p>
                        </div>
                        <Clock className="w-8 h-8 text-amber-400" />
                    </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-3 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs text-red-600 font-medium">Overdue</p>
                            <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                </div>
            </div>

            {/* Create New Task Form */}
            <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                <div
                    className="p-4 bg-slate-50 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => setIsFormExpanded(!isFormExpanded)}
                >
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-indigo-600" /> Create New Task
                    </h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isFormExpanded ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </div>

                {isFormExpanded && (
                    <div className="p-4 space-y-3 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600 font-medium">Title *</Label>
                                <Input
                                    value={newTaskForm.title}
                                    onChange={e => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                                    placeholder="Task title..."
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600 font-medium">Priority</Label>
                                <Select
                                    value={newTaskForm.priority}
                                    onValueChange={(v: TaskPriority) => setNewTaskForm({ ...newTaskForm, priority: v })}
                                >
                                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Low">🟢 Low</SelectItem>
                                        <SelectItem value="Medium">🟡 Medium</SelectItem>
                                        <SelectItem value="High">🟠 High</SelectItem>
                                        <SelectItem value="Urgent">🔴 Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs text-slate-600 font-medium">Description *</Label>
                            <Textarea
                                value={newTaskForm.description}
                                onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                                placeholder="Task details..."
                                className="text-sm min-h-[60px]"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600 font-medium">Assignee</Label>
                                <Select
                                    value={newTaskForm.assignedTo?.toString() || 'none'}
                                    onValueChange={v => setNewTaskForm({ ...newTaskForm, assignedTo: v === 'none' ? undefined : Number(v) })}
                                >
                                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select user" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Unassigned</SelectItem>
                                        {users.map(u => <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600 font-medium">Due Date</Label>
                                <Input
                                    type="date"
                                    value={newTaskForm.dueDate}
                                    onChange={e => setNewTaskForm({ ...newTaskForm, dueDate: e.target.value })}
                                    className="h-9 text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600 font-medium">Est. Hours</Label>
                                <Input
                                    type="number"
                                    value={newTaskForm.estimatedHours}
                                    onChange={e => setNewTaskForm({ ...newTaskForm, estimatedHours: e.target.value })}
                                    placeholder="8"
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newTaskForm.sendEmail}
                                    onChange={e => setNewTaskForm({ ...newTaskForm, sendEmail: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <Mail className="w-3.5 h-3.5" />
                                Send Email Notification
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={newTaskForm.sendSMS}
                                    onChange={e => setNewTaskForm({ ...newTaskForm, sendSMS: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300"
                                />
                                <MessageSquare className="w-3.5 h-3.5" />
                                Send SMS Notification
                            </label>
                        </div>
                        <Button
                            onClick={handleCreateTask}
                            disabled={!newTaskForm.title || !newTaskForm.description}
                            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-sm font-medium"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Create Task
                        </Button>
                    </div>
                )}
            </div>

            {/* Filters and Search */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search tasks..."
                        className="pl-10 h-9 text-sm"
                    />
                </div>
                <Select value={filterStatus} onValueChange={(v: TaskFilter) => setFilterStatus(v)}>
                    <SelectTrigger className="w-40 h-9 text-sm">
                        <Filter className="w-3.5 h-3.5 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tasks</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-40 h-9 text-sm">
                        <TrendingUp className="w-3.5 h-3.5 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="dueDate">Due Date</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="created">Created Date</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Task List */}
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ListTodo className="w-4 h-4" /> Tasks ({processedTasks.length})
                </h3>
                {processedTasks.map(task => (
                    <div
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${task.isOverdue && !task.isCompleted
                            ? 'bg-red-50 border-red-200 hover:border-red-300'
                            : 'bg-white border-slate-200 hover:border-indigo-200'
                            }`}
                    >
                        <div className="flex items-center gap-3 flex-1">
                            <button
                                onClick={() => handleToggleComplete(task.id, task.isCompleted)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${task.isCompleted
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-300 hover:border-indigo-500'
                                    }`}
                            >
                                {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                            </button>
                            <div className="flex-1">
                                <p className={`text-sm font-medium ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                    {task.cleanTitle}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(task.priority)}`}>
                                        {getPriorityIcon(task.priority)} {task.priority}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.isCompleted
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : task.isOverdue
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {task.isCompleted ? '✓ Completed' : task.isOverdue ? '⚠️ Overdue' : '⏳ Pending'}
                                    </span>
                                    {task.dueDate && (
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {safeDate(task.dueDate)}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-500 flex items-center gap-1 border-l pl-2 ml-2">
                                        <User className="w-3 h-3" />
                                        {task.assigneeName}
                                    </span>
                                </div>
                                {/* Description (Assuming it might be part of the title currently or fetched separately, but showing what we have) */}
                                {/* Since we only have actionRequired (title) from reminder, we display that. The full description was in activity. */}
                                {/* To properly show description, we'd need to fetch activity details or update the reminder fetch query. */}
                                {/* For now, 'cleanTitle' acts as the main text. */}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendNotification(task.id, 'email')}
                                disabled={!!sendingMetrics[task.id]}
                                className="hover:bg-blue-50 text-blue-600"
                                title="Send Email Reminder"
                            >
                                <Mail className={`w-4 h-4 ${sendingMetrics[task.id] === 'email' ? 'animate-pulse' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendNotification(task.id, 'sms')}
                                disabled={!!sendingMetrics[task.id]}
                                className="hover:bg-green-50 text-green-600"
                                title="Send SMS Reminder"
                            >
                                <MessageSquare className={`w-4 h-4 ${sendingMetrics[task.id] === 'sms' ? 'animate-pulse' : ''}`} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                className="hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                            </Button>
                        </div>
                    </div>
                ))}
                {processedTasks.length === 0 && (
                    <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-lg">
                        <ListTodo className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">No tasks found</p>
                        <p className="text-xs mt-1">
                            {searchQuery || filterStatus !== 'all'
                                ? 'Try adjusting your filters'
                                : 'Create your first task above'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnhancedTasksTab;
