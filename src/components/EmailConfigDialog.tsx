import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Card } from './ui/card';
import { Mail, Plus, Trash2, Bell, Save, Send, MessageSquare, Play } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { adminApi, categoryApi } from '../lib/api';
import { isValidEmail } from '../lib/security';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { TenderCategory } from '../lib/types';

export function EmailAlerts() {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [notifications, setNotifications] = useState({
    days30: true,
    days15: true,
    days10: true,
    days7: true,
    days3: true,
    days2: true,
    days1: true,
    overdue: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categories, setCategories] = useState<TenderCategory[]>([]);
  const [customAlert, setCustomAlert] = useState({
    subject: '',
    message: '',
    categoryId: null as number | null,
    daysUntilDeadline: null as number | null,
  });
  const [sendingCustom, setSendingCustom] = useState(false);
  const [runningSchedule, setRunningSchedule] = useState<string | null>(null);

  // Fetch email alert settings on mount
  useEffect(() => {
    fetchEmailAlerts();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryApi.getAll();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (err: any) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchEmailAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getEmailAlerts();
      if (response.success && response.data) {
        setRecipients(response.data.recipients || []);
        setNotifications(response.data.schedule || {
          days30: true,
          days15: true,
          days10: true,
          days7: true,
          days3: true,
          days2: true,
          days1: true,
          overdue: true,
        });
      } else {
        setError(response.error || 'Failed to load email alert settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load email alert settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!isValidEmail(newEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    const trimmedEmail = newEmail.trim().toLowerCase();
    
    if (recipients.map(e => e.toLowerCase()).includes(trimmedEmail)) {
      setError('This email is already in the recipients list');
      return;
    }

    const updatedRecipients = [...recipients, trimmedEmail];
    setRecipients(updatedRecipients);
    setNewEmail('');
    setError(null);
    setSuccess(null);

    // Auto-save to database immediately
    try {
      setSaving(true);
      const response = await adminApi.updateEmailAlerts(updatedRecipients, notifications);
      if (response.success) {
        setSuccess('Email recipient added and saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to save email recipient');
        // Revert the change if save failed
        setRecipients(recipients);
      }
    } catch (err: any) {
      console.error('Error saving email recipient:', err);
      setError(err.message || 'Failed to save email recipient');
      // Revert the change if save failed
      setRecipients(recipients);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    const updatedRecipients = recipients.filter((e) => e !== email);
    setRecipients(updatedRecipients);
    setError(null);
    setSuccess(null);

    // Auto-save to database immediately
    try {
      setSaving(true);
      const response = await adminApi.updateEmailAlerts(updatedRecipients, notifications);
      if (response.success) {
        setSuccess('Email recipient removed and saved successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to remove email recipient');
        // Revert the change if save failed
        setRecipients(recipients);
      }
    } catch (err: any) {
      console.error('Error removing email recipient:', err);
      setError(err.message || 'Failed to remove email recipient');
      // Revert the change if save failed
      setRecipients(recipients);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await adminApi.updateEmailAlerts(recipients, notifications);
      if (response.success) {
        setSuccess('Email notification settings saved successfully!');
        // Refresh data to ensure we have the latest from server
        await fetchEmailAlerts();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to save email alert settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save email alert settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestNotifications = async () => {
    if (recipients.length === 0) {
      setError('Please add at least one email recipient before sending test notifications');
      return;
    }

    try {
      setTesting(true);
      setError(null);
      setSuccess(null);

      const response = await adminApi.sendTestNotifications();
      if (response.success) {
        const successCount = response.data?.results?.filter((r: any) => r.status === 'success').length || 0;
        setSuccess(`Test notifications sent! ${successCount} out of ${response.data?.results?.length || 0} emails sent successfully. Please check your inbox.`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(response.error || 'Failed to send test notifications');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test notifications');
    } finally {
      setTesting(false);
    }
  };

  const handleRunNotificationSchedule = async (alertType: string) => {
    if (recipients.length === 0) {
      setError('Please add at least one email recipient before running notification schedules');
      return;
    }

    try {
      setRunningSchedule(alertType);
      setError(null);
      setSuccess(null);

      const response = await adminApi.runNotificationSchedule(alertType);
      if (response.success) {
        const alertTypeNames: Record<string, string> = {
          days30: '30 Days Before Due Date',
          days15: '15 Days Before Due Date',
          days10: '10 Days Before Due Date',
          days7: '7 Days Before Due Date',
          days3: '3 Days Before Due Date',
          days2: '2 Days Before Due Date',
          days1: '1 Day Before Due Date',
          overdue: 'Overdue Tenders',
        };
        const alertName = alertTypeNames[alertType] || alertType;
        setSuccess(
          `Notification schedule executed for ${alertName}! ${response.data?.sent || 0} email(s) sent successfully, ${response.data?.failed || 0} failed. ${response.data?.tendersCount || 0} tender(s) found.`
        );
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(response.error || 'Failed to run notification schedule');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to run notification schedule');
    } finally {
      setRunningSchedule(null);
    }
  };

  const handleSendCustomAlert = async () => {
    if (recipients.length === 0) {
      setError('Please add at least one email recipient before sending custom alerts');
      return;
    }

    if (!customAlert.subject.trim()) {
      setError('Please enter a subject for the alert');
      return;
    }

    if (!customAlert.message.trim()) {
      setError('Please enter a message for the alert');
      return;
    }

    try {
      setSendingCustom(true);
      setError(null);
      setSuccess(null);

      const response = await adminApi.sendCustomAlert({
        subject: customAlert.subject,
        message: customAlert.message,
        categoryId: customAlert.categoryId || null,
        daysUntilDeadline: customAlert.daysUntilDeadline || null,
      });

      if (response.success) {
        setSuccess('Custom alert sent successfully! Please check your inbox.');
        setCustomAlert({
          subject: '',
          message: '',
          categoryId: null,
          daysUntilDeadline: null,
        });
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(response.error || 'Failed to send custom alert');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send custom alert');
    } finally {
      setSendingCustom(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Email Alerts
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure daily email alerts for tender deadlines
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleSendTestNotifications} 
              disabled={testing || loading || recipients.length === 0}
            >
              <Send className="w-4 h-4 mr-2" />
              {testing ? 'Sending...' : 'Send Test Emails'}
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading email alert settings...</p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="settings">
                  <Bell className="w-4 h-4 mr-2" />
                  Alert Settings
                </TabsTrigger>
                <TabsTrigger value="custom">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Create Custom Alert
                </TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="space-y-6">
                {/* Error/Success Messages */}
                {error && (
                  <Card className="p-4 bg-red-50 border-red-200">
                    <p className="text-red-800 text-sm">{error}</p>
                  </Card>
                )}
                {success && (
                  <Card className="p-4 bg-green-50 border-green-200">
                    <p className="text-green-800 text-sm">{success}</p>
                  </Card>
                )}
                {/* Recipients Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4" />
                    Email Recipients
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    These people will receive daily tender deadline notifications
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !saving && handleAddEmail()}
                    disabled={saving}
                  />
                  <Button onClick={handleAddEmail} disabled={saving || !newEmail.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Add'}
                  </Button>
                </div>

                <div className="space-y-2">
                  {recipients.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                      No recipients added yet
                    </div>
                  ) : (
                    recipients.map((email) => (
                      <div
                        key={email}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{email}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEmail(email)}
                          disabled={saving}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Notification Settings */}
              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center gap-2 mb-2">
                    <Bell className="w-4 h-4" />
                    Notification Schedule
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Choose when to send email alerts before tender deadlines
                  </p>
                </div>

                <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="days30">30 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Early warning for upcoming tenders
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNotificationSchedule('days30')}
                        disabled={runningSchedule === 'days30' || recipients.length === 0}
                        title="Run this notification schedule now"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {runningSchedule === 'days30' ? 'Running...' : 'Run'}
                      </Button>
                      <Switch
                        id="days30"
                        checked={notifications.days30}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, days30: checked })
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="days15">15 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Mid-term reminder
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNotificationSchedule('days15')}
                        disabled={runningSchedule === 'days15' || recipients.length === 0}
                        title="Run this notification schedule now"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {runningSchedule === 'days15' ? 'Running...' : 'Run'}
                      </Button>
                      <Switch
                        id="days15"
                        checked={notifications.days15}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, days15: checked })
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="days10">10 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Preparation time reminder
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNotificationSchedule('days10')}
                        disabled={runningSchedule === 'days10' || recipients.length === 0}
                        title="Run this notification schedule now"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {runningSchedule === 'days10' ? 'Running...' : 'Run'}
                      </Button>
                      <Switch
                        id="days10"
                        checked={notifications.days10}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, days10: checked })
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="days7">7 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        One week warning
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNotificationSchedule('days7')}
                        disabled={runningSchedule === 'days7' || recipients.length === 0}
                        title="Run this notification schedule now"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {runningSchedule === 'days7' ? 'Running...' : 'Run'}
                      </Button>
                      <Switch
                        id="days7"
                        checked={notifications.days7}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, days7: checked })
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="days3">3 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Final preparation alert
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNotificationSchedule('days3')}
                        disabled={runningSchedule === 'days3' || recipients.length === 0}
                        title="Run this notification schedule now"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {runningSchedule === 'days3' ? 'Running...' : 'Run'}
                      </Button>
                      <Switch
                        id="days3"
                        checked={notifications.days3}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, days3: checked })
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="days2">2 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Urgent reminder
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNotificationSchedule('days2')}
                        disabled={runningSchedule === 'days2' || recipients.length === 0}
                        title="Run this notification schedule now"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {runningSchedule === 'days2' ? 'Running...' : 'Run'}
                      </Button>
                      <Switch
                        id="days2"
                        checked={notifications.days2}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, days2: checked })
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="days1">1 Day Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Final day alert
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNotificationSchedule('days1')}
                        disabled={runningSchedule === 'days1' || recipients.length === 0}
                        title="Run this notification schedule now"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {runningSchedule === 'days1' ? 'Running...' : 'Run'}
                      </Button>
                      <Switch
                        id="days1"
                        checked={notifications.days1}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, days1: checked })
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <Label htmlFor="overdue">Overdue Tenders</Label>
                      <p className="text-sm text-muted-foreground">
                        Daily alerts for overdue tenders
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRunNotificationSchedule('overdue')}
                        disabled={runningSchedule === 'overdue' || recipients.length === 0}
                        title="Run this notification schedule now"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        {runningSchedule === 'overdue' ? 'Running...' : 'Run'}
                      </Button>
                      <Switch
                        id="overdue"
                        checked={notifications.overdue}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, overdue: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        <strong>Note:</strong> Emails will be sent daily at 9:00 AM for
                        all open tenders matching the selected notification criteria.
                      </p>
                      <p className="text-sm mt-2">
                        This is a frontend prototype. In a production environment, these
                        settings would be stored in a database and processed by a
                        scheduled job.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-6">
                {/* Error/Success Messages */}
                {error && (
                  <Card className="p-4 bg-red-50 border-red-200">
                    <p className="text-red-800 text-sm">{error}</p>
                  </Card>
                )}
                {success && (
                  <Card className="p-4 bg-green-50 border-green-200">
                    <p className="text-green-800 text-sm">{success}</p>
                  </Card>
                )}

                <Card className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-4 h-4" />
                        Create Custom Email Alert
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Send a custom email alert to all recipients. Optionally filter by category or days until deadline.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-subject">Subject *</Label>
                      <Input
                        id="custom-subject"
                        placeholder="Enter alert subject"
                        value={customAlert.subject}
                        onChange={(e) => setCustomAlert({ ...customAlert, subject: e.target.value })}
                        disabled={sendingCustom}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="custom-message">Message *</Label>
                      <Textarea
                        id="custom-message"
                        placeholder="Enter your message here. This will be included in the email body."
                        value={customAlert.message}
                        onChange={(e) => setCustomAlert({ ...customAlert, message: e.target.value })}
                        disabled={sendingCustom}
                        rows={6}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="custom-category">Filter by Category (Optional)</Label>
                        <Select
                          value={customAlert.categoryId?.toString() || 'all'}
                          onValueChange={(value) =>
                            setCustomAlert({
                              ...customAlert,
                              categoryId: value === 'all' ? null : parseInt(value),
                            })
                          }
                          disabled={sendingCustom}
                        >
                          <SelectTrigger id="custom-category">
                            <SelectValue placeholder="All Categories" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          If selected, only tenders from this category will be included in the table
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="custom-days">Filter by Days Until Deadline (Optional)</Label>
                        <Input
                          id="custom-days"
                          type="number"
                          placeholder="e.g., 7, 15, 30, -5"
                          value={customAlert.daysUntilDeadline || ''}
                          onChange={(e) =>
                            setCustomAlert({
                              ...customAlert,
                              daysUntilDeadline: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          disabled={sendingCustom}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter number of days (positive for upcoming, negative for overdue)
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex gap-2">
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm">
                            <strong>Note:</strong> If you specify a category or days filter, a table of matching tenders will be automatically included in the email.
                          </p>
                          <p className="text-sm mt-2">
                            The alert will be sent to all configured recipients: {recipients.length > 0 ? recipients.join(', ') : 'No recipients configured'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSendCustomAlert}
                      disabled={sendingCustom || recipients.length === 0}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {sendingCustom ? 'Sending...' : 'Send Custom Alert'}
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}