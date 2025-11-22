import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Settings as SettingsIcon, Save, Database, Lock, Bell } from 'lucide-react';

export function Settings() {
  const [settings, setSettings] = useState({
    companyName: 'Your Company Name',
    companyEmail: 'contact@company.com',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    twoFactorAuth: false,
    emailNotifications: true,
    desktopNotifications: false,
    autoArchive: true,
    autoArchiveDays: '90',
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
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
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Company Settings */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Company Settings
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={settings.companyName}
                    onChange={(e) =>
                      setSettings({ ...settings, companyName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Email</Label>
                  <Input
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) =>
                      setSettings({ ...settings, companyEmail: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Regional Settings */}
          <Card className="p-6">
            <h3 className="mb-4">Regional Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={settings.timezone}
                  onChange={(e) =>
                    setSettings({ ...settings, timezone: e.target.value })
                  }
                >
                  <option value="UTC">UTC</option>
                  <option value="EST">Eastern Time (EST)</option>
                  <option value="CST">Central Time (CST)</option>
                  <option value="PST">Pacific Time (PST)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={settings.dateFormat}
                  onChange={(e) =>
                    setSettings({ ...settings, dateFormat: e.target.value })
                  }
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <select
                  className="w-full border rounded-md px-3 py-2"
                  value={settings.currency}
                  onChange={(e) =>
                    setSettings({ ...settings, currency: e.target.value })
                  }
                >
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="INR">INR - Indian Rupee</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Security Settings */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Security Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p>Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
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
                <Label>Password Requirements</Label>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="text-sm">• Minimum 8 characters</p>
                  <p className="text-sm">• At least one uppercase letter</p>
                  <p className="text-sm">• At least one number</p>
                  <p className="text-sm">• At least one special character</p>
                </div>
              </div>
              <Button variant="outline">Change Password</Button>
            </div>
          </Card>

          {/* Notification Preferences */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p>Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email alerts for important updates
                  </p>
                </div>
                <Switch
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, emailNotifications: checked })
                  }
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p>Desktop Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Show desktop notifications for tender updates
                  </p>
                </div>
                <Switch
                  checked={settings.desktopNotifications}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, desktopNotifications: checked })
                  }
                />
              </div>
            </div>
          </Card>

          {/* Data Management */}
          <Card className="p-6">
            <h3 className="mb-4">Data Management</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p>Auto-Archive Old Tenders</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically archive closed tenders after a period
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
                <div className="space-y-2">
                  <Label>Archive after (days)</Label>
                  <Input
                    type="number"
                    value={settings.autoArchiveDays}
                    onChange={(e) =>
                      setSettings({ ...settings, autoArchiveDays: e.target.value })
                    }
                    className="w-32"
                  />
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                <Label>Database Connection</Label>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm">
                    <strong>MySQL Database Configuration</strong>
                  </p>
                  <p className="text-sm mt-2">
                    Configure your MySQL database connection in your environment
                    variables or configuration file when deploying to production.
                  </p>
                  <p className="text-sm mt-2 text-muted-foreground">
                    This frontend prototype uses local state. In production, all
                    data will be stored in your MySQL database.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">Export Data</Button>
                <Button variant="outline">Import Data</Button>
                <Button variant="outline">Backup Database</Button>
              </div>
            </div>
          </Card>

          {/* System Information */}
          <Card className="p-6">
            <h3 className="mb-4">System Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between p-2">
                <span className="text-muted-foreground">Version</span>
                <span>1.0.0</span>
              </div>
              <Separator />
              <div className="flex justify-between p-2">
                <span className="text-muted-foreground">Environment</span>
                <span>Development (Frontend Prototype)</span>
              </div>
              <Separator />
              <div className="flex justify-between p-2">
                <span className="text-muted-foreground">Database</span>
                <span>Ready for MySQL Integration</span>
              </div>
              <Separator />
              <div className="flex justify-between p-2">
                <span className="text-muted-foreground">Last Updated</span>
                <span>November 22, 2025</span>
              </div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
