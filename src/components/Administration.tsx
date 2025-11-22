import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import {
  Settings,
  Mail,
  MessageSquare,
  Save,
  TestTube,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
  Key,
} from 'lucide-react';
import { sanitizeInput } from '../lib/security';

export function Administration() {
  const [emailConfig, setEmailConfig] = useState({
    provider: 'smtp',
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    smtpEncryption: 'tls',
    fromEmail: '',
    fromName: '',
    apiKey: '',
    apiProvider: 'sendgrid',
    isEnabled: true,
  });

  const [smsConfig, setSmsConfig] = useState({
    provider: 'twilio',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    apiKey: '',
    apiSecret: '',
    senderId: '',
    isEnabled: false,
  });

  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showSmsToken, setShowSmsToken] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: 'email' | 'sms' | null;
    status: 'success' | 'error' | null;
    message: string;
  }>({ type: null, status: null, message: '' });

  const handleSaveEmailConfig = () => {
    // Sanitize inputs
    const sanitized = {
      ...emailConfig,
      smtpHost: sanitizeInput(emailConfig.smtpHost),
      smtpUsername: sanitizeInput(emailConfig.smtpUsername),
      fromEmail: sanitizeInput(emailConfig.fromEmail),
      fromName: sanitizeInput(emailConfig.fromName),
    };

    // In production, send to backend API with encryption
    console.log('Saving email configuration (sanitized):', {
      ...sanitized,
      smtpPassword: '***REDACTED***',
      apiKey: '***REDACTED***',
    });

    alert('Email configuration saved successfully!');
  };

  const handleSaveSmsConfig = () => {
    // Sanitize inputs
    const sanitized = {
      ...smsConfig,
      senderId: sanitizeInput(smsConfig.senderId),
      twilioPhoneNumber: sanitizeInput(smsConfig.twilioPhoneNumber),
    };

    // In production, send to backend API with encryption
    console.log('Saving SMS configuration (sanitized):', {
      ...sanitized,
      twilioAuthToken: '***REDACTED***',
      apiKey: '***REDACTED***',
      apiSecret: '***REDACTED***',
    });

    alert('SMS configuration saved successfully!');
  };

  const handleTestEmail = async () => {
    setTestStatus({ type: 'email', status: null, message: 'Sending test email...' });
    
    // Simulate API call
    setTimeout(() => {
      setTestStatus({
        type: 'email',
        status: 'success',
        message: 'Test email sent successfully! Check your inbox.',
      });
    }, 2000);
  };

  const handleTestSms = async () => {
    setTestStatus({ type: 'sms', status: null, message: 'Sending test SMS...' });
    
    // Simulate API call
    setTimeout(() => {
      setTestStatus({
        type: 'sms',
        status: 'success',
        message: 'Test SMS sent successfully!',
      });
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6" aria-hidden="true" />
              Administration
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure Email and SMS API settings for notifications
            </p>
          </div>
          <Badge className="bg-yellow-100 text-yellow-800">
            <Shield className="w-3 h-3 mr-1" aria-hidden="true" />
            Admin Only
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Security Notice */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm text-blue-900">
                  <strong>Security Notice:</strong> All API credentials are encrypted 
                  before being stored in the database. Never share these credentials 
                  or commit them to version control.
                </p>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">
                <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                Email Configuration
              </TabsTrigger>
              <TabsTrigger value="sms">
                <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
                SMS Configuration
              </TabsTrigger>
            </TabsList>

            {/* Email Configuration Tab */}
            <TabsContent value="email" className="space-y-6 mt-6">
              {/* Enable/Disable */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mb-1">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable email notifications system-wide
                    </p>
                  </div>
                  <Switch
                    checked={emailConfig.isEnabled}
                    onCheckedChange={(checked) =>
                      setEmailConfig({ ...emailConfig, isEnabled: checked })
                    }
                    aria-label="Enable email notifications"
                  />
                </div>
              </Card>

              {/* Provider Selection */}
              <Card className="p-6">
                <h3 className="mb-4">Email Provider</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-provider">
                      Select Provider <span className="text-red-600" aria-label="required">*</span>
                    </Label>
                    <select
                      id="email-provider"
                      className="w-full border rounded-md px-3 py-2"
                      value={emailConfig.provider}
                      onChange={(e) =>
                        setEmailConfig({ ...emailConfig, provider: e.target.value })
                      }
                      aria-required="true"
                    >
                      <option value="smtp">SMTP Server</option>
                      <option value="sendgrid">SendGrid API</option>
                      <option value="mailgun">Mailgun API</option>
                      <option value="ses">AWS SES</option>
                    </select>
                  </div>

                  {emailConfig.provider === 'smtp' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="smtp-host">
                            SMTP Host <span className="text-red-600" aria-label="required">*</span>
                          </Label>
                          <Input
                            id="smtp-host"
                            placeholder="smtp.gmail.com"
                            value={emailConfig.smtpHost}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, smtpHost: e.target.value })
                            }
                            aria-required="true"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="smtp-port">
                            SMTP Port <span className="text-red-600" aria-label="required">*</span>
                          </Label>
                          <Input
                            id="smtp-port"
                            type="number"
                            placeholder="587"
                            value={emailConfig.smtpPort}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, smtpPort: e.target.value })
                            }
                            aria-required="true"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-username">
                          SMTP Username <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <Input
                          id="smtp-username"
                          type="email"
                          placeholder="your-email@gmail.com"
                          value={emailConfig.smtpUsername}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, smtpUsername: e.target.value })
                          }
                          autoComplete="username"
                          aria-required="true"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-password">
                          SMTP Password <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="smtp-password"
                            type={showEmailPassword ? 'text' : 'password'}
                            placeholder="Enter SMTP password or app password"
                            value={emailConfig.smtpPassword}
                            onChange={(e) =>
                              setEmailConfig({ ...emailConfig, smtpPassword: e.target.value })
                            }
                            autoComplete="current-password"
                            aria-required="true"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEmailPassword(!showEmailPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            aria-label={showEmailPassword ? 'Hide password' : 'Show password'}
                          >
                            {showEmailPassword ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtp-encryption">Encryption Method</Label>
                        <select
                          id="smtp-encryption"
                          className="w-full border rounded-md px-3 py-2"
                          value={emailConfig.smtpEncryption}
                          onChange={(e) =>
                            setEmailConfig({ ...emailConfig, smtpEncryption: e.target.value })
                          }
                        >
                          <option value="tls">TLS</option>
                          <option value="ssl">SSL</option>
                          <option value="none">None (Not Recommended)</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="api-key" className="flex items-center gap-2">
                        <Key className="w-4 h-4" aria-hidden="true" />
                        API Key <span className="text-red-600" aria-label="required">*</span>
                      </Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder={`Enter your ${emailConfig.provider} API key`}
                        value={emailConfig.apiKey}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, apiKey: e.target.value })
                        }
                        aria-required="true"
                      />
                      <p className="text-xs text-muted-foreground">
                        Get your API key from your {emailConfig.provider} dashboard
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="from-email">
                        From Email Address <span className="text-red-600" aria-label="required">*</span>
                      </Label>
                      <Input
                        id="from-email"
                        type="email"
                        placeholder="noreply@yourcompany.com"
                        value={emailConfig.fromEmail}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, fromEmail: e.target.value })
                        }
                        aria-required="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from-name">From Name</Label>
                      <Input
                        id="from-name"
                        placeholder="TenderTrack Pro"
                        value={emailConfig.fromName}
                        onChange={(e) =>
                          setEmailConfig({ ...emailConfig, fromName: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Test & Save */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEmailConfig}>
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Save Configuration
                    </Button>
                    <Button variant="outline" onClick={handleTestEmail}>
                      <TestTube className="w-4 h-4 mr-2" aria-hidden="true" />
                      Send Test Email
                    </Button>
                  </div>
                </div>
                {testStatus.type === 'email' && testStatus.message && (
                  <div 
                    className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                      testStatus.status === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-blue-50 border border-blue-200'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {testStatus.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    )}
                    <p className={`text-sm ${
                      testStatus.status === 'success' ? 'text-green-800' : 'text-blue-800'
                    }`}>
                      {testStatus.message}
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* SMS Configuration Tab */}
            <TabsContent value="sms" className="space-y-6 mt-6">
              {/* Enable/Disable */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mb-1">SMS Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable SMS notifications system-wide
                    </p>
                  </div>
                  <Switch
                    checked={smsConfig.isEnabled}
                    onCheckedChange={(checked) =>
                      setSmsConfig({ ...smsConfig, isEnabled: checked })
                    }
                    aria-label="Enable SMS notifications"
                  />
                </div>
              </Card>

              {/* Provider Selection */}
              <Card className="p-6">
                <h3 className="mb-4">SMS Provider</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-provider">
                      Select Provider <span className="text-red-600" aria-label="required">*</span>
                    </Label>
                    <select
                      id="sms-provider"
                      className="w-full border rounded-md px-3 py-2"
                      value={smsConfig.provider}
                      onChange={(e) =>
                        setSmsConfig({ ...smsConfig, provider: e.target.value })
                      }
                      aria-required="true"
                    >
                      <option value="twilio">Twilio</option>
                      <option value="nexmo">Vonage (Nexmo)</option>
                      <option value="aws-sns">AWS SNS</option>
                      <option value="msg91">MSG91</option>
                    </select>
                  </div>

                  {smsConfig.provider === 'twilio' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="twilio-sid">
                          Account SID <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <Input
                          id="twilio-sid"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={smsConfig.twilioAccountSid}
                          onChange={(e) =>
                            setSmsConfig({ ...smsConfig, twilioAccountSid: e.target.value })
                          }
                          aria-required="true"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twilio-token">
                          Auth Token <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <div className="relative">
                          <Input
                            id="twilio-token"
                            type={showSmsToken ? 'text' : 'password'}
                            placeholder="Enter Twilio Auth Token"
                            value={smsConfig.twilioAuthToken}
                            onChange={(e) =>
                              setSmsConfig({ ...smsConfig, twilioAuthToken: e.target.value })
                            }
                            aria-required="true"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSmsToken(!showSmsToken)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            aria-label={showSmsToken ? 'Hide token' : 'Show token'}
                          >
                            {showSmsToken ? (
                              <EyeOff className="w-4 h-4" aria-hidden="true" />
                            ) : (
                              <Eye className="w-4 h-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twilio-phone">
                          Twilio Phone Number <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <Input
                          id="twilio-phone"
                          type="tel"
                          placeholder="+1234567890"
                          value={smsConfig.twilioPhoneNumber}
                          onChange={(e) =>
                            setSmsConfig({ ...smsConfig, twilioPhoneNumber: e.target.value })
                          }
                          aria-required="true"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="sms-api-key">
                          API Key <span className="text-red-600" aria-label="required">*</span>
                        </Label>
                        <Input
                          id="sms-api-key"
                          type="password"
                          placeholder={`Enter your ${smsConfig.provider} API key`}
                          value={smsConfig.apiKey}
                          onChange={(e) =>
                            setSmsConfig({ ...smsConfig, apiKey: e.target.value })
                          }
                          aria-required="true"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sms-api-secret">API Secret</Label>
                        <Input
                          id="sms-api-secret"
                          type="password"
                          placeholder="Enter API secret (if required)"
                          value={smsConfig.apiSecret}
                          onChange={(e) =>
                            setSmsConfig({ ...smsConfig, apiSecret: e.target.value })
                          }
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="sender-id">Sender ID / From Number</Label>
                    <Input
                      id="sender-id"
                      placeholder="TENDERTRACK or +1234567890"
                      value={smsConfig.senderId}
                      onChange={(e) =>
                        setSmsConfig({ ...smsConfig, senderId: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Alphanumeric sender ID or verified phone number
                    </p>
                  </div>
                </div>
              </Card>

              {/* Test & Save */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button onClick={handleSaveSmsConfig}>
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Save Configuration
                    </Button>
                    <Button variant="outline" onClick={handleTestSms}>
                      <TestTube className="w-4 h-4 mr-2" aria-hidden="true" />
                      Send Test SMS
                    </Button>
                  </div>
                </div>
                {testStatus.type === 'sms' && testStatus.message && (
                  <div 
                    className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
                      testStatus.status === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-blue-50 border border-blue-200'
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {testStatus.status === 'success' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-blue-600" aria-hidden="true" />
                    )}
                    <p className={`text-sm ${
                      testStatus.status === 'success' ? 'text-green-800' : 'text-blue-800'
                    }`}>
                      {testStatus.message}
                    </p>
                  </div>
                )}
              </Card>

              {/* SMS Best Practices */}
              <Card className="p-6 bg-amber-50 border-amber-200">
                <h4 className="mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" aria-hidden="true" />
                  SMS Best Practices
                </h4>
                <ul className="text-sm text-amber-900 space-y-1 list-disc list-inside">
                  <li>Only send SMS for critical notifications</li>
                  <li>Obtain user consent before sending SMS</li>
                  <li>Include opt-out instructions in messages</li>
                  <li>Monitor delivery rates and costs</li>
                  <li>Comply with local telecommunications regulations</li>
                </ul>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
