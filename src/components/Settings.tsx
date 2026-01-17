import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Settings as SettingsIcon,
  Save,
  Database,
  Lock,
  Bell,
  Globe,
  HardDrive,
  Info,
  Mail,
  Monitor,
  Building2,
  Download,
  Upload,
  Shield
} from 'lucide-react';
import { adminApi } from '../lib/api';
import type { SystemConfig } from '../lib/types';
import { clearSettingsCache, showDesktopNotification } from '../lib/settings';

interface SettingsState {
  // Company Settings
  companyName: string;
  companyEmail: string;

  // Regional Settings
  timezone: string;
  dateFormat: string;
  currency: string;

  // Security Settings
  twoFactorAuth: boolean;
  sessionTimeout: number; // minutes
  passwordMinLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;

  // Email Notifications
  emailNotifications: boolean;
  emailOnTenderCreated: boolean;
  emailOnTenderUpdated: boolean;
  emailOnTenderDeadline: boolean;
  emailOnTenderWon: boolean;
  emailOnTenderLost: boolean;

  // Desktop Notifications
  desktopNotifications: boolean;
  desktopOnTenderCreated: boolean;
  desktopOnTenderUpdated: boolean;
  desktopOnTenderDeadline: boolean;
  desktopOnTenderWon: boolean;
  desktopOnTenderLost: boolean;

  // Data Management
  autoArchive: boolean;
  autoArchiveDays: number;
}

