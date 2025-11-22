import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Mail, Plus, Trash2, Bell, X, Save } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface EmailConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailConfigDialog({ isOpen, onClose }: EmailConfigDialogProps) {
  const [recipients, setRecipients] = useState([
    'john.smith@company.com',
    'sarah.johnson@company.com',
  ]);
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

  const handleAddEmail = () => {
    if (newEmail && !recipients.includes(newEmail)) {
      setRecipients([...recipients, newEmail]);
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setRecipients(recipients.filter((e) => e !== email));
  };

  const handleSave = () => {
    // In a real app, save to backend
    alert('Email notification settings saved successfully!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-[70%] bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg">Email Notification Settings</h2>
              <p className="text-sm text-muted-foreground">Configure daily email alerts for tender deadlines</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="space-y-6">
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
                    onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                  />
                  <Button onClick={handleAddEmail}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
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
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="days30">30 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Early warning for upcoming tenders
                      </p>
                    </div>
                    <Switch
                      id="days30"
                      checked={notifications.days30}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, days30: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="days15">15 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Mid-term reminder
                      </p>
                    </div>
                    <Switch
                      id="days15"
                      checked={notifications.days15}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, days15: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="days10">10 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Preparation time reminder
                      </p>
                    </div>
                    <Switch
                      id="days10"
                      checked={notifications.days10}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, days10: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="days7">7 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        One week warning
                      </p>
                    </div>
                    <Switch
                      id="days7"
                      checked={notifications.days7}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, days7: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="days3">3 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Final preparation alert
                      </p>
                    </div>
                    <Switch
                      id="days3"
                      checked={notifications.days3}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, days3: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="days2">2 Days Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Urgent reminder
                      </p>
                    </div>
                    <Switch
                      id="days2"
                      checked={notifications.days2}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, days2: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="days1">1 Day Before Due Date</Label>
                      <p className="text-sm text-muted-foreground">
                        Final day alert
                      </p>
                    </div>
                    <Switch
                      id="days1"
                      checked={notifications.days1}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, days1: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="overdue">Overdue Tenders</Label>
                      <p className="text-sm text-muted-foreground">
                        Daily alerts for overdue tenders
                      </p>
                    </div>
                    <Switch
                      id="overdue"
                      checked={notifications.overdue}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, overdue: checked })
                      }
                    />
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
            </div>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}