export function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsState>({
    companyName: '',
    companyEmail: '',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    currency: 'INR',
    twoFactorAuth: false,
    sessionTimeout: 30,
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    emailNotifications: true,
    emailOnTenderCreated: true,
    emailOnTenderUpdated: true,
    emailOnTenderDeadline: true,
    emailOnTenderWon: true,
    emailOnTenderLost: true,
    desktopNotifications: false,
    desktopOnTenderCreated: true,
    desktopOnTenderUpdated: true,
    desktopOnTenderDeadline: true,
    desktopOnTenderWon: true,
    desktopOnTenderLost: true,
    autoArchive: false,
    autoArchiveDays: 90,
  });

  // Load settings from API
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('You must be logged in to view settings. Please refresh the page and login again.');
        setLoading(false);
        return;
      }

      const response = await adminApi.getConfig();

      if (response.success && response.data) {
        const configs = response.data as SystemConfig[];
        const configMap: Record<string, string> = {};

        configs.forEach((config) => {
          configMap[config.configKey] = config.configValue;
        });

        // Parse settings from config
        setSettings({
          companyName: configMap['company_name'] || '',
          companyEmail: configMap['company_email'] || '',
          timezone: configMap['timezone'] || 'UTC',
          dateFormat: configMap['date_format'] || 'MM/DD/YYYY',
          currency: configMap['currency'] || 'INR',
          twoFactorAuth: (configMap['two_factor_auth'] || '').toLowerCase() === 'true',
          sessionTimeout: parseInt(configMap['session_timeout'] || '30', 10) || 30,
          passwordMinLength: parseInt(configMap['password_min_length'] || '8', 10) || 8,
          requireUppercase: configMap['password_require_uppercase'] !== 'false',
          requireNumbers: configMap['password_require_numbers'] !== 'false',
          requireSpecialChars: configMap['password_require_special'] !== 'false',
          emailNotifications: configMap['email_notifications'] !== 'false',
          emailOnTenderCreated: configMap['email_on_tender_created'] !== 'false',
          emailOnTenderUpdated: configMap['email_on_tender_updated'] !== 'false',
          emailOnTenderDeadline: configMap['email_on_tender_deadline'] !== 'false',
          emailOnTenderWon: configMap['email_on_tender_won'] !== 'false',
          emailOnTenderLost: configMap['email_on_tender_lost'] !== 'false',
          desktopNotifications: configMap['desktop_notifications'] === 'true',
          desktopOnTenderCreated: configMap['desktop_on_tender_created'] !== 'false',
          desktopOnTenderUpdated: configMap['desktop_on_tender_updated'] !== 'false',
          desktopOnTenderDeadline: configMap['desktop_on_tender_deadline'] !== 'false',
          desktopOnTenderWon: configMap['desktop_on_tender_won'] !== 'false',
          desktopOnTenderLost: configMap['desktop_on_tender_lost'] !== 'false',
          autoArchive: configMap['auto_archive'] === 'true',
          autoArchiveDays: parseInt(configMap['auto_archive_days'] || '90', 10) || 90,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async (configKey: string, configValue: string, configType: string = 'string') => {
    try {
      // Ensure configValue is a string (convert null/undefined to empty string)
      let value = configValue ?? '';

      // For boolean types, ensure lowercase 'true' or 'false'
      if (configType === 'boolean') {
        value = value.toLowerCase() === 'true' ? 'true' : 'false';
      }

      await adminApi.updateConfig(configKey, value, configType);
    } catch (err: any) {
      throw new Error(`Failed to save ${configKey}: ${err.message}`);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Save all settings to API
      await Promise.all([
        saveConfig('company_name', settings.companyName),
        saveConfig('company_email', settings.companyEmail),
        saveConfig('timezone', settings.timezone),
        saveConfig('date_format', settings.dateFormat),
        saveConfig('currency', settings.currency),
        saveConfig('two_factor_auth', settings.twoFactorAuth.toString(), 'boolean'),
        saveConfig('session_timeout', settings.sessionTimeout.toString(), 'number'),
        saveConfig('password_min_length', settings.passwordMinLength.toString(), 'number'),
        saveConfig('password_require_uppercase', settings.requireUppercase.toString(), 'boolean'),
        saveConfig('password_require_numbers', settings.requireNumbers.toString(), 'boolean'),
        saveConfig('password_require_special', settings.requireSpecialChars.toString(), 'boolean'),
        saveConfig('email_notifications', settings.emailNotifications.toString(), 'boolean'),
        saveConfig('email_on_tender_created', settings.emailOnTenderCreated.toString(), 'boolean'),
        saveConfig('email_on_tender_updated', settings.emailOnTenderUpdated.toString(), 'boolean'),
        saveConfig('email_on_tender_deadline', settings.emailOnTenderDeadline.toString(), 'boolean'),
        saveConfig('email_on_tender_won', settings.emailOnTenderWon.toString(), 'boolean'),
        saveConfig('email_on_tender_lost', settings.emailOnTenderLost.toString(), 'boolean'),
        saveConfig('desktop_notifications', settings.desktopNotifications.toString(), 'boolean'),
        saveConfig('desktop_on_tender_created', settings.desktopOnTenderCreated.toString(), 'boolean'),
        saveConfig('desktop_on_tender_updated', settings.desktopOnTenderUpdated.toString(), 'boolean'),
        saveConfig('desktop_on_tender_deadline', settings.desktopOnTenderDeadline.toString(), 'boolean'),
        saveConfig('desktop_on_tender_won', settings.desktopOnTenderWon.toString(), 'boolean'),
        saveConfig('desktop_on_tender_lost', settings.desktopOnTenderLost.toString(), 'boolean'),
        saveConfig('auto_archive', settings.autoArchive.toString(), 'boolean'),
        saveConfig('auto_archive_days', settings.autoArchiveDays.toString(), 'number'),
      ]);

      // Clear settings cache so fresh settings are loaded
      clearSettingsCache();

      // Reload settings from API to ensure UI reflects saved values
      await fetchSettings();

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);

      // Apply settings to application
      applySettings();
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const applySettings = () => {
    // Store settings in localStorage for immediate application
    localStorage.setItem('app_settings', JSON.stringify({
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      currency: settings.currency,
    }));
  };

  const handleTestDesktopNotification = async () => {
    try {
      console.log('Testing desktop notification...');

      // Check if browser supports notifications
      if (!('Notification' in window)) {
        const errorMsg = 'Your browser does not support desktop notifications.';
        console.error(errorMsg);
        setError(errorMsg);
        setTimeout(() => setError(null), 5000);
        return;
      }

      console.log('Current notification permission:', Notification.permission);

      // Request permission if not already granted
      if (Notification.permission === 'default') {
        console.log('Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);

        if (permission !== 'granted') {
          const errorMsg = `Notification permission was ${permission}. Please enable notifications in your browser settings.`;
          console.error(errorMsg);
          setError(errorMsg);
          setTimeout(() => setError(null), 5000);
          return;
        }
      }

      if (Notification.permission === 'denied') {
        const errorMsg = 'Notification permission is denied. Please enable notifications in your browser settings (usually in the address bar or browser settings).';
        console.error(errorMsg);
        setError(errorMsg);
        setTimeout(() => setError(null), 5000);
        return;
      }

      // Send test notification (bypass settings check for testing)
      if (Notification.permission === 'granted') {
        console.log('Permission granted, creating notification...');
        try {
          const notification = new Notification('🔔 Test Desktop Notification', {
            body: 'This is a test notification to verify desktop notifications are working correctly. If you see this, notifications are working!',
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%233b82f6"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">🔔</text></svg>',
            badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%233b82f6"/></svg>',
            tag: 'test-notification-' + Date.now(), // Unique tag so multiple notifications can appear
            requireInteraction: true, // Keep notification visible until user interacts
            silent: false,
            timestamp: Date.now(),
          });

          console.log('Notification created:', notification);

          // Add event listeners for debugging
          notification.onclick = () => {
            console.log('Notification clicked');
            window.focus();
          };

          notification.onshow = () => {
            console.log('Notification shown');
          };

          notification.onerror = (error) => {
            console.error('Notification error:', error);
          };

          notification.onclose = () => {
            console.log('Notification closed');
          };

          // Also try showing an alert to confirm the notification was created
          console.log('Notification object:', notification);
          console.log('Notification title:', notification.title);
          console.log('Notification body:', notification.body);

          // Show multiple notifications to make sure one appears
          setTimeout(() => {
            try {
              const notification2 = new Notification('✅ Desktop Notifications Working!', {
                body: 'If you see this notification, desktop notifications are working correctly on your system.',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%2310b981"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">✓</text></svg>',
                tag: 'test-notification-2-' + Date.now(),
                requireInteraction: false,
                silent: false,
              });
              console.log('Second notification created:', notification2);
            } catch (err) {
              console.error('Error creating second notification:', err);
            }
          }, 1000);

          // Create a visible alert in the UI as well
          const alertDiv = document.createElement('div');
          alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 20px 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-size: 16px;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
          `;
          alertDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="font-size: 24px;">🔔</div>
              <div>
                <strong>Desktop Notification Sent!</strong><br/>
                <small>If you don't see it, check your system notification settings.</small>
              </div>
            </div>
          `;
          document.body.appendChild(alertDiv);

          setTimeout(() => {
            alertDiv.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alertDiv.remove(), 300);
          }, 5000);

          // Add CSS animation if not already present
          if (!document.getElementById('notification-animations')) {
            const style = document.createElement('style');
            style.id = 'notification-animations';
            style.textContent = `
              @keyframes slideIn {
                from {
                  transform: translateX(100%);
                  opacity: 0;
                }
                to {
                  transform: translateX(0);
                  opacity: 1;
                }
              }
              @keyframes slideOut {
                from {
                  transform: translateX(0);
                  opacity: 1;
                }
                to {
                  transform: translateX(100%);
                  opacity: 0;
                }
              }
            `;
            document.head.appendChild(style);
          }

          setSuccess('✅ Notification sent! Check the green alert in the top-right corner. If you still don\'t see a system notification, your browser/system may be blocking it. See instructions below.');
          setTimeout(() => setSuccess(null), 10000);
        } catch (error: any) {
          console.error('Error creating notification:', error);
          setError(`Failed to send notification: ${error.message}. Check browser console for details.`);
          setTimeout(() => setError(null), 5000);
        }
      } else {
        console.error('Unexpected permission state:', Notification.permission);
        setError(`Unexpected permission state: ${Notification.permission}`);
        setTimeout(() => setError(null), 5000);
      }
    } catch (err: any) {
      console.error('Error in handleTestDesktopNotification:', err);
      setError(err.message || 'Failed to send test notification. Check browser console for details.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleExportData = async () => {
    try {
      // This would call an export API endpoint
      setError('Export functionality will be implemented with backend API');
    } catch (err: any) {
      setError(err.message || 'Failed to export data');
    }
  };

  const handleImportData = async () => {
    try {
      // This would call an import API endpoint
      setError('Import functionality will be implemented with backend API');
    } catch (err: any) {
      setError(err.message || 'Failed to import data');
    }
  };

  const handleBackupDatabase = async () => {
    try {
      // This would call a backup API endpoint
      setError('Backup functionality will be implemented with backend API');
    } catch (err: any) {
      setError(err.message || 'Failed to backup database');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-gray-900" />
            Settings
          </h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <SettingsIcon className="w-6 h-6" />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure application preferences and system settings
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </Card>
          )}
          {success && (
            <Card className="p-4 bg-green-50 border-green-200 mb-6">
              <p className="text-green-800 text-sm">{success}</p>
            </Card>
          )}

          <Tabs defaultValue="company" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="company">
                <Building2 className="w-4 h-4 mr-2" />
                Company Settings
              </TabsTrigger>
              <TabsTrigger value="data">
                <HardDrive className="w-4 h-4 mr-2" />
                Data Management
              </TabsTrigger>
              <TabsTrigger value="regional">
                <Globe className="w-4 h-4 mr-2" />
                Regional
              </TabsTrigger>
              <TabsTrigger value="security">
                <Lock className="w-4 h-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="email" data-testid="tab-email">
                <Mail className="w-4 h-4 mr-2" />
                Email Notifications
              </TabsTrigger>
              <TabsTrigger value="desktop">
                <Monitor className="w-4 h-4 mr-2" />
                Desktop Notifications
              </TabsTrigger>
            </TabsList>

            {/* Company Settings Tab */}
            <TabsContent value="company" className="space-y-6 mt-6">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Company Information
                </h3>
                <div className="space-y-6">
                  {/* Current Company Data Table */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Current Company Details (from Database)</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company Name</TableHead>
                          <TableHead>Company Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            {settings.companyName || (
                              <span className="text-muted-foreground italic">Not set</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {settings.companyEmail || (
                              <span className="text-muted-foreground italic">Not set</span>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <Separator />

                  {/* Update Company Information */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Update Company Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company-name">Company Name *</Label>
                        <Input
                          id="company-name"
                          value={settings.companyName}
                          onChange={(e) =>
                            setSettings({ ...settings, companyName: e.target.value })
                          }
                          placeholder="Enter company name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-email">Company Email *</Label>
                        <Input
                          id="company-email"
                          type="email"
                          value={settings.companyEmail}
                          onChange={(e) =>
                            setSettings({ ...settings, companyEmail: e.target.value })
                          }
                          placeholder="contact@company.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      <strong>Note:</strong> Company information is used in email templates, reports, and system communications.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Data Management Tab */}
            <TabsContent value="data" className="space-y-6 mt-6">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Data Management
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-Archive Old Tenders</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically archive closed tenders after a specified period
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoArchive}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, autoArchive: checked })
                      }
                    />
                  </div>
                  {settings.autoArchive && (
                    <div className="space-y-2 pl-6">
                      <Label htmlFor="archive-days">Archive after (days)</Label>
                      <Input
                        id="archive-days"
                        type="number"
                        value={settings.autoArchiveDays}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          setSettings({ ...settings, autoArchiveDays: isNaN(value) ? 90 : Math.max(1, value) });
                        }}
                        className="w-32"
                        min="1"
                      />
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label>Data Operations</Label>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" onClick={handleExportData}>
                          <Download className="w-4 h-4 mr-2" />
                          Export Data
                        </Button>
                        <Button variant="outline" onClick={handleImportData}>
                          <Upload className="w-4 h-4 mr-2" />
                          Import Data
                        </Button>
                        <Button variant="outline" onClick={handleBackupDatabase}>
                          <Database className="w-4 h-4 mr-2" />
                          Backup Database
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Regional Settings Tab */}
            <TabsContent value="regional" className="space-y-6 mt-6">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Regional Settings
                </h3>
                <div className="space-y-6">
                  {/* Current Regional Settings Table */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Current Regional Settings (from Database)</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Setting</TableHead>
                          <TableHead>Current Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Timezone</TableCell>
                          <TableCell>
                            {settings.timezone || (
                              <span className="text-muted-foreground italic">Not set</span>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Date Format</TableCell>
                          <TableCell>
                            {settings.dateFormat || (
                              <span className="text-muted-foreground italic">Not set</span>
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Currency</TableCell>
                          <TableCell>
                            {settings.currency || (
                              <span className="text-muted-foreground italic">Not set</span>
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <Separator />

                  {/* Update Regional Settings */}
                  <div>
                    <h4 className="text-sm font-medium mb-3">Update Regional Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                          value={settings.timezone}
                          onValueChange={(value) =>
                            setSettings({ ...settings, timezone: value })
                          }
                        >
                          <SelectTrigger id="timezone">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                            <SelectItem value="Asia/Kolkata">IST (India Standard Time)</SelectItem>
                            <SelectItem value="America/New_York">EST (Eastern Time)</SelectItem>
                            <SelectItem value="America/Chicago">CST (Central Time)</SelectItem>
                            <SelectItem value="America/Denver">MST (Mountain Time)</SelectItem>
                            <SelectItem value="America/Los_Angeles">PST (Pacific Time)</SelectItem>
                            <SelectItem value="Europe/London">GMT (Greenwich Mean Time)</SelectItem>
                            <SelectItem value="Europe/Paris">CET (Central European Time)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date-format">Date Format</Label>
                        <Select
                          value={settings.dateFormat}
                          onValueChange={(value) =>
                            setSettings({ ...settings, dateFormat: value })
                          }
                        >
                          <SelectTrigger id="date-format">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US Format)</SelectItem>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (European Format)</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                          value={settings.currency}
                          onValueChange={(value) =>
                            setSettings({ ...settings, currency: value })
                          }
                        >
                          <SelectTrigger id="currency">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                            <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                            <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                            <SelectItem value="JPY">JPY - Japanese Yen (¥)</SelectItem>
                            <SelectItem value="AUD">AUD - Australian Dollar (A$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      <strong>Impact:</strong> These settings affect date displays, currency formatting, and time calculations throughout the application. Changes will be applied immediately after saving.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Security Settings Tab */}
            <TabsContent value="security" className="space-y-6 mt-6">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication (2FA)</p>
                      <p className="text-sm text-muted-foreground">
                        Require OTP verification for all user logins
                      </p>
                    </div>
                    <Switch
                      checked={settings.twoFactorAuth}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, twoFactorAuth: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        setSettings({ ...settings, sessionTimeout: isNaN(value) ? 30 : Math.max(5, Math.min(480, value)) });
                      }}
                      className="w-32"
                      min="5"
                      max="480"
                    />
                    <p className="text-sm text-muted-foreground">
                      Users will be automatically logged out after this period of inactivity
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <Label>Password Requirements</Label>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Minimum Length</p>
                          <p className="text-xs text-muted-foreground">Minimum number of characters</p>
                        </div>
                        <Input
                          type="number"
                          value={settings.passwordMinLength}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            setSettings({ ...settings, passwordMinLength: isNaN(value) ? 8 : Math.max(6, Math.min(32, value)) });
                          }}
                          className="w-20"
                          min="6"
                          max="32"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Require Uppercase Letters</p>
                          <p className="text-xs text-muted-foreground">At least one uppercase letter (A-Z)</p>
                        </div>
                        <Switch
                          checked={settings.requireUppercase}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, requireUppercase: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Require Numbers</p>
                          <p className="text-xs text-muted-foreground">At least one number (0-9)</p>
                        </div>
                        <Switch
                          checked={settings.requireNumbers}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, requireNumbers: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Require Special Characters</p>
                          <p className="text-xs text-muted-foreground">At least one special character (!@#$%^&*)</p>
                        </div>
                        <Switch
                          checked={settings.requireSpecialChars}
                          onCheckedChange={(checked) =>
                            setSettings({ ...settings, requireSpecialChars: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Impact:</strong> Security settings affect user authentication, password validation, and session management. 2FA will be enforced for all users. Password requirements apply to new password creation and password changes.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Email Notifications Tab */}
            <TabsContent value="email" className="space-y-6 mt-6">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Email Notification Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Master switch for all email notifications
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, emailNotifications: checked })
                      }
                    />
                  </div>
                  {settings.emailNotifications && (
                    <>
                      <Separator />
                      <div className="space-y-3 pl-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Created</p>
                            <p className="text-xs text-muted-foreground">Notify when a new tender is created</p>
                          </div>
                          <Switch
                            checked={settings.emailOnTenderCreated}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, emailOnTenderCreated: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Updated</p>
                            <p className="text-xs text-muted-foreground">Notify when a tender is updated</p>
                          </div>
                          <Switch
                            checked={settings.emailOnTenderUpdated}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, emailOnTenderUpdated: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Deadline Approaching</p>
                            <p className="text-xs text-muted-foreground">Notify before tender deadlines</p>
                          </div>
                          <Switch
                            checked={settings.emailOnTenderDeadline}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, emailOnTenderDeadline: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Won</p>
                            <p className="text-xs text-muted-foreground">Notify when a tender is won</p>
                          </div>
                          <Switch
                            checked={settings.emailOnTenderWon}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, emailOnTenderWon: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Lost</p>
                            <p className="text-xs text-muted-foreground">Notify when a tender is lost</p>
                          </div>
                          <Switch
                            checked={settings.emailOnTenderLost}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, emailOnTenderLost: checked })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Impact:</strong> Email notifications are sent to configured recipients based on these preferences. Configure recipients in the Email Alerts page.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Desktop Notifications Tab */}
            <TabsContent value="desktop" className="space-y-6 mt-6">
              <Card className="p-6">
                <h3 className="mb-4 flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Desktop Notification Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Desktop Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Show browser notifications for tender updates
                      </p>
                    </div>
                    <Switch
                      checked={settings.desktopNotifications}
                      onCheckedChange={(checked) => {
                        setSettings({ ...settings, desktopNotifications: checked });
                        if (checked && 'Notification' in window) {
                          Notification.requestPermission().catch((err) => {
                            console.error('Error requesting notification permission:', err);
                          });
                        }
                      }}
                    />
                  </div>
                  {settings.desktopNotifications && (
                    <>
                      <Separator />
                      <div className="space-y-3 pl-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Created</p>
                            <p className="text-xs text-muted-foreground">Show notification when a new tender is created</p>
                          </div>
                          <Switch
                            checked={settings.desktopOnTenderCreated}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, desktopOnTenderCreated: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Updated</p>
                            <p className="text-xs text-muted-foreground">Show notification when a tender is updated</p>
                          </div>
                          <Switch
                            checked={settings.desktopOnTenderUpdated}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, desktopOnTenderUpdated: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Deadline Approaching</p>
                            <p className="text-xs text-muted-foreground">Show notification before tender deadlines</p>
                          </div>
                          <Switch
                            checked={settings.desktopOnTenderDeadline}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, desktopOnTenderDeadline: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Won</p>
                            <p className="text-xs text-muted-foreground">Show notification when a tender is won</p>
                          </div>
                          <Switch
                            checked={settings.desktopOnTenderWon}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, desktopOnTenderWon: checked })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Tender Lost</p>
                            <p className="text-xs text-muted-foreground">Show notification when a tender is lost</p>
                          </div>
                          <Switch
                            checked={settings.desktopOnTenderLost}
                            onCheckedChange={(checked) =>
                              setSettings({ ...settings, desktopOnTenderLost: checked })
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Impact:</strong> Desktop notifications appear in your browser even when the application is in the background. You'll be prompted to allow notifications when enabling this feature.
                    </p>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestDesktopNotification}
                        className="flex items-center gap-2"
                      >
                        <Bell className="w-4 h-4" />
                        Send Test Notification
                      </Button>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 font-medium mb-2">
                        ⚠️ Not seeing notifications?
                      </p>
                      <div className="text-xs text-yellow-700 space-y-1">
                        <p><strong>macOS:</strong></p>
                        <ol className="list-decimal list-inside ml-2 space-y-1">
                          <li>Open System Settings → Notifications</li>
                          <li>Find your browser (Chrome/Safari/Firefox)</li>
                          <li>Ensure "Allow Notifications" is ON</li>
                          <li>Check "Banner" or "Alert" style is selected</li>
                          <li>Disable "Do Not Disturb" mode</li>
                        </ol>
                        <p className="mt-2"><strong>Check Notification Center:</strong> Click the date/time in the top-right corner or swipe left from the right edge.</p>
                        <p className="mt-2"><strong>Browser Settings:</strong> Click the lock/info icon in the address bar → Site Settings → Notifications → Allow</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
